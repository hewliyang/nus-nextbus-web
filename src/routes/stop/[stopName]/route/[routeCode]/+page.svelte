<script lang="ts">
	import type { PageData } from './$types';
	import routes from '$lib/data/routes.json';
	import DecoratedBusRoute from '../../../../../components/DecoratedBusRoute.svelte';

	export let data: PageData;

	type Stop = {
		seq: number;
		stop_name: string;
		busstopcode: string;
	};

	const routes2: { [key: string]: Stop[] } = routes; // typescript
	const stopName: string = data.stopName;
	const routeCode: string = data.routeCode;
</script>

<div class="flex flex-col py-4 space-y-4 items-center justify-center">
	<DecoratedBusRoute stops={routes2[routeCode]} curStopCode={stopName} route={routeCode} />

	<a class="mt-1 btn btn-outline btn-error mb-5" href="/stop/{stopName}"> Back </a>
</div>
