<p align="center">
  <img alt="NUS LiveBus logo" src="./static/512x512.png" width="70" />
</p>
<h1 align="center">
  NUS LiveBus
</h1>

> [!NOTE]
> A **PWA** for live NUS Internal Shuttle Bus (ISB) arrival timings — Citymapper-inspired, with a full-bleed map and a draggable bottom sheet.

NUS LiveBus is a redesign forked from [`nus-nextbus-web`](https://github.com/hewliyang/nus-nextbus-web). Instead of talking to NUS's credentialed FMS backend, it reads the **same live data from [hewliyang](https://bus.hewliyang.com)'s public deployment**, so the app needs **no secrets to run**.

## Features

- 🚍 **Live arrivals** — countdowns auto-refresh (~20s) and pause when the tab is hidden
- 🗺️ **Citymapper-style home** — the map is the background; a draggable, scrollable sheet sits over it
- 📍 **Nearby stops** — sorted by distance from your location, with live arrivals on each card
- 🧭 **Routes** — browse any route on a map with direction arrows, its stop list, and first/last bus times
- 🔎 **Search** stops and ⭐ **star** your frequent ones
- 🚶 **Crowding** indicator per bus
- 🌑 **Dark mode** (map re-skins too) and 📱 **installable** (add to home screen)

## Tech stack

SvelteKit 2 · Svelte 5 (runes) · TypeScript · Tailwind CSS 3 · MapLibre GL (keyless CartoCDN tiles)

## Developing

No `.env` is required — the app boots and fetches live data out of the box.

```bash
pnpm install
pnpm dev
```

Live timings are fetched **server-side** from `bus.hewliyang.com` (the browser never calls it directly), with a short in-memory cache to be kind to that server. To point at a different deployment, set an optional env var:

```bash
HEWLIYANG_BASE=https://bus.hewliyang.com
```

## Notes

- Please be considerate of hewliyang's (unfunded) server — the polling cadence and a server-side cache are tuned to keep load low.
- First/last-bus times are still being populated per route.
- Live moving-bus positions on the map are planned but not yet available (no public position feed).

## Credits

Forked from [`nus-nextbus-web`](https://github.com/hewliyang/nus-nextbus-web) by [hewliyang](https://hewliyang.com), who also hosts the data source. Redesign by [ianfromdover](https://github.com/ianfromdover).

## Disclaimer

[NUS Acceptable Use Policy for IT Resources](https://nus.edu.sg/registrar/docs/info/registration-guides/aup-form.pdf).
