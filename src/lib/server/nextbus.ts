import { env } from '$env/dynamic/private';
import { kv } from '$lib/server/kv';
import type { UnivusResponse } from '$lib/server/fms-types';

const TOKEN_KEY = 'nextbus:esb-token';
const USER_KEY = 'nextbus:esb-userid';
const VERSION_KEY = 'nextbus:app-version';
const REFRESH_SKEW_MS = 1000 * 60 * 60 * 6;
const UPSTREAM_TIMEOUT_MS = 5_000;
const PLAY_PACKAGE = 'sg.edu.nus.univus';
const VERSION_PREFIX = 'univus_android_';

type NextbusConfig = {
	base: string;
	apiKey: string;
	/** Normalized ESB version, e.g. `univus_android_2.60.8_147`. */
	appVersion: string;
	userId: string;
	deviceId: string;
	domain: string;
	seedToken: string;
	userAgent: string;
	ipAddr: string;
};

let _config: NextbusConfig | null = null;

function required(name: string): string {
	const value = env[name];
	if (!value) throw new Error(`Missing required env var ${name} (see .env.example)`);
	return value;
}

/** uNivUS ESB expects `univus_android_{versionName}_{versionCode}` (build suffix required). */
export function normalizeAppVersion(raw: string, build = ''): string {
	const trimmed = raw.trim();
	if (!trimmed) return trimmed;

	const withoutPrefix = trimmed.startsWith(VERSION_PREFIX)
		? trimmed.slice(VERSION_PREFIX.length)
		: trimmed.replace(/^v/i, '');

	// Already name_code.
	const full = withoutPrefix.match(/^(\d+\.\d+\.\d+)_(\d+)$/);
	if (full) return `${VERSION_PREFIX}${full[1]}_${full[2]}`;

	const name = withoutPrefix.match(/^(\d+\.\d+\.\d+)$/)?.[1] ?? withoutPrefix;
	// Upstream rejects bare `univus_android_{name}` and low versionCodes (<144 as of
	// 2.60.8). When the build is unknown, use a high sentinel that the ESB accepts.
	const buildPart = build.trim() || '999';
	return `${VERSION_PREFIX}${name}_${buildPart}`;
}

function config(): NextbusConfig {
	if (_config) return _config;
	_config = {
		base: required('NEXTBUS_BASE').replace(/\/$/, ''),
		apiKey: required('NEXTBUS_API_KEY'),
		appVersion: normalizeAppVersion(required('NEXTBUS_APP_VERSION'), env.NEXTBUS_APP_BUILD || ''),
		userId: env.NEXTBUS_USER_ID || '',
		deviceId: required('NEXTBUS_DEVICE_ID'),
		domain: env.NEXTBUS_DOMAIN || 'PUBLIC',
		seedToken: env.NEXTBUS_ESB_TOKEN || '',
		userAgent: required('NEXTBUS_USER_AGENT'),
		ipAddr: required('NEXTBUS_IP_ADDR')
	};
	return _config;
}

type Session = { token: string; userId: string };
let session: Session | null = null;
let inflight: Promise<Session> | null = null;
let versionInflight: Promise<string> | null = null;

