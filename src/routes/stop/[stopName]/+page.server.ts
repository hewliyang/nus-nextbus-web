import { fail, type Actions } from '@sveltejs/kit';
import { fetchStopTimings, type StopResult } from '$lib/server/stop-timings';
import { routesServingStop, stopCoord } from '$lib/routes';
import { parseBookmarks } from '$lib/parse';
import type { BusStopTiming, Bookmark } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const code = params.stopName;
	const caption = stopCoord(code)?.caption ?? code;
	const serving = routesServingStop(code);
	const timings: Promise<StopResult> = fetchStopTimings(code).catch((e) => {
		console.error('Failed to load shuttle timings:', e);
		const etas: BusStopTiming = {
			lastUpdated: new Date().toISOString(),
			busStopName: code,
			busStopCaption: caption,
			timings: serving.map((name) => ({ name, arrivalTime: '-', nextArrivalTime: '-' }))
		};
		return { etas, degraded: true as const };
	});
	return { code, caption, serving, timings };
};

export const actions: Actions = {
	addBookmark: async ({ url, cookies }) => {
		const id = url.searchParams.get('id');
		const caption = url.searchParams.get('caption');
		if (!id || !caption) return fail(400, { message: 'Invalid Request' });

		try {
			const bookmarksOld = parseBookmarks(cookies.get('bookmarks') || '[]');
			const bookmarksNew: Bookmark[] = [...bookmarksOld, { caption, name: id }];
			cookies.set('bookmarks', JSON.stringify(bookmarksNew), {
				path: '/',
				maxAge: 60 * 60 * 24 * 365
			});
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Something went wrong' });
		}
		return { status: 200 };
	}
};
