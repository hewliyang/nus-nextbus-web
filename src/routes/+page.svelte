<script lang="ts">
	import { onDestroy } from "svelte";
	import { createSearchStore, searchHandler } from "../lib/stores/search";
    import busStops from "$lib/data/bus_stops.json";
	import type { PageData } from "./$types";
	import { enhance, type SubmitFunction } from "$app/forms";

    // prerender stored cookie data
    export let data: PageData;

    type Product = {
        caption: string
        name: string
        LongName: string
        ShortName: string
        latitude: number
        longitude: number
        searchTerms: string
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

    $: ({ bookmarks } = data)

</script>

<div class="flex justify-end text-xs">
    <p>Made by <a class="font-semibold text-cyan-500 hover:text-red-400" href="https://github.com/hewliyang">@hewliyang</a></p>
</div>

<div class="alert alert-warning shadow-lg rounded-xl mt-3 md:justify-center">
    <div>
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      <span>Still a <b>WIP</b>, but usable</span>
    </div>
</div>

{#if bookmarks.length > 0}
    <div class="mt-3 flex flex-col justify-center items-center">
        <h2 class="text-xl font-semibold"> Your Bookmarks </h2>
        <ul class="grid grid-cols-2 bg-base-200 mt-3 items-center px-2 py-1 rounded-xl">
            {#each bookmarks as fav}
                <li class="flex flex-row justify-between items-center space-x-6 mb-2 mt-2 hover:bg-base-300 hover:border p-2 rounded-xl">
                    <a class="hover:underline text-sm" href="/stop/{fav.name}" data-sveltekit-reload>{fav.caption}</a>
                    <form action="?/deleteBookmark&id={fav.name}" method="POST" use:enhance>
                        <button class="btn btn-xs btn-square btn-outline">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </form>
                </li>
            {/each}
        </ul>
    </div>
{/if}


<div class="flex flex-col justify-center items-center mt-3">
    <h2 class="text-2xl font-semibold">Bus Stops</h2>

    <input type="search" placeholder="Search..." bind:value={$searchStore.search} class="input-md border-2 border-cyan-600 border-solid rounded-lg mt-5">
 
    <div class="mt-5">
        <ul class="grid grid-cols-3 menu menu-compact bg-base-300 dark:bg-gray-900 rounded-xl items-center p-2">
            {#each $searchStore.filtered as stop}
            <li>
                <a class="hover:underline hover:border" href="/stop/{stop.name}" data-sveltekit-reload>{stop.caption}</a>
            </li>
            {/each}
          </ul>
    </div>
</div>