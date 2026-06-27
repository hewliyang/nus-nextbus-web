import { error, fail, type Actions } from '@sveltejs/kit';
import { fetchStopTimings } from '$lib/server/hewliyang';
import { routesServingStop, stopCoord } from '$lib/routes';
import { parseBookmarks } from '$lib/parse';
import type { BusStopTiming, Bookmark } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	try {
		// hewliyang already joins crowding/capacity into each timing upstream, so
		// this single call returns the fully-resolved { etas, degraded } payload.
		return await fetchStopTimings(params.stopName, fetch);
	} catch (e) {
		console.error('Failed to load shuttle timings:', e);

		const serving = routesServingStop(params.stopName);
		if (serving.length > 0) {
			const etas: BusStopTiming = {
				lastUpdated: new Date().toISOString(),
				busStopName: params.stopName,
				busStopCaption: stopCoord(params.stopName)?.caption ?? params.stopName,
				timings: serving.map((name) => ({ name, arrivalTime: '-', nextArrivalTime: '-' }))
			};
			return { etas, degraded: true as const };
		}

		throw error(502, "Couldn't reach the shuttle service. Try again in a moment.");
	}
};

export const actions: Actions = {
	addBookmark: async ({ url, cookies }) => {
		const id = url.searchParams.get('id');
		const caption = url.searchParams.get('caption');

		if (!id || !caption) {
			return fail(400, { message: 'Invalid Request' });
		}

		try {
			const bookmarksOld = parseBookmarks(cookies.get('bookmarks') || '[]');
			const bookmarksNew: Bookmark[] = [...bookmarksOld, { caption, name: id }];
			cookies.set('bookmarks', JSON.stringify(bookmarksNew), {
				path: '/',
				maxAge: 60 * 60 * 24 * 365
			});
		} catch (err) {
			console.error(err);
			return fail(500, {
				message: 'Something went wrong'
			});
		}

		return {
			status: 200
		};
	}
};
