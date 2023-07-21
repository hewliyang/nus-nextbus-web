<script lang="ts">
	import type { PageData } from './$types';
	import routes from '$lib/data/routes.json';
	import DecoratedBusRoute from '../../../../../components/DecoratedBusRoute.svelte';
	import { page } from '$app/stores';

	export let data: PageData;

	type Stop = {
		seq: number;
		stop_name: string;
		busstopcode: string;
	};

	const routes2: { [key: string]: Stop[] } = routes;
	const stopName: string = data.stopName;
	const routeCode: string = data.routeCode;
</script>

<DecoratedBusRoute stops={routes2[routeCode]} curStopCode={stopName} route={routeCode} />

<a class="mt-1 btn btn-outline btn-error mb-5" href="/stop/{stopName}"> Back </a>
