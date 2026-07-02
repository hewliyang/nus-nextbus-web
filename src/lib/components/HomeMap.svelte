<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { stops } from '$lib/data';
	import { NUS_CENTER, routeColor, routeLine, stopCoord } from '$lib/routes';
	import Icon from '$lib/components/Icon.svelte';
	import {
		styleUrl,
		toHex,
		setSquareIcon,
		STOP_SIZE,
		ensureArrowImage,
		routeLineFC,
		routeStopFC,
		stopLabelPaint
	} from '$lib/mapkit';
	import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';

	interface Props {
		/** Which segmented-control tab is active. */
		view: 'stops' | 'routes';
		/** User location (falls back to campus centre when not real). */
		lat: number;
		lng: number;
		real?: boolean;
		/** Route shown in the Routes view. */
		route: string;
		/** Fired after each pan/zoom settles ('moveend') with the map centre. */
		onCenterChange?: (lng: number, lat: number) => void;
		/**
		 * How much of the container's bottom is covered by the host's sheet, as a
		 * % of its height. The centre cursor (and the point reported through
		 * onCenterChange) sits at the centre of the *visible* strip above the
		 * sheet, not the container centre — otherwise the crosshair hugs the
		 * sheet edge and the Nearby ranking points ~500 m below what the user
		 * is actually looking at.
		 */
		coveredPct?: number;
		/**
		 * Stop code for the stop-focus mode (used by /stop/[stopName]): only the
		 * nearby-stop layers show, the focused stop gets its own highlighted
		 * marker, and the frame is a tight box around it. Home behaviour is
		 * untouched when this is undefined.
		 */
		focus?: string;
	}
	let {
		view,
		lat,
		lng,
		real = false,
		route,
		onCenterChange,
		focus,
		coveredPct = 0
	}: Props = $props();

	// Focus mode behaves as the Stops view for layer visibility.
	const effView = $derived(focus ? 'stops' : view);

	let container: HTMLDivElement;
	let map: MlMap | null = null;
	let ready = $state(false);
	let firstFit = true;

	const STOP_COLOR = '#0d9488'; // teal — distinct from the blue user dot
	const USER_COLOR = '#2f6df6';

	// ── feature collections ──
	function userFC() {
		return {
			type: 'FeatureCollection' as const,
			features: real
				? [
						{
							type: 'Feature' as const,
							properties: {},
							geometry: { type: 'Point' as const, coordinates: [lng, lat] as [number, number] }
						}
					]
				: []
		};
	}

	// Lazy load: only the stops within the current map viewport are rendered, so
	// new markers stream in as the user pans/zooms around campus (recomputed on
	// every `moveend`).
	function nearbyFC() {
		const b = map?.getBounds();
		// The focused stop (stop-focus mode) is rendered by its own source/layer
		// pair, so it is excluded here to avoid a doubled marker + label.
		const inView = b
			? stops.filter((s) => s.name !== focus && b.contains([s.longitude, s.latitude]))
			: [];
		return {
			type: 'FeatureCollection' as const,
			features: inView.map((s) => ({
				type: 'Feature' as const,
				properties: { name: s.caption, code: s.name },
				geometry: { type: 'Point' as const, coordinates: [s.longitude, s.latitude] }
			}))
		};
	}

	// The single highlighted stop of the stop-focus mode.
	function focusFC() {
		const c = focus ? stopCoord(focus) : undefined;
		return {
			type: 'FeatureCollection' as const,
			features: c
				? [
						{
							type: 'Feature' as const,
							properties: { name: c.caption, code: focus },
							geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] as [number, number] }
						}
					]
				: []
		};
	}

	function bakeIcons() {
		if (!map) return;
		setSquareIcon(map, 'home-route-stop', {
			fill: '#ffffff',
			stroke: toHex(routeColor(route)),
			size: STOP_SIZE.normal
		});
		setSquareIcon(map, 'home-nearby-stop', {
			fill: STOP_COLOR,
			stroke: '#ffffff',
			size: STOP_SIZE.nearby
		});
		setSquareIcon(map, 'home-focus-stop', {
			fill: STOP_COLOR,
			stroke: '#ffffff',
			size: STOP_SIZE.active
		});
		ensureArrowImage(map);
	}

	// ── layer setup (run on load + re-run after a theme reskin) ──
	function addEverything() {
		if (!map) return;
		bakeIcons();
		map.addSource('route-line', { type: 'geojson', data: routeLineFC(route) });
		map.addSource('route-stops', { type: 'geojson', data: routeStopFC(route) });
		map.addSource('nearby-stops', { type: 'geojson', data: nearbyFC() });
		map.addSource('focus-stop', { type: 'geojson', data: focusFC() });
		map.addSource('user', { type: 'geojson', data: userFC() });

		// route geometry (Routes view)
		map.addLayer({
			id: 'route-casing',
			type: 'line',
			source: 'route-line',
			layout: { 'line-cap': 'round', 'line-join': 'round' },
			paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.9 }
		});
		map.addLayer({
			id: 'route-path',
			type: 'line',
			source: 'route-line',
			layout: { 'line-cap': 'round', 'line-join': 'round' },
			paint: { 'line-color': ['get', 'color'], 'line-width': 4 }
		});
		map.addLayer({
			id: 'route-arrows',
			type: 'symbol',
			source: 'route-line',
			layout: {
				'symbol-placement': 'line',
				'symbol-spacing': 64,
				'icon-image': 'route-arrow',
				'icon-size': 0.85,
				'icon-rotation-alignment': 'map',
				'icon-allow-overlap': true,
				'icon-ignore-placement': true
			}
		});
		map.addLayer({
			id: 'route-stop-squares',
			type: 'symbol',
			source: 'route-stops',
			layout: {
				'icon-image': 'home-route-stop',
				'icon-allow-overlap': true,
				'icon-ignore-placement': true
			}
		});

		// nearby stops (Stops view)
		map.addLayer({
			id: 'nearby-stop-squares',
			type: 'symbol',
			source: 'nearby-stops',
			layout: {
				'icon-image': 'home-nearby-stop',
				'icon-allow-overlap': true,
				'icon-ignore-placement': true
			}
		});

		// the focused stop (stop-focus mode) — bigger square, always-visible label
		map.addLayer({
			id: 'focus-stop-square',
			type: 'symbol',
			source: 'focus-stop',
			layout: {
				'icon-image': 'home-focus-stop',
				'icon-allow-overlap': true,
				'icon-ignore-placement': true
			}
		});

		// user location — kept visible across BOTH views
		map.addLayer({
			id: 'user-halo',
			type: 'circle',
			source: 'user',
			paint: { 'circle-radius': 18, 'circle-color': USER_COLOR, 'circle-opacity': 0.18 }
		});
		map.addLayer({
			id: 'user-dot',
			type: 'circle',
			source: 'user',
			paint: {
				'circle-radius': 6,
				'circle-color': USER_COLOR,
				'circle-stroke-color': '#ffffff',
				'circle-stroke-width': 2.5
			}
		});

		// labels on top — identical styling for both views
		map.addLayer({
			id: 'route-stop-labels',
			type: 'symbol',
			source: 'route-stops',
			layout: {
				'text-field': ['get', 'name'],
				'text-size': 11,
				'text-offset': [0, 1.2],
				'text-anchor': 'top',
				'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
				'text-optional': true
			},
			paint: stopLabelPaint()
		});
		map.addLayer({
			id: 'nearby-stop-labels',
			type: 'symbol',
			source: 'nearby-stops',
			layout: {
				'text-field': ['get', 'name'],
				'text-size': 11,
				'text-offset': [0, 1.2],
				'text-anchor': 'top',
				'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
				'text-optional': true
			},
			paint: stopLabelPaint()
		});
		map.addLayer({
			id: 'focus-stop-label',
			type: 'symbol',
			source: 'focus-stop',
			layout: {
				'text-field': ['get', 'name'],
				'text-size': 12,
				'text-offset': [0, 1.3],
				'text-anchor': 'top',
				'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
				'text-allow-overlap': true,
				'text-ignore-placement': true
			},
			paint: stopLabelPaint()
		});
	}

	const ROUTE_LAYERS = [
		'route-casing',
		'route-path',
		'route-arrows',
		'route-stop-squares',
		'route-stop-labels'
	];
	const NEARBY_LAYERS = ['nearby-stop-squares', 'nearby-stop-labels'];

	function setVisibility() {
		if (!map) return;
		// Focus mode counts as the Stops view: route layers stay hidden regardless.
		for (const id of ROUTE_LAYERS) {
			if (map.getLayer(id))
				map.setLayoutProperty(id, 'visibility', effView === 'routes' ? 'visible' : 'none');
		}
		for (const id of NEARBY_LAYERS) {
			if (map.getLayer(id))
				map.setLayoutProperty(id, 'visibility', effView === 'stops' ? 'visible' : 'none');
		}
	}

	// The zoom-frame differs per view: a ~450m box around the user for Stops, the
	// whole route extent for Routes. Bottom padding lifts content above the sheet.
	function fitView(animate: boolean) {
		if (!map) return;
		const h = map.getContainer().clientHeight || 0;
		const duration = animate && ready ? 500 : 0;

		if (focus) {
			// Stop-focus mode: a ~300 m box centred on the focused stop. The host
			// container is a short (~20dvh) strip, so no sheet-clearing padding.
			const c = stopCoord(focus);
			const [cLng, cLat] = c ? [c.lng, c.lat] : NUS_CENTER;
			const dLat = 150 / 111_000;
			const dLng = 150 / (111_000 * Math.cos((cLat * Math.PI) / 180));
			map.fitBounds(
				[
					[cLng - dLng, cLat - dLat],
					[cLng + dLng, cLat + dLat]
				],
				{ padding: 24, maxZoom: 16.75, duration }
			);
			return;
		}

		if (view === 'routes') {
			const line = routeLine(route);
			if (!line.length) return;
			const lngs = line.map((p) => p[0]);
			const lats = line.map((p) => p[1]);
			map.fitBounds(
				[
					[Math.min(...lngs), Math.min(...lats)],
					[Math.max(...lngs), Math.max(...lats)]
				],
				{
					padding: { top: 44, bottom: Math.round(h * 0.45), left: 40, right: 40 },
					maxZoom: 16,
					duration
				}
			);
		} else {
			const dLat = 450 / 111_000;
			const dLng = 450 / (111_000 * Math.cos((lat * Math.PI) / 180));
			map.fitBounds(
				[
					[lng - dLng, lat - dLat],
					[lng + dLng, lat + dLat]
				],
				{
					padding: { top: 36, bottom: Math.round(h * 0.5), left: 32, right: 32 },
					maxZoom: 17,
					duration
				}
			);
		}
	}

	let themeObs: MutationObserver | null = null;

	onMount(async () => {
		const maplibregl = (await import('maplibre-gl')).default;
		await import('maplibre-gl/dist/maplibre-gl.css');

		map = new maplibregl.Map({
			container,
			style: styleUrl(),
			center: real || focus ? [lng, lat] : NUS_CENTER,
			zoom: 15.5,
			attributionControl: false
		});
		map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

		map.on('load', () => {
			addEverything();
			ready = true; // triggers the reconcile effect → setVisibility + fitView
		});

		// Tap a stop marker → that stop's page. Delegated (layer-scoped) handlers
		// live on the Map object keyed by layer id — verified against maplibre-gl
		// v5's `_delegatedListeners` — so they keep working after the theme-reskin
		// setStyle + addEverything() re-adds layers with the same ids. Registered
		// once here, not per-styledata.
		const TAP_LAYERS = [
			'nearby-stop-squares',
			'nearby-stop-labels',
			'route-stop-squares',
			'route-stop-labels'
		];
		for (const id of TAP_LAYERS) {
			map.on('click', id, (e) => {
				const code = e.features?.[0]?.properties?.code;
				if (typeof code === 'string' && code) goto(`/stop/${code}`);
			});
			map.on('mouseenter', id, () => {
				if (map) map.getCanvas().style.cursor = 'pointer';
			});
			map.on('mouseleave', id, () => {
				if (map) map.getCanvas().style.cursor = '';
			});
		}

		// Stream in the markers for whatever is now on screen, and report the new
		// centre. 'moveend' only — never continuous 'move': each centre change
		// re-ranks the Nearby list, remounting StopCards that each fetch /api/stop,
		// so continuous updates would spam the API while dragging.
		map.on('moveend', () => {
			const src = map?.getSource('nearby-stops') as GeoJSONSource | undefined;
			src?.setData(nearbyFC());
			if (!focus && map) {
				// The reported point matches the crosshair: the centre of the strip
				// left visible above the sheet (container centre when uncovered).
				const el = map.getContainer();
				const c = map.unproject([el.clientWidth / 2, (el.clientHeight * (100 - coveredPct)) / 200]);
				onCenterChange?.(c.lng, c.lat);
			}
		});

		// Re-skin the basemap (and re-add our layers) when the app theme flips.
		themeObs = new MutationObserver(() => {
			if (!map) return;
			map.setStyle(styleUrl());
			map.once('styledata', () => {
				addEverything();
				setVisibility();
			});
		});
		themeObs.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		});
	});

	// Reconcile data + frame whenever the view, route, focus, or location changes.
	// `focus` matters because SvelteKit reuses this component across /stop/A →
	// /stop/B navigations: the focused source, the exclusion in nearbyFC, and the
	// frame must all follow the new stop.
	$effect(() => {
		void view;
		void route;
		void lat;
		void lng;
		void real;
		void focus;
		if (!ready || !map) return;
		bakeIcons();
		(map.getSource('route-line') as GeoJSONSource | undefined)?.setData(routeLineFC(route));
		(map.getSource('route-stops') as GeoJSONSource | undefined)?.setData(routeStopFC(route));
		(map.getSource('nearby-stops') as GeoJSONSource | undefined)?.setData(nearbyFC());
		(map.getSource('focus-stop') as GeoJSONSource | undefined)?.setData(focusFC());
		(map.getSource('user') as GeoJSONSource | undefined)?.setData(userFC());
		setVisibility();
		fitView(!firstFit);
		firstFit = false;
	});

	onDestroy(() => {
		themeObs?.disconnect();
		map?.remove();
	});
</script>

<div class="relative h-full w-full">
	<div bind:this={container} class="h-full w-full"></div>

	<!-- Citymapper-style centre cursor: a fixed crosshair over the exact viewport
	     centre while the map pans underneath (Stops view only; hidden in the
	     Routes view and in stop-focus mode). -->
	{#if view === 'stops' && !focus}
		<div
			class="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transition-[top] duration-300 ease-out"
			style="top: {(100 - coveredPct) / 2}%"
			aria-hidden="true"
		>
			<div
				class="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface/95 text-ink shadow-[0_2px_12px_rgba(0,0,0,0.28)]"
			>
				<Icon name="crosshair" size={26} />
			</div>
		</div>
	{/if}
</div>
