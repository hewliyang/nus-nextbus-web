// Turns a dense, angular road polyline into a smooth curve at a zoom-dependent
// level of detail.
//
// maplibre can only stroke straight-segment LineStrings, so "bezier" here means:
// thin the polyline down to a few control points (Douglas–Peucker), run a
// centripetal Catmull–Rom spline — equivalent to a chain of cubic Béziers whose
// handles are collinear through every control point, so the curve is
// tangent-continuous and never shows a corner at a joint — back through those
// points, and re-sample it densely enough that the drawn chords preserve that
// smoothness.
//
// All tolerances are constant in *screen pixels*, so they scale with zoom:
// zoomed out the control budget collapses to just enough points to roughly map
// the road direction (maximally smooth); zoomed in it keeps every raw vertex so
// the line hugs the actual carriageway.

type Pt = [number, number];

/** Longitude degrees per screen pixel at a given zoom (maplibre 512px tiles). */
function degPerPx(zoom: number): number {
	return 360 / (512 * 2 ** zoom);
}

// Control-point thinning budget (screen px) per zoom bucket. Grows aggressively
// as you zoom out: at z13–15 only the road direction survives; at z17+ the
// full raw trace is kept. Values tuned visually against the A1 mockups in
// claude-mockups/.
const CTRL_PX: Record<number, number> = { 13: 24, 14: 16, 15: 10, 16: 6, 17: 3, 18: 3 };

/** Zoom buckets the smoothing is computed at — callers cache per bucket. */
export const LOD_MIN = 13;
export const LOD_MAX = 18;

export function lodBucket(zoom: number): number {
	return Math.max(LOD_MIN, Math.min(LOD_MAX, Math.round(zoom)));
}

// Perpendicular distance from `p` to the segment a→b, in coordinate units.
function segDist(p: Pt, a: Pt, b: Pt): number {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const len2 = dx * dx + dy * dy;
	if (len2 === 0) {
		const px = p[0] - a[0];
		const py = p[1] - a[1];
		return Math.hypot(px, py);
	}
	let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
	t = Math.max(0, Math.min(1, t));
	const cx = a[0] + t * dx;
	const cy = a[1] + t * dy;
	return Math.hypot(p[0] - cx, p[1] - cy);
}

/**
 * Douglas–Peucker: drop points that lie within `tol` (in lng/lat degrees) of the
 * line kept so far. Reducing the control-point count is what lets the spline read
 * smooth rather than tracing every wobble of the raw road trace.
 */
export function simplify(points: Pt[], tol: number): Pt[] {
	if (points.length <= 2) return points.slice();
	const keep = new Array(points.length).fill(false);
	keep[0] = keep[points.length - 1] = true;
	const stack: [number, number][] = [[0, points.length - 1]];
	while (stack.length) {
		const [lo, hi] = stack.pop()!;
		let maxD = 0;
		let idx = -1;
		for (let i = lo + 1; i < hi; i++) {
			const d = segDist(points[i], points[lo], points[hi]);
			if (d > maxD) {
				maxD = d;
				idx = i;
			}
		}
		if (maxD > tol && idx !== -1) {
			keep[idx] = true;
			stack.push([lo, idx], [idx, hi]);
		}
	}
	return points.filter((_, i) => keep[i]);
}

/**
 * Centripetal Catmull–Rom spline through `points`, sampled adaptively: roughly
 * one sample every `step` degrees along each span (capped at 96 so degenerate
 * spans stay bounded). The centripetal parameterisation guarantees no cusps or
 * self-intersections, and tangent continuity at every control point means the
 * only way a joint can read as a corner is under-sampling — hence the caller
 * passes a fine, zoom-scaled `step`.
 */
export function catmullRom(points: Pt[], step: number): Pt[] {
	if (points.length <= 2) return points.slice();
	const out: Pt[] = [points[0]];
	const alpha = 0.5; // centripetal — no cusps or self-intersections
	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[i - 1] ?? points[i];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[i + 2] ?? points[i + 1];

		const t0 = 0;
		const t1 = t0 + Math.pow(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), alpha);
		const t2 = t1 + Math.pow(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), alpha);
		const t3 = t2 + Math.pow(Math.hypot(p3[0] - p2[0], p3[1] - p2[1]), alpha);

		// Degenerate (coincident) knots: fall back to a straight hop.
		if (t1 === t0 || t2 === t1 || t3 === t2) {
			out.push(p2);
			continue;
		}

		const span = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
		const n = Math.max(2, Math.min(96, Math.ceil(span / step)));
		for (let j = 1; j <= n; j++) {
			const t = t1 + ((t2 - t1) * j) / n;
			const a1x = ((t1 - t) / (t1 - t0)) * p0[0] + ((t - t0) / (t1 - t0)) * p1[0];
			const a1y = ((t1 - t) / (t1 - t0)) * p0[1] + ((t - t0) / (t1 - t0)) * p1[1];
			const a2x = ((t2 - t) / (t2 - t1)) * p1[0] + ((t - t1) / (t2 - t1)) * p2[0];
			const a2y = ((t2 - t) / (t2 - t1)) * p1[1] + ((t - t1) / (t2 - t1)) * p2[1];
			const a3x = ((t3 - t) / (t3 - t2)) * p2[0] + ((t - t2) / (t3 - t2)) * p3[0];
			const a3y = ((t3 - t) / (t3 - t2)) * p2[1] + ((t - t2) / (t3 - t2)) * p3[1];
			const b1x = ((t2 - t) / (t2 - t0)) * a1x + ((t - t0) / (t2 - t0)) * a2x;
			const b1y = ((t2 - t) / (t2 - t0)) * a1y + ((t - t0) / (t2 - t0)) * a2y;
			const b2x = ((t3 - t) / (t3 - t1)) * a2x + ((t - t1) / (t3 - t1)) * a3x;
			const b2y = ((t3 - t) / (t3 - t1)) * a2y + ((t - t1) / (t3 - t1)) * a3y;
			const cx = ((t2 - t) / (t2 - t1)) * b1x + ((t - t1) / (t2 - t1)) * b2x;
			const cy = ((t2 - t) / (t2 - t1)) * b1y + ((t - t1) / (t2 - t1)) * b2y;
			out.push([cx, cy]);
		}
	}
	return out;
}

/**
 * Smooth a raw road polyline for drawing at a given zoom, in three passes:
 *   1. thin the trace to control points (`CTRL_PX[bucket]` screen px) — the
 *      zoomed-out budgets keep only enough points to roughly map the road
 *      direction, which is what makes the far view read as flowing arcs;
 *   2. run the centripetal Catmull–Rom spline through them, sampled every 4px;
 *   3. thin the dense samples back down at 0.25px — sub-pixel, so it sheds
 *      redundant points on straights without re-introducing visible chords.
 */
export function smoothLine(points: Pt[], zoom: number): Pt[] {
	if (points.length <= 2) return points.slice();
	const bucket = lodBucket(zoom);
	const d = degPerPx(bucket);
	// Control budget one level finer than the on-screen bucket (z13 draws with
	// z14's control points, and so on) — the absolute tolerance comes from the
	// finer bucket so the control-point count matches it exactly.
	const fine = Math.min(bucket + 1, LOD_MAX);
	const ctrl = simplify(points, (CTRL_PX[fine] ?? 3) * degPerPx(fine));
	return simplify(catmullRom(ctrl, 4 * d), 0.25 * d);
}
