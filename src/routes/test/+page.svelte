<script lang="ts">
	import RouteTimeline from '$lib/components/RouteTimeline.svelte';
	import { routes } from '$lib/data';
</script>

<RouteTimeline stops={routes['D2']} route="D2" current="S17" />
