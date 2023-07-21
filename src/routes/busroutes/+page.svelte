<script lang="ts">
	import BusRoute from '../../components/BusRoute.svelte';
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
	<!-- <input
		class="input input-sm input-bordered w-full"
		placeholder="Search for routes that include X stop"
		bind:value={searchQuery}
	/> -->
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
	<div
		class="border bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 rounded px-4 py-2"
	>
		<BusRoute bind:stops />
	</div>
</div>
