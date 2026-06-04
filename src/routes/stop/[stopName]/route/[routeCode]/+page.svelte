<script lang="ts">
	import type { PageData } from './$types';
	import { routes } from '$lib/data';
	import RouteTimeline from '$lib/components/RouteTimeline.svelte';
	import RouteMap from '$lib/components/RouteMap.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { routeColor, routeTextColor, stopCoord } from '$lib/routes';

	export let data: PageData;

	const stopName = data.stopName;
	const routeCode = data.routeCode;
	const stops = routes[routeCode] ?? [];
	const caption = stopCoord(stopName)?.caption ?? stopName;
</script>

<section class="fade-up space-y-4">
	<div class="flex items-center justify-between gap-3">
		<a
			href="/stop/{stopName}"
			class="inline-flex items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-ink"
		>
			<Icon name="arrow-left" size={15} /> {caption}
		</a>
		<span
			class="grid h-10 w-10 place-items-center rounded-xl font-mono text-base font-bold shadow-card"
			style="background: {routeColor(routeCode)}; color: {routeTextColor(routeCode)}"
		>
			{routeCode}
		</span>
	</div>

	<div class="overflow-hidden rounded-2xl border border-border shadow-card">
		<div class="h-72 w-full">
			<RouteMap route={routeCode} activeStop={stopName} />
		</div>
	</div>

	<div class="rounded-2xl border border-border bg-bg p-3">
		<RouteTimeline {stops} route={routeCode} current={stopName} />
	</div>
</section>
