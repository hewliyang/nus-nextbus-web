import { error, json } from '@sveltejs/kit';
import { stops } from '$lib/data';
import { fetchStopTimings } from '$lib/server/stop-timings';
import type { RequestHandler } from './$types';

const validStops = new Set(stops.map((stop) => stop.name));

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	if (!validStops.has(params.code)) throw error(404, 'Unknown stop');

	try {
		const data = await fetchStopTimings(params.code);
		setHeaders({
			'cache-control': 'public, max-age=0, must-revalidate',
			'vercel-cdn-cache-control': 'public, s-maxage=15, stale-while-revalidate=45'
		});
		return json(data);
	} catch (e) {
		console.error('api/stop error:', e);
		throw error(502, 'Shuttle service unavailable');
	}
};
