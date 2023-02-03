<script lang="ts">
	import { onDestroy } from "svelte";
	import { createSearchStore, searchHandler } from "../lib/stores/search";
    import busStops from "$lib/data/bus_stops.json";

    // export let data: PageData;
    // static import instead because the main page data is static anyways

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

<input type="search" placeholder="Search..." bind:value={$searchStore.search} class="input-md border-2 border-cyan-600 border-solid rounded-lg mt-5">
 

<!-- <pre>{JSON.stringify($searchStore.filtered, null, 2)}</pre> -->

<div class="flex flex-col justify-center items-center mt-3">
    <h2 class="text-2xl font-semibold">Bus Stops</h2>
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