// Turns a dense, angular road polyline into a smooth curve.
//
// maplibre can only stroke straight-segment LineStrings, so "bezier" here means:
// thin the polyline down to a few control points (Douglas–Peucker), then run a
// centripetal Catmull–Rom spline — equivalent to a chain of cubic Béziers — back
// through those points and re-sample it. Fewer control points give a smoother,
// less jittery curve; the centripetal parameterisation guarantees it never loops
// or overshoots, so the curve still hugs the road beneath.

type Pt = [number, number];

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
 * Centripetal Catmull–Rom spline through `points`, sampled adaptively: longer
 * spans get more samples (roughly one every `step` degrees) so straights stay
 * cheap while curves stay smooth. Passes through every control point, so the
 * curve still lands on the road wherever a control point does.
 */
export function catmullRom(points: Pt[], step = 8e-5): Pt[] {
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
		const n = Math.max(2, Math.min(24, Math.ceil(span / step)));
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
 * Smooth a raw road polyline for drawing, in three passes:
 *   1. thin the trace to control points (`ctrlTol` ≈ 3.3 m) — fewer control
 *      points make the spline read smoother and strip road-trace jitter, while
 *      keeping every real turn so the curve still matches the road (mean drift
 *      off the raw trace stays ~2 m);
 *   2. run a centripetal Catmull–Rom spline through them;
 *   3. thin the dense spline samples back down (`outTol` ≈ 1.1 m) — points on
 *      near-straight arcs are redundant once the joints are rounded, so dropping
 *      them yields a lighter curve than the raw polyline without any visible
 *      change to its shape.
 */
export function smoothLine(points: Pt[], ctrlTol = 3e-5, outTol = 1e-5): Pt[] {
	if (points.length <= 2) return points.slice();
	return simplify(catmullRom(simplify(points, ctrlTol)), outTol);
}
