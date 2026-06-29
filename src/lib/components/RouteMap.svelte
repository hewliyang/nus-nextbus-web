<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { routeColor, routeLine, NUS_CENTER } from '$lib/routes';
	import {
		styleUrl,
		toHex,
		dimColor,
		setSquareIcon,
		STOP_SIZE,
		ensureArrowImage,
		routeLineFC,
		routeStopFC,
		stopLabelPaint
	} from '$lib/mapkit';
	import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';

	interface Props {
		route: string;
		activeStop?: string | null;
		arrows?: boolean;
		/** Pad the fit toward the top so the line sits above an overlaying sheet. */
		fillBottom?: boolean;
	}

	let { route, activeStop = null, arrows = false, fillBottom = false }: Props = $props();

	let container: HTMLDivElement;
	let map: MlMap | null = null;
	let ready = $state(false);

	// Rounded-square stop markers, baked per visual state in the current route
	// colour (re-baked each draw so a route/theme change recolours them).
	function bakeStopIcons(color: string, dim: string) {
		if (!map) return;
		setSquareIcon(map, 'rstop-normal', { fill: '#ffffff', stroke: color, size: STOP_SIZE.normal });
		setSquareIcon(map, 'rstop-active', { fill: color, stroke: color, size: STOP_SIZE.active });
		setSquareIcon(map, 'rstop-passed', { fill: dim, stroke: dim, size: STOP_SIZE.normal });
	}

	function draw() {
		if (!map) return;
		const color = toHex(routeColor(route));
		const dim = dimColor();
		bakeStopIcons(color, dim);

		const lineData = routeLineFC(route, activeStop);
		const stopData = routeStopFC(route, activeStop);

		const lineSrc = map.getSource('route-line') as GeoJSONSource | undefined;
		const stopSrc = map.getSource('route-stops') as GeoJSONSource | undefined;
		if (lineSrc) lineSrc.setData(lineData);
		if (stopSrc) stopSrc.setData(stopData);

		if (!lineSrc) {
			map.addSource('route-line', { type: 'geojson', data: lineData });
			map.addSource('route-stops', { type: 'geojson', data: stopData });

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
				paint: {
					'line-color': ['get', 'color'],
					'line-width': 4,
					'line-opacity': ['case', ['get', 'passed'], 0.55, 1]
				}
			});
			if (arrows) {
				ensureArrowImage(map);
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
					},
					paint: { 'icon-opacity': ['case', ['get', 'passed'], 0.4, 1] }
				});
			}
			map.addLayer({
				id: 'stop-squares',
				type: 'symbol',
				source: 'route-stops',
				layout: {
					'icon-image': [
						'case',
						['get', 'active'],
						'rstop-active',
						['get', 'passed'],
						'rstop-passed',
						'rstop-normal'
					],
					'icon-allow-overlap': true,
					'icon-ignore-placement': true
				},
				paint: { 'icon-opacity': ['case', ['get', 'passed'], 0.6, 1] }
			});
			map.addLayer({
				id: 'stop-labels',
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
		}

		const line = routeLine(route);
		if (line.length) {
			const lngs = line.map((p) => p[0]);
			const lats = line.map((p) => p[1]);
			const h = map.getContainer().clientHeight || 0;
			const padding = fillBottom
				? { top: 44, bottom: Math.round(h * 0.45), left: 40, right: 40 }
				: { top: 48, bottom: 48, left: 48, right: 48 };
			map.fitBounds(
				[
					[Math.min(...lngs), Math.min(...lats)],
					[Math.max(...lngs), Math.max(...lats)]
				],
				{ padding, maxZoom: 16, duration: ready ? 600 : 0 }
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
			center: NUS_CENTER,
			zoom: 13.5,
			attributionControl: false
		});
		map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
		map.on('load', () => {
			ready = true;
			draw();
		});

		// Re-skin the basemap (and re-add our layers) when the app theme flips.
		themeObs = new MutationObserver(() => {
			if (!map) return;
			map.setStyle(styleUrl());
			map.once('styledata', () => draw());
		});
		themeObs.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		});
	});

	$effect(() => {
		if (ready && route) draw();
	});

	onDestroy(() => {
		themeObs?.disconnect();
		map?.remove();
	});
</script>

<div bind:this={container} class="h-full w-full"></div>
