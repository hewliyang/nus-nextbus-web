<script lang="ts">
	import busStops from '$lib/data/stops.json';
	import Geolocation from 'svelte-geolocation';
	import Icons from '$lib/icons';
	import { onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { createSearchStore, searchHandler } from '../lib/stores/search';

	type Stop = {
		caption: string;
		name: string;
		LongName: string;
		ShortName: string;
		latitude: number;
		longitude: number;
		searchTerms: string;
	};

	type Location = {
		latitude?: number;
		longitude?: number;
	};

	const searchStops: Stop[] = busStops.map((stop) => ({
		...stop,
		searchTerms: `${stop.caption} ${stop.name} ${stop.ShortName} ${stop.LongName}`
	}));

	const searchStore = createSearchStore(searchStops);

	const unsubscribe = searchStore.subscribe((model) => searchHandler(model));

	onDestroy(() => {
		unsubscribe();
	});

	$: ({ bookmarks, alert } = $page.data);

	let getPosition = false;
	let detail: Location = {};

	$: $searchStore.sort = getPosition;
	$: $searchStore.pos.latitude = detail.latitude;
	$: $searchStore.pos.longitude = detail.longitude;
</script>

{#if bookmarks.length === 0 && alert}
	<div class="alert alert-info text-sm">
		<div class="flex-1 justify-between">
			<div class="flex gap-2 items-center">
				<Icons.info />
				<span class="font-bold">Be sure to bookmark🔖 your frequent stops for easy access!</span>
			</div>
			<form action="?/closeAlert" method="POST" use:enhance>
				<button class="btn btn-outline btn-sm">X</button>
			</form>
		</div>
	</div>
{/if}

{#if bookmarks.length > 0}
	<div class="flex flex-col justify-center items-center rounded shadow-xl">
		<h2 class="text-2xl font-semibold tracking-tight">Bookmarks 🔖</h2>
		<div class="bg-gradient-to-r from-purple-600 via-blue-500 to-orange-400 p-0.5 rounded mt-3">
			<ul
				class={`grid ${
					bookmarks.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
				} bg-neutral-50 dark:bg-neutral-800 items-center rounded p-1`}
			>
				{#each bookmarks as fav}
					<li
						class="flex flex-row justify-between items-center space-x-6 hover:bg-base-300 hover:border p-2 rounded-xl"
					>
						<a class="hover:underline text-sm w-full" href="/stop/{fav.name}">{fav.caption}</a>
						<form action="?/deleteBookmark&id={fav.name}" method="POST" use:enhance>
							<button
								class="btn btn-xs btn-outline btn-square btn-error"
								aria-label="delete-bookmark"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/></svg
								>
							</button>
						</form>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

<div class="flex flex-col justify-center items-center mt-5">
	<h2 class="text-2xl font-semibold tracking-tight">Stops 🚏</h2>

	<div class="flex items-center mt-3 space-x-2">
		<input
			type="search"
			placeholder="Search..."
			bind:value={$searchStore.search}
			class="input input-sm input-bordered w-full"
		/>
		<button
			class="btn btn-outline btn-xs"
			aria-label="get-geolocation"
			on:click={() => (getPosition = true)}
		>
			<Icons.location />
		</button>
	</div>

	<Geolocation
		{getPosition}
		on:position={(e) => {
			detail = {
				latitude: e.detail.coords.latitude,
				longitude: e.detail.coords.longitude
			};
		}}
	/>

	{#if $searchStore.filtered.length > 0}
		<div class="my-5 shadow-lg">
			<ul
				class="grid grid-cols-3 menu menu-compact bg-neutral-50 dark:bg-neutral-800 rounded items-center p-2 border border-neutral-200 dark:border-neutral-700"
			>
				{#each $searchStore.filtered as stop}
					<li>
						<a class="hover:underline hover:border" href="/stop/{stop.name}">{stop.caption}</a>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div class="flex flex-col p-16 space-y-8 items-center">
			<p class="text-3xl">😅</p>
			<p class="font-semibold">No results leh!</p>
		</div>
	{/if}
</div>
