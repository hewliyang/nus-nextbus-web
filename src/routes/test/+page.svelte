<script lang="ts">
	import DecoratedBusRoute from '$lib/components/DecoratedBusRoute.svelte';
	import routes from '$lib/data/routes.json';
</script>

<DecoratedBusRoute stops={routes['D2']} curStopCode="S17" route="D2" />
