<script lang="ts">
	import { onDestroy } from "svelte";
	import { createSearchStore, searchHandler } from "../lib/stores/search";
    import type { PageData } from "./$types";
    export let data: PageData;

    type Product = {
        caption: "string"
        name: "string"
        LongName: "string"
        ShortName: "string"
        latitude: "float"
        longitude: "float"
        searchTerms: "string"
    }

    const searchStops: Product[] = data.busStops.busstops.map((stop: Product) => ({
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

<div class="p-5 flex flex-col justify-center items-center">
    <h2 class="text-2xl font-semibold">Where u at</h2>
    <div class="mt-5">
        <ul class="grid grid-cols-3 menu menu-compact bg-gray-300 dark:bg-gray-900 rounded-xl items-center">
            {#each $searchStore.filtered as stop}
            <li>
                <a class="hover:underline hover:border rounded-xl" href="/stop/{stop.name}">{stop.caption}</a>
            </li>
            {/each}
          </ul>
    </div>
</div>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div tabindex="0" class="collapse collapse-plus border border-base-300 bg-base-100 rounded-box rounded-xl">
    <div class="collapse-title text-xl font-medium">
      About
    </div>
    <div class="collapse-content"> 
      <p class="font-semibold text-md">
        Because the NextBus app is way too bloated and slow. I got on the wrong bus because I couldn't 
        check the route in time the other day 😢
      </p>
    </div>
</div>