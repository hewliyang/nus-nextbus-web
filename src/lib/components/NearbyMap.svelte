<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { NUS_CENTER } from '$lib/routes';
	import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';

	interface MarkerStop {
		code: string;
		lat: number;
		lng: number;
	}
	interface Props {
		lat: number;
		lng: number;
		real?: boolean;
		stops?: MarkerStop[];
	}
	let { lat, lng, real = false, stops = [] }: Props = $props();

	let container: HTMLDivElement;
	let map: MlMap | null = null;
	let ready = $state(false);

	const STOP_COLOR = '#0d9488'; // teal — distinct from the blue user dot
	const USER_COLOR = '#2f6df6';

	function userData() {
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
	function stopData() {
		return {
			type: 'FeatureCollection' as const,
			features: stops.map((s) => ({
				type: 'Feature' as const,
				properties: { code: s.code },
				geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] as [number, number] }
			}))
		};
	}

	// ~450m box around centre → roughly the 5-min-walk radius from the wireframe.
	// Heavy bottom padding keeps the user + nearby stops in the upper (visible)
	// half of the map, above the bottom sheet that overlays it.
	function fit() {
		if (!map) return;
		const dLat = 450 / 111_000;
		const dLng = 450 / (111_000 * Math.cos((lat * Math.PI) / 180));
		const h = map.getContainer().clientHeight || 0;
		map.fitBounds(
			[
				[lng - dLng, lat - dLat],
				[lng + dLng, lat + dLat]
			],
			{
				padding: { top: 36, bottom: Math.round(h * 0.5), left: 32, right: 32 },
				maxZoom: 17,
				duration: ready ? 500 : 0
			}
		);
	}

	function draw() {
		if (!map) return;
		const uSrc = map.getSource('user') as GeoJSONSource | undefined;
		const sSrc = map.getSource('nearby-stops') as GeoJSONSource | undefined;
		if (uSrc) uSrc.setData(userData());
		if (sSrc) sSrc.setData(stopData());

		if (!sSrc) {
			map.addSource('nearby-stops', { type: 'geojson', data: stopData() });
			map.addSource('user', { type: 'geojson', data: userData() });

			map.addLayer({
				id: 'nearby-stop-dots',
				type: 'circle',
				source: 'nearby-stops',
				paint: {
					'circle-radius': 6,
					'circle-color': STOP_COLOR,
					'circle-stroke-color': '#ffffff',
					'circle-stroke-width': 2
				}
			});
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
		}
		fit();
	}

	function styleUrl() {
		return getComputedStyle(document.documentElement)
			.getPropertyValue('--map-style')
			.trim()
			.replace(/^['"]|['"]$/g, '');
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
		// redraw when the fix or the marker set changes
		void lat;
		void lng;
		void real;
		void stops;
		if (ready) draw();
	});

	onDestroy(() => {
		themeObs?.disconnect();
		map?.remove();
	});
</script>

<div bind:this={container} class="h-full w-full"></div>
