import { stops } from '$lib/data';
import { getDistance } from '$lib/stores/utils';
import type { SearchStop } from '$lib/types';

export type NearbyStop = SearchStop & { distanceM: number };

/**
 * Stops ranked by distance from a given coordinate (nearest first).
 * Pure + synchronous — `stops` is static JSON, so this runs client-side
 * off the user's GPS fix without any network call.
 */
export function nearestStops(lat: number, lng: number, n?: number): NearbyStop[] {
	const ranked = stops
		.map((s) => ({ ...s, distanceM: getDistance(s.latitude, s.longitude, lat, lng) }))
		.sort((a, b) => a.distanceM - b.distanceM);
	return typeof n === 'number' ? ranked.slice(0, n) : ranked;
}

/** Human label for a walking distance, e.g. "120 m" or "1.3 km". */
export function formatDistance(m: number): string {
	if (m < 1000) return `${Math.round(m / 10) * 10} m`;
	return `${(m / 1000).toFixed(1)} km`;
}
