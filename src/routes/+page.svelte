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

<div class="flex flex-col items-center">
    <p>Made by <a class="font-semibold text-cyan-500 hover:text-red-400" href="https://github.com/hewliyang">@hewliyang</a></p>
</div>

<div class="flex justify-center">
    <input type="search" placeholder="Search..." bind:value={$searchStore.search} class="input-md border-2 border-cyan-600 border-solid rounded-lg mt-10">
</div>  

<!-- <pre>{JSON.stringify($searchStore.filtered, null, 2)}</pre> -->

<div class="p-5">
    <h2 class="text-2xl font-semibold flex justify-center">Where u at</h2>

    <div class="flex justify-center ml-5 mt-5">
        <ul class="list-disc">
            {#each $searchStore.filtered as stop}
            <li>
                <a class="hover:underline" href="/stop/{stop.name}">{stop.caption}</a>
            </li>
            {/each}
        </ul>
    </div>
</div>
