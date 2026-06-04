import { stops, routes } from '$lib/data';
import type { RouteStop } from '$lib/types';

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
