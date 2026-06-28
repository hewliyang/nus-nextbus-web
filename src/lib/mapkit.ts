import type { Map as MlMap } from 'maplibre-gl';
import { routeColor, routeStops, routeLine } from '$lib/routes';

// ── theme-aware basemap + colour helpers (shared by every map component) ──

export function styleUrl(): string {
	return getComputedStyle(document.documentElement)
		.getPropertyValue('--map-style')
		.trim()
		.replace(/^['"]|['"]$/g, '');
}

export function isDark(): boolean {
	return document.documentElement.getAttribute('data-theme') === 'dark';
}

/** Resolve any CSS colour (incl. oklch tokens) to a hex string maplibre accepts. */
export function toHex(color: string): string {
	const c = document.createElement('canvas');
	c.width = c.height = 1;
	const ctx = c.getContext('2d');
	if (!ctx) return '#5566c4';
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, 1, 1);
	const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
	return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

/** The muted "already-passed" colour, from the --border-strong token. */
export function dimColor(): string {
	const v = getComputedStyle(document.documentElement).getPropertyValue('--border-strong').trim();
	return v ? toHex(v) : '#b8bcc8';
}

// ── rounded-square stop marker ──
// maplibre `circle` layers can only draw circles, so a rounded square is baked
// to a canvas and registered as a symbol icon. `size` is the on-screen edge
// length in CSS px, picked to match the diameter of the circle it replaces
// (radius 5 → 10, radius 6 → 12, radius 8 → 16).

export interface SquareIcon {
	fill: string;
	stroke: string;
	strokeWidth?: number;
	size: number;
}

export function setSquareIcon(map: MlMap, name: string, opts: SquareIcon): void {
	const { fill, stroke, strokeWidth = 2, size } = opts;
	const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);
	const px = Math.round(size * dpr);
	const cnv = document.createElement('canvas');
	cnv.width = cnv.height = px;
	const ctx = cnv.getContext('2d');
	if (!ctx) return;
	ctx.scale(dpr, dpr);

	const inset = strokeWidth / 2 + 0.5;
	const x = inset;
	const y = inset;
	const w = size - inset * 2;
	const h = size - inset * 2;
	const r = Math.min(w, h) * 0.3;
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
	ctx.fillStyle = fill;
	ctx.fill();
	if (strokeWidth > 0) {
		ctx.lineWidth = strokeWidth;
		ctx.strokeStyle = stroke;
		ctx.stroke();
	}

	const data = ctx.getImageData(0, 0, px, px);
	if (map.hasImage(name)) map.updateImage(name, data);
	else map.addImage(name, data, { pixelRatio: dpr });
}

// Edge lengths matching the circle radii they replace.
export const STOP_SIZE = { normal: 10, active: 16, nearby: 12 } as const;

/** White direction chevron, baked once and rotated along the line by maplibre. */
export function ensureArrowImage(map: MlMap): void {
	if (map.hasImage('route-arrow')) return;
	const s = 20;
	const cnv = document.createElement('canvas');
	cnv.width = cnv.height = s;
	const ctx = cnv.getContext('2d');
	if (!ctx) return;
	ctx.translate(s / 2, s / 2);
	ctx.beginPath();
	ctx.moveTo(-3, -5);
	ctx.lineTo(5, 0);
	ctx.lineTo(-3, 5);
	ctx.closePath();
	ctx.fillStyle = '#ffffff';
	ctx.fill();
	ctx.lineWidth = 1.5;
	ctx.strokeStyle = 'rgba(20,22,34,0.45)';
	ctx.stroke();
	map.addImage('route-arrow', ctx.getImageData(0, 0, s, s));
}

/** Theme-aware paint for stop labels — identical across Stops and Routes views. */
export function stopLabelPaint() {
	return {
		'text-color': isDark() ? '#e6e7ee' : '#2a2d3a',
		'text-halo-color': isDark() ? '#1b1c24' : '#ffffff',
		'text-halo-width': 1.5
	};
}

// ── route geometry → GeoJSON (shared by RouteMap and HomeMap) ──
// `activeStop` splits the line/stops into "passed" (dimmed) and upcoming parts;
// pass null (the home Routes view) for a single, fully-coloured route.

export function routeLineFC(route: string, activeStop: string | null = null) {
	const color = toHex(routeColor(route));
	const dim = dimColor();
	const line = routeLine(route);
	const stops = routeStops(route);
	const activeIdx = activeStop ? stops.findIndex((s) => s.code === activeStop) : -1;

	const features =
		activeIdx > 0
			? [
					{
						type: 'Feature' as const,
						properties: { color: dim, passed: true },
						geometry: { type: 'LineString' as const, coordinates: line.slice(0, activeIdx + 1) }
					},
					{
						type: 'Feature' as const,
						properties: { color, passed: false },
						geometry: { type: 'LineString' as const, coordinates: line.slice(activeIdx) }
					}
				]
			: [
					{
						type: 'Feature' as const,
						properties: { color, passed: false },
						geometry: { type: 'LineString' as const, coordinates: line }
					}
				];
	return { type: 'FeatureCollection' as const, features };
}

export function routeStopFC(route: string, activeStop: string | null = null) {
	const stops = routeStops(route);
	const activeIdx = activeStop ? stops.findIndex((s) => s.code === activeStop) : -1;
	return {
		type: 'FeatureCollection' as const,
		features: stops.map((s, i) => ({
			type: 'Feature' as const,
			properties: {
				name: s.name,
				active: s.code === activeStop,
				passed: activeIdx > 0 && i < activeIdx
			},
			geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] }
		}))
	};
}
