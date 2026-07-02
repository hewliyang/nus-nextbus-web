"""Generate road-following geometry for each ISB route.

Snaps every route's ordered stop sequence to the road network with the public
OSRM demo server (driving profile) and writes the resulting polylines to
src/lib/data/routeShapes.json, which the map layers render instead of straight
stop-to-stop chords. Run manually whenever routes.json / stops.json change:

    python scripts/fetch_route_shapes.py

Notes
- `continue_straight=true` forbids U-turns at intermediate stops, matching how
  a bus actually passes a stop; the final leg back to the terminus may still
  turn around at the last waypoint.
- Geometry is lightly simplified (~2 m tolerance) to keep the bundle small
  while staying visually glued to the road at the app's max zoom.
"""

import json
import math
import time
from pathlib import Path

import requests

BASE_PATH = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_PATH / "src" / "lib" / "data"
OSRM = "https://router.project-osrm.org/route/v1/driving/"

Point = tuple[float, float]  # (lng, lat)


def perp_dist_m(p: Point, a: Point, b: Point) -> float:
    """Perpendicular distance from p to segment ab, in metres (equirectangular)."""
    kx = 111_320 * math.cos(math.radians(p[1]))
    ky = 110_540
    px, py = (p[0] - a[0]) * kx, (p[1] - a[1]) * ky
    bx, by = (b[0] - a[0]) * kx, (b[1] - a[1]) * ky
    seg_len2 = bx * bx + by * by
    t = 0.0 if seg_len2 == 0 else max(0.0, min(1.0, (px * bx + py * by) / seg_len2))
    return math.hypot(px - t * bx, py - t * by)


def simplify(points: list[Point], tol_m: float) -> list[Point]:
    """Douglas-Peucker with a metric tolerance."""
    if len(points) < 3:
        return points
    a, b = points[0], points[-1]
    idx, dmax = 0, 0.0
    for i in range(1, len(points) - 1):
        d = perp_dist_m(points[i], a, b)
        if d > dmax:
            idx, dmax = i, d
    if dmax <= tol_m:
        return [a, b]
    return simplify(points[: idx + 1], tol_m)[:-1] + simplify(points[idx:], tol_m)


def main() -> None:
    routes = json.loads((DATA_PATH / "routes.json").read_text())
    stops = json.loads((DATA_PATH / "stops.json").read_text())
    coord = {s["name"]: (s["longitude"], s["latitude"]) for s in stops}

    shapes: dict[str, list[Point]] = {}
    for key, entries in routes.items():
        waypoints = [coord[e["busstopcode"]] for e in entries if e["busstopcode"] in coord]
        if len(waypoints) < 2:
            print(f"{key}: skipped (fewer than 2 resolvable stops)")
            continue
        path = ";".join(f"{lng},{lat}" for lng, lat in waypoints)
        url = (
            f"{OSRM}{path}"
            "?overview=full&geometries=geojson&continue_straight=true&steps=false"
        )
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        body = resp.json()
        if body.get("code") != "Ok" or not body.get("routes"):
            raise SystemExit(f"{key}: OSRM error: {body.get('code')} {body.get('message')}")
        route = body["routes"][0]
        raw = [tuple(pt) for pt in route["geometry"]["coordinates"]]
        slim = simplify(raw, 2.0)
        shapes[key] = [[round(lng, 6), round(lat, 6)] for lng, lat in slim]
        print(
            f"{key}: {len(waypoints)} stops -> {route['distance'] / 1000:.2f} km, "
            f"{len(raw)} pts (simplified to {len(slim)})"
        )
        time.sleep(1)  # be polite to the public demo server

    out = DATA_PATH / "routeShapes.json"
    out.write_text(json.dumps(shapes) + "\n")
    print(f"wrote {out} ({out.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
