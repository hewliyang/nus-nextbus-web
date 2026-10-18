import { error, json } from '@sveltejs/kit';
import { stops } from '$lib/data';
import { fetchStopTimings } from '$lib/server/stop-timings';
import type { RequestHandler } from './$types';

const validStops = new Set(stops.map((stop) => stop.name));

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 60;
const SCRAPER_UA_RE =
	/^(node|python-httpx|python-requests|curl|Go-http-client|undici|axios|Wget|Scrapy)/i;

type RateBucket = { count: number; resetAt: number };
const ipBuckets = new Map<string, RateBucket>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
	const now = Date.now();
	if (ipBuckets.size > 2_000) {
		for (const [key, bucket] of ipBuckets) {
			if (now >= bucket.resetAt) ipBuckets.delete(key);
		}
	}

	const existing = ipBuckets.get(ip);
	if (!existing || now >= existing.resetAt) {
		ipBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
		return { allowed: true, retryAfterSec: 0 };
	}

	existing.count += 1;
	if (existing.count > RATE_MAX_REQUESTS) {
		return {
			allowed: false,
			retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
		};
	}

	return { allowed: true, retryAfterSec: 0 };
}

export const GET: RequestHandler = async ({ params, request, getClientAddress, setHeaders }) => {
	const ua = request.headers.get('user-agent')?.trim() ?? '';
	if (!ua || SCRAPER_UA_RE.test(ua)) {
		throw error(403, 'Forbidden');
	}

	const clientIp =
		request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		getClientAddress();

	const limit = checkRateLimit(clientIp);
	if (!limit.allowed) {
		setHeaders({
			'retry-after': String(limit.retryAfterSec),
			'cache-control': 'private, no-store'
		});
		throw error(429, 'Too many requests');
	}

	if (!validStops.has(params.code)) {
		setHeaders({
			'cache-control': 'public, max-age=300',
			'vercel-cdn-cache-control': 'public, s-maxage=3600'
		});
		throw error(404, 'Unknown stop');
	}

	try {
		const data = await fetchStopTimings(params.code);
		setHeaders({
			'cache-control': 'public, max-age=10, stale-while-revalidate=10',
			'vercel-cdn-cache-control': 'public, s-maxage=20, stale-while-revalidate=40'
		});
		return json(data);
	} catch (e) {
		console.error('api/stop error:', e);
		throw error(502, 'Shuttle service unavailable');
	}
};
