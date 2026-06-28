<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { stops } from '$lib/data';
	import { NUS_CENTER, routeColor, routeLine } from '$lib/routes';
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
	}
	let { view, lat, lng, real = false, route }: Props = $props();

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
		const inView = b ? stops.filter((s) => b.contains([s.longitude, s.latitude])) : [];
		return {
			type: 'FeatureCollection' as const,
			features: inView.map((s) => ({
				type: 'Feature' as const,
				properties: { name: s.caption },
				geometry: { type: 'Point' as const, coordinates: [s.longitude, s.latitude] }
			}))
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
		ensureArrowImage(map);
	}

	// ── layer setup (run on load + re-run after a theme reskin) ──
	function addEverything() {
		if (!map) return;
		bakeIcons();
		map.addSource('route-line', { type: 'geojson', data: routeLineFC(route) });
		map.addSource('route-stops', { type: 'geojson', data: routeStopFC(route) });
		map.addSource('nearby-stops', { type: 'geojson', data: nearbyFC() });
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
		for (const id of ROUTE_LAYERS) {
			if (map.getLayer(id))
				map.setLayoutProperty(id, 'visibility', view === 'routes' ? 'visible' : 'none');
		}
		for (const id of NEARBY_LAYERS) {
			if (map.getLayer(id))
				map.setLayoutProperty(id, 'visibility', view === 'stops' ? 'visible' : 'none');
		}
	}

	// The zoom-frame differs per view: a ~450m box around the user for Stops, the
	// whole route extent for Routes. Bottom padding lifts content above the sheet.
	function fitView(animate: boolean) {
		if (!map) return;
		const h = map.getContainer().clientHeight || 0;
		const duration = animate && ready ? 500 : 0;

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
				{ padding: { top: 44, bottom: Math.round(h * 0.45), left: 40, right: 40 }, maxZoom: 16, duration }
			);
		} else {
			const dLat = 450 / 111_000;
			const dLng = 450 / (111_000 * Math.cos((lat * Math.PI) / 180));
			map.fitBounds(
				[
					[lng - dLng, lat - dLat],
					[lng + dLng, lat + dLat]
				],
				{ padding: { top: 36, bottom: Math.round(h * 0.5), left: 32, right: 32 }, maxZoom: 17, duration }
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
			center: real ? [lng, lat] : NUS_CENTER,
			zoom: 15.5,
			attributionControl: false
		});
		map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

		map.on('load', () => {
			addEverything();
			ready = true; // triggers the reconcile effect → setVisibility + fitView
		});

		// Stream in the markers for whatever is now on screen.
		map.on('moveend', () => {
			const src = map?.getSource('nearby-stops') as GeoJSONSource | undefined;
			src?.setData(nearbyFC());
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

	// Reconcile data + frame whenever the view, route, or user location changes.
	$effect(() => {
		void view;
		void route;
		void lat;
		void lng;
		void real;
		if (!ready || !map) return;
		bakeIcons();
		(map.getSource('route-line') as GeoJSONSource | undefined)?.setData(routeLineFC(route));
		(map.getSource('route-stops') as GeoJSONSource | undefined)?.setData(routeStopFC(route));
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

<div bind:this={container} class="h-full w-full"></div>
