import { env } from '$env/dynamic/private';
import { decodeStopPayload, type StopResult } from './decode';

export type { StopResult };

// hewliyang's deployment re-serves the resolved NUS shuttle data. We read its
// SvelteKit page-data endpoint and decode it ourselves (no NUS credentials,
// and no CORS — these calls must run server-side).
const BASE = (env.HEWLIYANG_BASE ?? 'https://bus.hewliyang.com').replace(/\/$/, '');

// Politeness + latency cache: it's a personal, unfunded server, and its own
// response takes ~1-3s to resolve. We cache with a stale-while-revalidate
// policy. See handoff.md (etiquette).
//   • < FRESH_MS  → serve cached, no upstream call.
//   • < STALE_MS  → serve cached *immediately*, refresh in the background. This
//                   is the key latency win: a poll tick or warm navigation that
//                   lands just after expiry no longer blocks 1-3s on upstream.
//   • otherwise   → cold/too-stale, await a fresh fetch.
// `inflight` coalesces concurrent callers (multiple viewers, an SSR load + its
// first poll) onto one upstream request, so SWR never increases upstream load
// beyond one fetch per expiry.
const FRESH_MS = 8_000;
const STALE_MS = 60_000;
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

function revalidate(code: string, fetchFn: typeof fetch): Promise<StopResult> {
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

export async function fetchStopTimings(
	code: string,
	fetchFn: typeof fetch = fetch
): Promise<StopResult> {
	const hit = cache.get(code);
	const age = hit ? Date.now() - hit.at : Infinity;

	if (hit && age < FRESH_MS) return hit.value;

	if (hit && age < STALE_MS) {
		// Serve stale now; refresh for the next caller. Swallow background errors
		// so a transient upstream blip doesn't surface as an unhandled rejection —
		// we simply keep serving the last good value until it ages past STALE_MS.
		void revalidate(code, fetchFn).catch(() => {});
		return hit.value;
	}

	return revalidate(code, fetchFn);
}
