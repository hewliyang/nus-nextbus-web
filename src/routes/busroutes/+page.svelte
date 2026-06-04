<script lang="ts">
	import RouteTimeline from '$lib/components/RouteTimeline.svelte';
	import RouteMap from '$lib/components/RouteMap.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { routes } from '$lib/data';
	import { routeColor, routeTextColor } from '$lib/routes';

	const keys = Object.keys(routes);
	let selectedRoute = 'D2';
	$: stops = routes[selectedRoute];
</script>

<section class="fade-up space-y-4">
	<div class="flex flex-wrap gap-2">
		{#each keys as key}
			{@const active = key === selectedRoute}
			<button
				on:click={() => (selectedRoute = key)}
				class="rounded-full px-3.5 py-1.5 font-mono text-sm font-bold transition-all
					{active ? 'shadow-card' : 'border border-border bg-surface text-ink-soft hover:bg-surface-2'}"
				style={active ? `background: ${routeColor(key)}; color: ${routeTextColor(key)}` : ''}
			>
				{key}
			</button>
		{/each}
	</div>

	<div class="overflow-hidden rounded-2xl border border-border shadow-card">
		<div class="h-72 w-full">
			{#key selectedRoute}
				<RouteMap route={selectedRoute} />
			{/key}
		</div>
	</div>

	<div class="flex items-center justify-between px-1">
		<h2 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
			<Icon name="map" size={13} />
			{stops.length} stops
		</h2>
		<span class="flex items-center gap-1.5 text-xs font-medium text-muted">
			<span class="h-2.5 w-2.5 rounded-full" style="background: {routeColor(selectedRoute)}" />
			Line {selectedRoute}
		</span>
	</div>

	<div class="rounded-2xl border border-border bg-bg p-3">
		<RouteTimeline {stops} route={selectedRoute} />
	</div>
</section>
