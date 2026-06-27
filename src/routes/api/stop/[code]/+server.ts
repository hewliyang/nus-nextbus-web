import { error, json } from '@sveltejs/kit';
import { fetchStopTimings } from '$lib/server/hewliyang';
import type { RequestHandler } from './$types';

// Same-origin polling endpoint for live countdown refresh (avoids hewliyang's
// missing CORS header). The client polls this every ~15-30s.
export const GET: RequestHandler = async ({ params, fetch, setHeaders }) => {
	try {
		const data = await fetchStopTimings(params.code, fetch);
		setHeaders({ 'cache-control': 'public, max-age=8' });
		return json(data);
	} catch (e) {
		console.error('api/stop error:', e);
		throw error(502, 'Shuttle service unavailable');
	}
};
