import { env } from '$env/dynamic/private';
import { kv } from '$lib/server/kv';
import type { UnivusResponse } from '$lib/server/fms-types';

const TOKEN_KEY = 'nextbus:esb-token';
const REFRESH_SKEW_MS = 1000 * 60 * 60 * 6;

type NextbusConfig = {
	base: string;
	apiKey: string;
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

function config(): NextbusConfig {
	if (_config) return _config;
	_config = {
		base: required('NEXTBUS_BASE').replace(/\/$/, ''),
		apiKey: required('NEXTBUS_API_KEY'),
		appVersion: required('NEXTBUS_APP_VERSION'),
		userId: required('NEXTBUS_USER_ID'),
		deviceId: required('NEXTBUS_DEVICE_ID'),
		domain: env.NEXTBUS_DOMAIN || 'PUBLIC',
		seedToken: required('NEXTBUS_ESB_TOKEN'),
		userAgent: required('NEXTBUS_USER_AGENT'),
		ipAddr: required('NEXTBUS_IP_ADDR')
	};
	return _config;
}

type Session = { token: string };
let session: Session | null = null;
let inflight: Promise<Session> | null = null;

function jwtExpMs(token: string): number {
	const part = token.split('.')[1];
	if (!part) return 0;
	const padded = part + '='.repeat((4 - (part.length % 4)) % 4);
	const payload = JSON.parse(Buffer.from(padded, 'base64url').toString('utf8')) as { exp?: number };
	return (payload.exp ?? 0) * 1000;
}

function isFresh(token: string): boolean {
	return jwtExpMs(token) - Date.now() > REFRESH_SKEW_MS;
}

function isUnivusOk<T>(body: unknown): body is UnivusResponse<T> {
	return typeof body === 'object' && body !== null && (body as UnivusResponse<T>).code === '00000';
}

function authHeaders(token: string): HeadersInit {
	const cfg = config();
	return {
		'x-api-key': cfg.apiKey,
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json; charset=utf-8',
		'User-Agent': cfg.userAgent
	};
}

function esbBody(token: string, extra: Record<string, string> = {}) {
	const cfg = config();
	return {
		token,
		userid: cfg.userId,
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

async function persistToken(token: string): Promise<void> {
	const store = kv();
	if (store) await store.set(TOKEN_KEY, token);
}

async function refreshToken(current: string): Promise<string> {
	const cfg = config();
	const res = await fetch(`${cfg.base}/univus/api/univus/refresh-token`, {
		method: 'POST',
		headers: authHeaders(current),
		body: JSON.stringify(esbBody(current))
	});
	const json: unknown = await res.json();
	if (!isUnivusOk<{ token: string }>(json) || !json.data?.token) {
		const code = typeof json === 'object' && json !== null ? (json as UnivusResponse<unknown>).code : undefined;
		const msg = typeof json === 'object' && json !== null ? (json as UnivusResponse<unknown>).msg : undefined;
		throw new Error(`refresh-token failed: HTTP ${res.status} ${code} ${msg}`);
	}
	await persistToken(json.data.token);
	return json.data.token;
}

async function resolveSession(force = false): Promise<Session> {
	let token = session?.token ?? (await loadStoredToken());
	if (force || !isFresh(token)) token = await refreshToken(token);
	return { token };
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
	const code = typeof body === 'object' && body !== null ? (body as UnivusResponse<unknown>).code : undefined;
	const msg = typeof body === 'object' && body !== null ? (body as UnivusResponse<unknown>).msg : undefined;
	return `${endpoint} failed: HTTP ${status} ${code} ${msg}`;
}

/** POST /univus/api/bus-proxy/{endpoint} and return the unwrapped `data` payload. */
export async function busProxy<T>(endpoint: string, extra: Record<string, string> = {}): Promise<T> {
	const cfg = config();
	const run = async (token: string): Promise<{ status: number; body: unknown }> => {
		const res = await fetch(`${cfg.base}/univus/api/bus-proxy/${endpoint.replace(/^\//, '')}`, {
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(esbBody(token, extra))
		});
		const text = await res.text();
		try {
			return { status: res.status, body: JSON.parse(text) as unknown };
		} catch {
			throw new Error(`${endpoint}: non-JSON response (${res.status}): ${text.slice(0, 80)}`);
		}
	};

	let s = await getSession();
	let result = await run(s.token);
	if (!isUnivusOk<T>(result.body)) {
		s = await getSession(true);
		result = await run(s.token);
	}
	if (!isUnivusOk<T>(result.body)) {
		throw new Error(failureDetail(endpoint, result.status, result.body));
	}
	return result.body.data;
}
