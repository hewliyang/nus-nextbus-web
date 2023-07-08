<script lang="ts">
	import BusRoute from '../../components/BusRoute.svelte';
	import routes from '$lib/data/routes.json';

    type Stop = {
		seq: number;
		stop_name: string;
		busstopcode: string;
	};

    let routesWithType: Record<string, Stop[]> = routes
	let stops: Stop[] = [];
    let selectedRoute = 'D2';
	const keys = Object.keys(routes);
    $: data = routesWithType[selectedRoute]

</script>

<div class="flex flex-col items-center space-y-4">
	<h1 class="text-2xl font-bold">Routes</h1>

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

	<h3 class="text-xl font-bold">{selectedRoute}</h3>
	<!-- <pre>{JSON.stringify(stops, null, 2)}</pre> -->
	<BusRoute bind:stops={data} />
    
</div>
