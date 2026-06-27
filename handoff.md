## Handoff Summary: NUS Bus Timing App — Data Source

**Context:** Building an NUS Internal Shuttle Bus timing app. Official NUS NextBus app was discontinued 29 May 2026 (folded into uNivUS). No official public developer API exists. Decided against reverse-engineering NUS's own protected `nnextbus.nus.edu.sg` backend (requires Basic Auth — out of scope). Instead found and validated a legitimate public proxy.

### Confirmed working data source
- **Site:** `bus.hewliyang.com` — public PWA, unmaintained but live, source at `github.com/hewliyang/nus-nextbus-web`
- **Why it's safe to use:** confirmed via the repo's `.env.example` that NUS credentials (`NEXTBUS_BASIC_AUTH`, `NEXTBUS_API_URL`) are held server-side only. The site never exposes NUS auth to the client — only resolved JSON. So calling its public endpoints is not bypassing anyone's access control.
- **Endpoint pattern:** `GET https://bus.hewliyang.com/stop/{STOP_CODE}/__data.json`
- **Response format:** SvelteKit's `devalue` flat-array serialization (not plain JSON) — object/array values are indices pointing elsewhere in the same array, not inline. Needs a small recursive resolver: walk from index 0, if primitive return as-is, if array map-decode each element, if object decode each property value as an index.
- **Decoded shape per stop:** `{ etas: { lastUpdated, busStopName, busStopCaption, timings: [{ name, arrivalTime, nextArrivalTime, arrivalTime_veh_plate, nextArrivalTime_veh_plate, arrivalTime_capacity, arrivalTime_ridership, ... }] }, degraded: boolean }`. `arrivalTime`/`nextArrivalTime` are minutes-to-arrival as strings (`"-"` or `-1` = no data). Capacity/ridership fields are bonus crowding data not in the raw NUS spec.
- **32 stop codes already harvested** from the homepage nav (e.g. `PGP`, `UTOWN`, `KR-MRT`, `LT13`, `BIZ2`, `CLB`, `YIH`, `KRB`, etc.) — full list in prior turn, ready to hardcode as the app's stop directory.

### What the agent should build (describe, don't need exact code yet)
1. A fetch + devalue-decode utility that hits the `__data.json` endpoint per stop and returns the resolved object.
2. A polling layer (15–30s interval per viewed stop, not all 32 at once) with client-side caching to be a polite consumer of someone's personal unfunded service.
3. A stop directory module seeded from the harvested list (name + code + ideally lat/lng if findable — see gap #1 below).
4. UI binding: stop picker → live arrival list per route (K, D1, D2, A1, A2, R1, R2, P, etc.) with countdown timers, refreshing on poll.

### Outstanding things to find out
1. **No lat/lng coordinates yet** for the 32 stops — homepage only gave names + slugs. Needed for any "nearest stop" or map-pin feature. Options: check if a stop's own page (not just `__data.json`) embeds coordinates in its HTML/meta; or fall back to manually geocoding NUS stop names; or eventually request this from NUS OCA.
2. **No live bus GPS/position endpoint confirmed.** Site nav only showed "Stops" and "Routes" — `/busroutes` page didn't clearly expose a route→live-position equivalent (parsing was inconclusive, and GitHub blocked browsing the `src/routes` folder directly via robots rules). If the app needs a moving-bus-on-map feature (not just countdown timers), this needs a DevTools Network-tab check on the actual rendered `/busroutes` page (or a per-route page if one exists) to see if there's a `/route/{code}/__data.json` or similar pattern emitting `lat`/`lng`/`speed`.
3. **Route → stop sequence / route shape data** (for drawing a route line on a map) not yet found — same caveat as above, check `/busroutes` rendering directly in browser.
4. **First/last bus times per route** (operating hours) — not yet sourced. May need to check NUS UCI's published route pages (uci.nus.edu.sg) which had network-map info as of the Jan 2026 route changes, since this is more static/scheduling data unlikely to be in the live timing payload.
5. **Whether `x-sveltekit-invalidated` query param is required** — worked with it once; untested whether omitting it still returns fresh data or a cached/stale response.
6. **Etiquette step not yet done:** no outreach made to the site maintainer (hewliyang, active on GitHub) — worth a quick issue/message before scaling up polling frequency or usage.
