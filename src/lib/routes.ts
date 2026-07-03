import { stops, routes } from '$lib/data';
import routeShapesJson from '$lib/data/routeShapes.json';
import { smoothLine } from '$lib/smooth';
import type { RouteStop } from '$lib/types';

// Road-following polylines, snapped to the road network offline by
// scripts/fetch_route_shapes.py (re-run it when routes/stops change).
const routeShapes = routeShapesJson as unknown as Record<string, [number, number][]>;

const ROUTE_COLORS: Record<string, { bg: string; fg: string }> = {
	A1: { bg: '#FB0101', fg: '#FFFFFF' },
	A2: { bg: '#E3CF0E', fg: '#000000' },
	D1: { bg: '#C77DE0', fg: '#FFFFFF' },
	D2: { bg: '#6E1D72', fg: '#FFFFFF' },
	K: { bg: '#33599C', fg: '#FFFFFF' },
	E: { bg: '#02B050', fg: '#FFFFFF' },
	BTC: { bg: '#EF8135', fg: '#FFFFFF' },
	L: { bg: '#BFBFBF', fg: '#000000' },
	R1: { bg: '#EE8136', fg: '#FFFFFF' },
	R2: { bg: '#008000', fg: '#FFFFFF' },
	P: { bg: '#BEBEBE', fg: '#000000' }
};

const FALLBACK = { bg: '#5566c4', fg: '#FFFFFF' };

export function baseRoute(name: string): string {
	return name.replace(/^PUB[: ]/, '').split(':')[0].trim();
}

export function routeColor(name: string): string {
	return (ROUTE_COLORS[baseRoute(name)] ?? FALLBACK).bg;
}

export function routeTextColor(name: string): string {
	return (ROUTE_COLORS[baseRoute(name)] ?? FALLBACK).fg;
}

export function isPublic(name: string): boolean {
	return name.startsWith('PUB');
}

const coordByCode = new Map(
	stops.map((s) => [s.name, { lat: s.latitude, lng: s.longitude, caption: s.caption }] as const)
);

export function stopCoord(code: string) {
	return coordByCode.get(code);
}

export const routeKeys = Object.keys(routes);

export function routesServingStop(code: string): string[] {
	const out: string[] = [];
	for (const [route, list] of Object.entries(routes)) {
		if (list.some((s) => s.busstopcode === code)) out.push(route);
	}
	return out;
}

export function routeLine(route: string): [number, number][] {
	const list: RouteStop[] = routes[route] ?? [];
	const pts: [number, number][] = [];
	for (const s of list) {
		const c = coordByCode.get(s.busstopcode);
		if (c) pts.push([c.lng, c.lat]);
	}
	return pts;
}

// Smoothed shapes are memoised — the spline is deterministic per route and gets
// asked for on every map render (line, arrows, bounds).
const smoothCache = new Map<string, [number, number][]>();

/**
 * The route's drawable polyline: the dense road-following shape when one was
 * generated, else the straight stop-to-stop chain as a fallback. The result is
 * run through a centripetal Catmull–Rom spline (see `smoothLine`) so the drawn
 * line reads as a smooth curve rather than a chain of angular road segments,
 * while still tracing the road beneath.
 */
export function routeShape(route: string): [number, number][] {
	const cached = smoothCache.get(route);
	if (cached) return cached;
	const shape = routeShapes[route];
	const raw = shape && shape.length > 1 ? shape : routeLine(route);
	const smoothed = smoothLine(raw);
	smoothCache.set(route, smoothed);
	return smoothed;
}

export type MapStop = {
	code: string;
	name: string;
	lng: number;
	lat: number;
	seq: number;
};

export function routeStops(route: string): MapStop[] {
	const list: RouteStop[] = routes[route] ?? [];
	const out: MapStop[] = [];
	for (const s of list) {
		const c = coordByCode.get(s.busstopcode);
		if (c) out.push({ code: s.busstopcode, name: s.stop_name, lng: c.lng, lat: c.lat, seq: s.seq });
	}
	return out;
}

export const NUS_CENTER: [number, number] = [103.7764, 1.2966];

/** Routes sorted alphabetically — used for the Routes-view chips. */
export const routeKeysSorted = [...routeKeys].sort();

/**
 * The route's final stop ("destination") label. NUS routes are loops; the
 * `seq: 32767` entry marks the terminus the bus returns to, so the highest-seq
 * stop is the natural destination to surface on a card.
 */
export function routeTerminal(route: string): string {
	const list = routes[route] ?? [];
	if (list.length === 0) return '';
	const sorted = [...list].sort((a, b) => a.seq - b.seq);
	return sorted[sorted.length - 1].stop_name;
}
