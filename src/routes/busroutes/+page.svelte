<script lang="ts">
	import BusRoute from '$lib/components/BusRoute.svelte';
	import routes from '$lib/data/routes.json';

	type Stop = {
		seq: number;
		stop_name: string;
		busstopcode: string;
	};

	let routesWithType: Record<string, Stop[]> = routes;
	let selectedRoute = 'D2';
	const keys = Object.keys(routes);
	$: stops = routesWithType[selectedRoute];
</script>

<div class="flex flex-col items-center space-y-4 mb-4">
	<h1 class="text-2xl font-semibold">Routes</h1>
	<div class="btn-group">
		{#each keys as key}
			<input
				type="radio"
				name="options"
				data-title={key}
				value={key}
				class="btn btn-sm md:btn-md"
				bind:group={selectedRoute}
			/>
		{/each}
	</div>
	<BusRoute bind:stops />
</div>