function jwtExpMs(token: string): number {
	const part = token.split('.')[1];
	if (!part) return 0;
	const padded = part.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (part.length % 4)) % 4);
	const json = decodeURIComponent(
		Array.from(atob(padded), (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
	);
	const payload = JSON.parse(json) as { exp?: number };
	return (payload.exp ?? 0) * 1000;
}

function isFresh(token: string): boolean {
	return jwtExpMs(token) - Date.now() > REFRESH_SKEW_MS;
}

function isUnivusOk<T>(body: unknown): body is UnivusResponse<T> {
	return typeof body === 'object' && body !== null && (body as UnivusResponse<T>).code === '00000';
}

function univusCode(body: unknown): string | undefined {
	return typeof body === 'object' && body !== null ? (body as UnivusResponse<unknown>).code : undefined;
}

function univusMsg(body: unknown): string | undefined {
	return typeof body === 'object' && body !== null ? (body as UnivusResponse<unknown>).msg : undefined;
}

function isStaleVersion(body: unknown): boolean {
	return univusCode(body) === '10009';
}

function authHeaders(token?: string): HeadersInit {
	const cfg = config();
	const headers: Record<string, string> = {
		'x-api-key': cfg.apiKey,
		'Content-Type': 'application/json; charset=utf-8',
		'User-Agent': cfg.userAgent
	};
	if (token) headers.Authorization = `Bearer ${token}`;
	return headers;
}

function esbBody(token: string, userId: string, extra: Record<string, string> = {}) {
	const cfg = config();
	return {
		token,
		userid: userId,
		domain: cfg.domain,
		deviceid: cfg.deviceId,
		ipaddr: cfg.ipAddr,
		version: cfg.appVersion,
		...extra
	};
}

async function loadStoredToken(): Promise<string> {
	const store = kv();
	if (store) {
		const stored = await store.get<string>(TOKEN_KEY);
		if (typeof stored === 'string' && stored) return stored;
	}
	return config().seedToken;
}

async function loadStoredUserId(): Promise<string> {
	const store = kv();
	if (store) {
		const stored = await store.get<string>(USER_KEY);
		if (typeof stored === 'string' && stored) return stored;
	}
	return config().userId;
}

async function persistSession(token: string, userId: string): Promise<void> {
	const store = kv();
	if (!store) return;
	await store.set(TOKEN_KEY, token);
	if (userId) await store.set(USER_KEY, userId);
}

async function persistVersion(version: string): Promise<void> {
	const store = kv();
	if (store) await store.set(VERSION_KEY, version);
}

/** Scrape Play Store for the live uNivUS versionName. */
export async function fetchPlayStoreVersion(): Promise<string | null> {
	const res = await fetch(
		`https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}&hl=en&gl=SG`,
		{
			headers: { 'User-Agent': 'Mozilla/5.0' },
			signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
		}
	);
	if (!res.ok) return null;
	const html = await res.text();
	const match = html.match(/\[\[\["(\d+\.\d+\.\d+)"\]\]/);
	return match?.[1] ?? null;
}

async function bumpAppVersionFromPlay(): Promise<string> {
	if (!versionInflight) {
		versionInflight = (async () => {
			const store = kv();
			if (store) {
				const cached = await store.get<string>(VERSION_KEY);
				if (typeof cached === 'string' && cached.startsWith(VERSION_PREFIX)) {
					const cfg = config();
					cfg.appVersion = cached;
					return cached;
				}
			}

			const play = await fetchPlayStoreVersion();
			if (!play) throw new Error('could not resolve uNivUS version from Play Store');

			// Keep an existing build suffix when only the name moved; normalizeAppVersion
			// falls back to a high sentinel if none is known.
			const current = config().appVersion;
			const buildMatch = current.match(/_(\d+)$/);
			const next = normalizeAppVersion(play, buildMatch?.[1]);
			config().appVersion = next;
			await persistVersion(next);
			return next;
		})().finally(() => {
			versionInflight = null;
		});
	}
	return versionInflight;
}

async function mintToken(allowVersionBump = true): Promise<Session> {
	const cfg = config();
	const res = await fetch(`${cfg.base}/univus/api/univus-public/mobile/get-access-token`, {
		method: 'POST',
		headers: authHeaders(),
		body: JSON.stringify({
			deviceid: cfg.deviceId,
			ipaddr: cfg.ipAddr,
			version: cfg.appVersion
		}),
		signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
	});
	const json: unknown = await res.json();
	if (isStaleVersion(json) && allowVersionBump) {
		await bumpAppVersionFromPlay();
		return mintToken(false);
	}
	if (!isUnivusOk<{ token: string; userid?: string }>(json) || !json.data?.token) {
		throw new Error(`get-access-token failed: HTTP ${res.status} ${univusCode(json)} ${univusMsg(json)}`);
	}
	const userId = json.data.userid || cfg.userId;
	if (!userId) throw new Error('get-access-token returned no userid');
	cfg.userId = userId;
	await persistSession(json.data.token, userId);
	return { token: json.data.token, userId };
}

async function refreshToken(current: string, userId: string): Promise<Session> {
	const cfg = config();
	const res = await fetch(`${cfg.base}/univus/api/univus/refresh-token`, {
		method: 'POST',
		headers: authHeaders(current),
		body: JSON.stringify(esbBody(current, userId)),
		signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
	});
	const json: unknown = await res.json();
	if (isStaleVersion(json)) {
		await bumpAppVersionFromPlay();
		return mintToken();
	}
	if (!isUnivusOk<{ token: string; userid?: string }>(json) || !json.data?.token) {
		// Seed / stored JWT may be dead — fall back to a fresh public mint.
		return mintToken();
	}
	const nextUser = json.data.userid || userId || cfg.userId;
	cfg.userId = nextUser;
	await persistSession(json.data.token, nextUser);
	return { token: json.data.token, userId: nextUser };
}

async function resolveSession(force = false): Promise<Session> {
	const cfg = config();
	if (session && !force && isFresh(session.token)) return session;

	const store = kv();
	if (store) {
		const storedVersion = await store.get<string>(VERSION_KEY);
		if (typeof storedVersion === 'string' && storedVersion.startsWith(VERSION_PREFIX)) {
			cfg.appVersion = storedVersion;
		}
	}

	const token = session?.token ?? (await loadStoredToken());
	const userId = session?.userId ?? (await loadStoredUserId());

	if (!token) return mintToken();
	if (force || !isFresh(token)) return refreshToken(token, userId);
	return { token, userId: userId || cfg.userId };
}

async function getSession(force = false): Promise<Session> {
	if (!force && session && isFresh(session.token)) return session;
	if (!inflight) {
		inflight = resolveSession(force)
			.then((s) => (session = s))
			.finally(() => (inflight = null));
	}
	return inflight;
}

function failureDetail(endpoint: string, status: number, body: unknown): string {
	return `${endpoint} failed: HTTP ${status} ${univusCode(body)} ${univusMsg(body)}`;
}

/** POST /univus/api/bus-proxy/{endpoint} and return the unwrapped `data` payload. */
export async function busProxy<T>(endpoint: string, extra: Record<string, string> = {}): Promise<T> {
	const cfg = config();
	const run = async (s: Session): Promise<{ status: number; body: unknown }> => {
		const res = await fetch(`${cfg.base}/univus/api/bus-proxy/${endpoint.replace(/^\//, '')}`, {
			method: 'POST',
			headers: authHeaders(s.token),
			body: JSON.stringify(esbBody(s.token, s.userId, extra)),
			signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
		});
		const text = await res.text();
		try {
			return { status: res.status, body: JSON.parse(text) as unknown };
		} catch {
			throw new Error(`${endpoint}: non-JSON response (${res.status}): ${text.slice(0, 80)}`);
		}
	};

	let s = await getSession();
	let result = await run(s);
	if (isStaleVersion(result.body)) {
		await bumpAppVersionFromPlay();
		s = await getSession(true);
		result = await run(s);
	} else if (!isUnivusOk<T>(result.body)) {
		s = await getSession(true);
		result = await run(s);
	}
	if (!isUnivusOk<T>(result.body)) {
		throw new Error(failureDetail(endpoint, result.status, result.body));
	}
	return result.body.data;
}
