import type { Map as MlMap } from 'maplibre-gl';
import { routeColor, routeStops, routeShape } from '$lib/routes';

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

/** A compact bus-stop sign, with an optional star badge for saved stops. */
export function setStopSignIcon(
	map: MlMap,
	name: string,
	opts: { fill: string; stroke: string; starred?: boolean; active?: boolean }
): void {
	const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);
	const width = opts.active ? 22 : 18;
	const height = opts.active ? 26 : 22;
	const cnv = document.createElement('canvas');
	cnv.width = Math.round(width * dpr);
	cnv.height = Math.round(height * dpr);
	const ctx = cnv.getContext('2d');
	if (!ctx) return;
	ctx.scale(dpr, dpr);

	const panelX = 1.5;
	const panelY = 1.5;
	const panelW = width - 3;
	const panelH = height - 7;
	ctx.beginPath();
	ctx.roundRect(panelX, panelY, panelW, panelH, 4);
	ctx.fillStyle = opts.fill;
	ctx.fill();
	ctx.lineWidth = 2;
	ctx.strokeStyle = opts.stroke;
	ctx.stroke();

	// A simple transit-stop motif: two windows over a baseline.
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 1.4;
	ctx.beginPath();
	ctx.moveTo(width * 0.31, panelY + panelH * 0.35);
	ctx.lineTo(width * 0.31, panelY + panelH * 0.68);
	ctx.moveTo(width * 0.69, panelY + panelH * 0.35);
	ctx.lineTo(width * 0.69, panelY + panelH * 0.68);
	ctx.moveTo(width * 0.24, panelY + panelH * 0.68);
	ctx.lineTo(width * 0.76, panelY + panelH * 0.68);
	ctx.stroke();

	ctx.fillStyle = opts.stroke;
	ctx.fillRect(width / 2 - 1, panelY + panelH, 2, height - panelY - panelH);

	if (opts.starred) {
		const cx = width - 4;
		const cy = 4;
		const outer = opts.active ? 4.5 : 4;
		ctx.beginPath();
		for (let i = 0; i < 10; i += 1) {
			const radius = i % 2 === 0 ? outer : outer * 0.45;
			const angle = -Math.PI / 2 + (i * Math.PI) / 5;
			const x = cx + Math.cos(angle) * radius;
			const y = cy + Math.sin(angle) * radius;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.closePath();
		ctx.fillStyle = '#f59e0b';
		ctx.fill();
		ctx.lineWidth = 1;
		ctx.strokeStyle = '#ffffff';
		ctx.stroke();
	}

	const data = ctx.getImageData(0, 0, cnv.width, cnv.height);
	if (map.hasImage(name)) map.updateImage(name, data);
	else map.addImage(name, data, { pixelRatio: dpr });
}

/**
 * Direction arrowhead in the route's colour with the same white outline as
 * the line casing, so along the path it reads as the line growing periodic
 * arrowheads rather than as foreign markers. Re-baked whenever the selected
 * route (and so its colour) changes.
 */
export function setArrowImage(map: MlMap, name: string, fill: string): void {
	const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);
	const s = 20;
	const px = Math.round(s * dpr);
	const cnv = document.createElement('canvas');
	cnv.width = cnv.height = px;
	const ctx = cnv.getContext('2d');
	if (!ctx) return;
	ctx.scale(dpr, dpr);
	ctx.translate(s / 2, s / 2);
	ctx.beginPath();
	ctx.moveTo(-3.5, -5.5);
	ctx.lineTo(5.5, 0);
	ctx.lineTo(-3.5, 5.5);
	ctx.closePath();
	// casing first so the outline sits behind the coloured head
	ctx.lineJoin = 'round';
	ctx.lineWidth = 3;
	ctx.strokeStyle = '#ffffff';
	ctx.stroke();
	ctx.fillStyle = fill;
	ctx.fill();
	const data = ctx.getImageData(0, 0, px, px);
	if (map.hasImage(name)) map.updateImage(name, data);
	else map.addImage(name, data, { pixelRatio: dpr });
}

/** Root font scale (the data-uisize setting) — map labels are canvas-drawn,
 *  so they must follow the app-wide UI size explicitly. */
export function uiFontScale(): number {
	return (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16;
}

/** Theme-aware paint for stop labels — identical across Stops and Routes views. */
export function stopLabelPaint() {
	return {
		'text-color': isDark() ? '#e6e7ee' : '#2a2d3a',
		'text-halo-color': isDark() ? '#1b1c24' : '#ffffff',
		'text-halo-width': 1.5
	};
}

// ── route geometry → GeoJSON (consumed by HomeMap) ──
// `activeStop` splits the line/stops into "passed" (dimmed) and upcoming parts;
// pass null for a single, fully-coloured route. `zoom` picks the smoothing LOD
// (see smoothLine) — pass the map's current zoom so the curve's detail matches
// what is on screen.

export function routeLineFC(route: string, activeStop: string | null = null, zoom = 16) {
	const color = toHex(routeColor(route));
	const dim = dimColor();
	const line = routeShape(route, zoom);
	const stops = routeStops(route);
	const active = activeStop ? stops.find((s) => s.code === activeStop) : undefined;

	// The shape is a dense road polyline, so the passed/upcoming split happens
	// at the shape vertex nearest to the active stop (stop indices no longer
	// map onto line vertices).
	let splitIdx = -1;
	if (active) {
		let best = Infinity;
		for (let i = 0; i < line.length; i++) {
			const dx = line[i][0] - active.lng;
			const dy = line[i][1] - active.lat;
			const d = dx * dx + dy * dy;
			if (d < best) {
				best = d;
				splitIdx = i;
			}
		}
	}

	const features =
		splitIdx > 0
			? [
					{
						type: 'Feature' as const,
						properties: { color: dim, passed: true },
						geometry: { type: 'LineString' as const, coordinates: line.slice(0, splitIdx + 1) }
					},
					{
						type: 'Feature' as const,
						properties: { color, passed: false },
						geometry: { type: 'LineString' as const, coordinates: line.slice(splitIdx) }
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
				code: s.code,
				active: s.code === activeStop,
				passed: activeIdx > 0 && i < activeIdx
			},
			geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] }
		}))
	};
}
