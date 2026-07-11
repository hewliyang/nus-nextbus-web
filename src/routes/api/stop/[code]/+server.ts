import { error, json } from '@sveltejs/kit';
import { fetchStopTimings } from '$lib/server/stop-timings';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		return json(await fetchStopTimings(params.code));
	} catch (e) {
		console.error('api/stop error:', e);
		throw error(502, 'Shuttle service unavailable');
	}
};
