<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { routeColor, routeStops, routeLine, NUS_CENTER } from '$lib/routes';
	import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';

	interface Props {
		route: string;
		activeStop?: string | null;
	}

	let { route, activeStop = null }: Props = $props();

	let container: HTMLDivElement;
	let map: MlMap | null = null;
	let ready = $state(false);

	function toHex(color: string): string {
		const c = document.createElement('canvas');
		c.width = c.height = 1;
		const ctx = c.getContext('2d');
		if (!ctx) return '#5566c4';
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, 1, 1);
		const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
		return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
	}

	function isDark() {
		return document.documentElement.getAttribute('data-theme') === 'dark';
	}

	function dimColor() {
		const v = getComputedStyle(document.documentElement)
			.getPropertyValue('--border-strong')
			.trim();
		return v ? toHex(v) : '#b8bcc8';
	}

	function draw() {
		if (!map) return;
		const color = toHex(routeColor(route));
		const dim = dimColor();
		const line = routeLine(route);
		const stops = routeStops(route);

		const activeIdx = activeStop ? stops.findIndex((s) => s.code === activeStop) : -1;

		const lineFeatures =
			activeIdx > 0
				? [
						{
							type: 'Feature' as const,
							properties: { color: dim, passed: true },
							geometry: {
								type: 'LineString' as const,
								coordinates: line.slice(0, activeIdx + 1)
							}
						},
						{
							type: 'Feature' as const,
							properties: { color, passed: false },
							geometry: {
								type: 'LineString' as const,
								coordinates: line.slice(activeIdx)
							}
						}
					]
				: [
						{
							type: 'Feature' as const,
							properties: { color, passed: false },
							geometry: { type: 'LineString' as const, coordinates: line }
						}
					];
		const lineData = {
			type: 'FeatureCollection' as const,
			features: lineFeatures
		};
		const stopData = {
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
			map.addLayer({
				id: 'stop-dots',
				type: 'circle',
				source: 'route-stops',
				paint: {
					'circle-radius': ['case', ['get', 'active'], 8, 5],
					'circle-color': [
						'case',
						['get', 'active'],
						color,
						['get', 'passed'],
						dim,
						'#ffffff'
					],
					'circle-stroke-color': ['case', ['get', 'passed'], dim, color],
					'circle-stroke-width': 2.5,
					'circle-opacity': ['case', ['get', 'passed'], 0.6, 1],
					'circle-stroke-opacity': ['case', ['get', 'passed'], 0.6, 1]
				}
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
				paint: {
					'text-color': isDark() ? '#e6e7ee' : '#2a2d3a',
					'text-halo-color': isDark() ? '#1b1c24' : '#ffffff',
					'text-halo-width': 1.5
				}
			});
		} else {
			map.setPaintProperty('route-path', 'line-color', ['get', 'color']);
			map.setPaintProperty('route-path', 'line-opacity', [
				'case',
				['get', 'passed'],
				0.55,
				1
			]);
			map.setPaintProperty('stop-dots', 'circle-stroke-color', [
				'case',
				['get', 'passed'],
				dim,
				color
			]);
			map.setPaintProperty('stop-dots', 'circle-color', [
				'case',
				['get', 'active'],
				color,
				['get', 'passed'],
				dim,
				'#ffffff'
			]);
			map.setPaintProperty('stop-dots', 'circle-opacity', [
				'case',
				['get', 'passed'],
				0.6,
				1
			]);
			map.setPaintProperty('stop-dots', 'circle-stroke-opacity', [
				'case',
				['get', 'passed'],
				0.6,
				1
			]);
		}

		if (line.length) {
			const lngs = line.map((p) => p[0]);
			const lats = line.map((p) => p[1]);
			map.fitBounds(
				[
					[Math.min(...lngs), Math.min(...lats)],
					[Math.max(...lngs), Math.max(...lats)]
				],
				{ padding: 48, maxZoom: 16, duration: ready ? 600 : 0 }
			);
		}
	}

	onMount(async () => {
		const maplibregl = (await import('maplibre-gl')).default;
		await import('maplibre-gl/dist/maplibre-gl.css');
		const style = getComputedStyle(document.documentElement)
			.getPropertyValue('--map-style')
			.trim()
			.replace(/^['"]|['"]$/g, '');

		map = new maplibregl.Map({
			container,
			style,
			center: NUS_CENTER,
			zoom: 13.5,
			attributionControl: false
		});
		map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
		map.on('load', () => {
			ready = true;
			draw();
		});
	});

	$effect(() => {
		if (ready && route) draw();
	});

	onDestroy(() => map?.remove());
</script>

<div bind:this={container} class="h-full w-full"></div>
