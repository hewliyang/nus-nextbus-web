import { env } from '$env/dynamic/private';
import type {
	AccessTokenData,
	FmsJson,
	InitDataPayload,
	UnivusResponse
} from '$lib/server/fms-types';

type NextbusConfig = {
	authBase: string;
	fmsBase: string;
	appVersion: string;
	keyHeaders: Record<string, string>;
	serviceId: string;
	tenantCode: string;
	fmsHeaders: Record<string, string>;
};

let _config: NextbusConfig | null = null;

function config(): NextbusConfig {
	if (_config) return _config;
	const required = (name: string): string => {
		const value = env[name];
		if (!value) throw new Error(`Missing required env var ${name} (see .env.example)`);
		return value;
	};
	_config = {
		authBase: required('NEXTBUS_AUTH_BASE'),
		fmsBase: required('NEXTBUS_FMS_BASE'),
		appVersion: required('NEXTBUS_APP_VERSION'),
		keyHeaders: {
			'X-HTD-API': required('NEXTBUS_HTD_API'),
			'X-APP-API': required('NEXTBUS_APP_API'),
			'Content-Type': 'application/json'
		},
		serviceId: required('NEXTBUS_FMS_SERVICE_ID'),
		tenantCode: required('NEXTBUS_FMS_TENANT_CODE'),
		fmsHeaders: {
			accept: 'application/json',
			...(env.NEXTBUS_REQUESTED_BY ? { 'x-requested-by': env.NEXTBUS_REQUESTED_BY } : {}),
			...(env.NEXTBUS_SECURED_REQUEST ? { 'x-secured-request': env.NEXTBUS_SECURED_REQUEST } : {})
		}
	};
	return _config;
}

const DEVICE_ID = (globalThis.crypto?.randomUUID?.() ?? '00000000-0000-4000-8000-000000000000').toUpperCase();

export type RouteColor = { BUS: string; COLOR_CODE: string; COLOR_FONT: string };

type Session = { token: string; colors: RouteColor[]; expires: number };
let session: Session | null = null;
let inflight: Promise<Session> | null = null;

function isUnivusOk<T>(body: unknown): body is UnivusResponse<T> {
	return typeof body === 'object' && body !== null && (body as UnivusResponse<T>).code === '00000';
}

async function authenticate(): Promise<Session> {
	const cfg = config();
	const accessRes = await fetch(`${cfg.authBase}/univus-public/mobile/get-access-token`, {
		method: 'POST',
		headers: cfg.keyHeaders,
		body: JSON.stringify({ deviceid: DEVICE_ID, ipaddr: '0.0.0.0', version: cfg.appVersion })
	});
	const access: unknown = await accessRes.json();
	if (!isUnivusOk<AccessTokenData>(access)) {
		const code = typeof access === 'object' && access !== null ? (access as UnivusResponse<unknown>).code : undefined;
		const msg = typeof access === 'object' && access !== null ? (access as UnivusResponse<unknown>).msg : undefined;
		throw new Error(`get-access-token failed: ${code} ${msg}`);
	}

	const { token, userid, domain } = access.data;
	const initRes = await fetch(`${cfg.authBase}/univus/mobile/buswidget/get-init-data`, {
		method: 'POST',
		headers: cfg.keyHeaders,
		body: JSON.stringify({ deviceid: DEVICE_ID, domain, ipaddr: '0.0.0.0', token, userid, version: cfg.appVersion })
	});
	const init: unknown = await initRes.json();
	if (!isUnivusOk<InitDataPayload>(init)) {
		const code = typeof init === 'object' && init !== null ? (init as UnivusResponse<unknown>).code : undefined;
		const msg = typeof init === 'object' && init !== null ? (init as UnivusResponse<unknown>).msg : undefined;
		throw new Error(`get-init-data failed: ${code} ${msg}`);
	}

	const fmsToken = init.data?.tokens?.nextbus_token2;
	if (!fmsToken) throw new Error('No nextbus_token2 in init-data');

	return {
		token: fmsToken,
		colors: init.data['bus-stop-color'] ?? [],
		expires: Date.now() + 1000 * 60 * 60 * 12
	};
}

async function getSession(force = false): Promise<Session> {
	if (!force && session && Date.now() < session.expires) return session;
	if (!inflight) {
		inflight = authenticate()
			.then((s) => (session = s))
			.finally(() => (inflight = null));
	}
	return inflight;
}

function isFmsAuthError(body: unknown): body is { result: false; error: number } {
	return (
		typeof body === 'object' &&
		body !== null &&
		(body as { result?: boolean }).result === false &&
		[1, 2, 3].includes((body as { error?: number }).error ?? -1)
	);
}

export async function fmsFetch<T extends FmsJson = FmsJson>(
	endpoint: string,
	params: Record<string, string> = {}
): Promise<T> {
	const cfg = config();
	const run = async (s: Session): Promise<unknown> => {
		const url = new URL(`${cfg.fmsBase}/${endpoint.replace(/^\//, '')}`);
		url.searchParams.set('ServiceID', cfg.serviceId);
		url.searchParams.set('TenantCode', cfg.tenantCode);
		for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
		url.searchParams.set('token', s.token);
		const res = await fetch(url, { headers: cfg.fmsHeaders });
		const text = await res.text();
		try {
			return JSON.parse(text) as unknown;
		} catch {
			throw new Error(`${endpoint}: non-JSON response (${res.status}): ${text.slice(0, 80)}`);
		}
	};

	let s = await getSession();
	let body = await run(s);
	if (isFmsAuthError(body)) {
		s = await getSession(true);
		body = await run(s);
	}
	return body as T;
}

export async function getRouteColors(): Promise<RouteColor[]> {
	return (await getSession()).colors;
}
