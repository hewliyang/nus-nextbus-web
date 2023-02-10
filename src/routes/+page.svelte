<script lang="ts">
	import { onDestroy } from "svelte";
	import { createSearchStore, searchHandler } from "../lib/stores/search";
    import busStops from "$lib/data/bus_stops.json";
	import { enhance } from "$app/forms";
    import Geolocation from "svelte-geolocation";
    import { page } from "$app/stores";

    type Product = {
        caption: string
        name: string
        LongName: string
        ShortName: string
        latitude: number
        longitude: number
        searchTerms: string
    }

    type Location = {
        latitude?: number
        longitude?: number
    }

    const searchStops: Product[] = busStops.BusStopsResult.busstops.map((stop) => ({
        ...stop,
        searchTerms: `${stop.caption} ${stop.name} ${stop.ShortName} ${stop.LongName}`,
    }));

    const searchStore = createSearchStore(searchStops);

    const unsubscribe = searchStore.subscribe((model) => searchHandler(model))

    onDestroy(() => {
        unsubscribe();
    })

    $: ({ bookmarks } = $page.data)

    let getPosition = false;
    $: $searchStore.sort = getPosition;
    let detail: Location = {};
    $: $searchStore.pos.latitude = detail.latitude;
    $: $searchStore.pos.longitude = detail.longitude;

</script>

{#if bookmarks.length > 0}
    <div class="mt-3 flex flex-col justify-center items-center">
        <h2 class="text-xl font-semibold"> Your Bookmarks </h2>
        <div class="bg-gradient-to-r from-purple-600 via-blue-500 to-orange-400 p-0.5 rounded-lg mt-3">
            <ul class="grid grid-cols-2 bg-base-200 items-center rounded-md p-1">
                {#each bookmarks as fav}
                    <li class="flex flex-row justify-between items-center space-x-6 hover:bg-base-300 hover:border p-2 rounded-xl">
                        <a class="hover:underline text-sm" href="/stop/{fav.name}">{fav.caption}</a>
                        <form action="?/deleteBookmark&id={fav.name}" method="POST" use:enhance>
                            <button class="btn btn-xs btn-square btn-outline" aria-label="delete-bookmark">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </form>
                    </li>
                {/each}
            </ul>
        </div>
    </div>
{/if}


<div class="flex flex-col justify-center items-center mt-3">
    <h2 class="text-2xl font-semibold">Bus Stops</h2>

    <div class="flex items-center mt-5 space-x-2">
        <input type="search" placeholder="Search..." bind:value={$searchStore.search} class="input-md border-2 border-cyan-600 border-solid rounded-lg">
        <button class="btn btn-sm btn-outline btn-round border-orange-600 border-2" aria-label="get-geolocation" on:click={() => (getPosition = true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4C9.24 4 7 6.24 7 9c0 2.85 2.92 7.21 5 9.88c2.11-2.69 5-7 5-9.88c0-2.76-2.24-5-5-5zm0 7.5a2.5 2.5 0 0 1 0-5a2.5 2.5 0 0 1 0 5z" opacity=".3"/><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.21 7 11.85 7 9z"/><circle cx="12" cy="9" r="2.5" fill="currentColor"/></svg>
        </button>
    </div>

    <Geolocation
        getPosition = {getPosition}
        on:position = {(e) => {
            detail = {
                latitude: e.detail.coords.latitude,
                longitude: e.detail.coords.longitude
            };
        }}
    />

    <div class="my-5 ">
        <ul class="grid grid-cols-3 menu menu-compact bg-base-300 dark:bg-gray-900 rounded-xl items-center p-2">
            {#each $searchStore.filtered as stop}
            <li>
                <a class="hover:underline hover:border" href="/stop/{stop.name}">{stop.caption}</a>
            </li>
            {/each}
          </ul>
    </div>
</div>
