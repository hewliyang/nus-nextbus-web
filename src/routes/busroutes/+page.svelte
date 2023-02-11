<script lang="ts">
    import BusRoute from "../../components/BusRoute.svelte";
    import routes from "$lib/data/routes.json";
</script>

<h1 class="text-2xl font-bold mb-5">Routes</h1>

{#each Object.entries(routes) as [key, value]}
    <h2 class="text-xl font-semibold underline" id="{key}"> {key} </h2>
    <BusRoute stops={value}/>
{/each}