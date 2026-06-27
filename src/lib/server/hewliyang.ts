import { env } from '$env/dynamic/private';
import { decodeStopPayload, type StopResult } from './decode';

export type { StopResult };

// hewliyang's deployment re-serves the resolved NUS shuttle data. We read its
// SvelteKit page-data endpoint and decode it ourselves (no NUS credentials,
// and no CORS — these calls must run server-side).
const BASE = (env.HEWLIYANG_BASE ?? 'https://bus.hewliyang.com').replace(/\/$/, '');

// Politeness cache: it's a personal, unfunded server. Coalesce repeated reads of
// the same stop within a short window so multiple viewers / poll ticks don't
// hammer it. See handoff.md (etiquette).
const TTL_MS = 8_000;
type Entry = { at: number; value: StopResult };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<StopResult>>();

async function fetchFresh(code: string, fetchFn: typeof fetch): Promise<StopResult> {
	// `x-sveltekit-invalidated=001` forces the page node to re-run server-side so
	// we get fresh timings rather than a `{ type: 'skip' }` placeholder.
	const url = `${BASE}/stop/${encodeURIComponent(code)}/__data.json?x-sveltekit-invalidated=001`;
	const res = await fetchFn(url, { headers: { accept: 'application/json' } });
	if (!res.ok) throw new Error(`hewliyang ${code}: HTTP ${res.status}`);
	return decodeStopPayload(await res.json());
}

export async function fetchStopTimings(
	code: string,
	fetchFn: typeof fetch = fetch
): Promise<StopResult> {
	const hit = cache.get(code);
	if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

	let pending = inflight.get(code);
	if (!pending) {
		pending = fetchFresh(code, fetchFn)
			.then((value) => {
				cache.set(code, { at: Date.now(), value });
				return value;
			})
			.finally(() => inflight.delete(code));
		inflight.set(code, pending);
	}
	return pending;
}
