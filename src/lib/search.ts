import { stops } from '$lib/data';
import { routeKeysSorted, routeStops } from '$lib/routes';
import type { Bookmark, SearchStop } from '$lib/types';

const normalize = (value: string) => value.trim().toLowerCase();

const stopTerms = new Map(
	stops.map((stop) => [
		stop.name,
		normalize(`${stop.caption} ${stop.name} ${stop.ShortName} ${stop.LongName}`)
	])
);

export function searchStops(query: string): SearchStop[] {
	const term = normalize(query);
	if (!term) return [];
	return stops.filter((stop) => stopTerms.get(stop.name)?.includes(term));
}

export function searchBookmarks(bookmarks: Bookmark[], query: string): Bookmark[] {
	const term = normalize(query);
	if (!term) return bookmarks;
	return bookmarks.filter((bookmark) => stopTerms.get(bookmark.name)?.includes(term));
}

export function searchRoutes(query: string): string[] {
	const term = normalize(query);
	if (!term) return routeKeysSorted;
	return routeKeysSorted.filter(
		(route) =>
			route.toLowerCase().includes(term) ||
			routeStops(route).some((stop) =>
				(stopTerms.get(stop.code) ?? normalize(`${stop.name} ${stop.code}`)).includes(term)
			)
	);
}
