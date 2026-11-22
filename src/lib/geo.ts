import { stops } from '$lib/data';
import type { SearchStop } from '$lib/types';

type NearbyStop = SearchStop & { distanceM: number };

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371e3;
	const φ1 = (lat1 * Math.PI) / 180;
	const φ2 = (lat2 * Math.PI) / 180;
	const Δφ = ((lat2 - lat1) * Math.PI) / 180;
	const Δλ = ((lon2 - lon1) * Math.PI) / 180;

	const a =
		Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
		Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return R * c;
}

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
