<script lang="ts">
	import { stops } from '$lib/data';
	import Icon from '$lib/components/Icon.svelte';
	import { onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { createSearchStore, searchHandler, type GeoPosition } from '$lib/stores/search';
	import type { SearchStopWithTerms } from '$lib/types';

	const searchStops: SearchStopWithTerms[] = stops.map((stop) => ({
		...stop,
		searchTerms: `${stop.caption} ${stop.name} ${stop.ShortName} ${stop.LongName}`
	}));

	const searchStore = createSearchStore(searchStops);
	const unsubscribe = searchStore.subscribe((model) => searchHandler(model));
	onDestroy(unsubscribe);

	$: ({ bookmarks, alert } = $page.data);

	let getPosition = false;
	let locating = false;
	let detail: GeoPosition = {};

	$: $searchStore.sort = getPosition;
	$: $searchStore.pos.latitude = detail.latitude;
	$: $searchStore.pos.longitude = detail.longitude;

	function locate() {
		if (!navigator.geolocation) return;
		getPosition = true;
		locating = true;
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				detail = { latitude: coords.latitude, longitude: coords.longitude };
				locating = false;
			},
			() => {
				locating = false;
				getPosition = false;
			},
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
		);
	}
</script>

<section class="fade-up space-y-6">
	{#if bookmarks.length === 0 && alert}
		<div
			role="status"
			class="flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent-soft px-4 py-3"
		>
			<span class="mt-0.5 text-accent"><Icon name="bookmark" size={18} /></span>
			<p class="flex-1 text-[13px] leading-snug text-ink-soft">
				Bookmark your frequent stops to pin them to the top for quick access.
			</p>
			<form action="?/closeAlert" method="POST" use:enhance>
				<button
					class="-mr-1 -mt-1 grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
					aria-label="Dismiss"
				>
					<Icon name="x" size={15} />
				</button>
			</form>
		</div>
	{/if}

	{#if bookmarks.length > 0}
		<div class="space-y-2.5">
			<h2 class="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
				<Icon name="bookmark-fill" size={13} /> Saved stops
			</h2>
			<ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{#each bookmarks as fav}
					<li
						class="group flex items-center justify-between gap-2 rounded-xl border border-border bg-surface pl-3.5 pr-1.5 shadow-card transition-colors hover:border-border-strong"
					>
						<a href="/stop/{fav.name}" class="flex-1 py-3 text-[15px] font-medium text-ink">
							{fav.caption}
						</a>
						<form action="?/deleteBookmark&id={fav.name}" method="POST" use:enhance>
							<button
								class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-bad/10 hover:text-bad"
								aria-label="Remove bookmark"
							>
								<Icon name="x" size={16} />
							</button>
						</form>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="space-y-3">
		<div class="flex items-center gap-2">
			<div
				class="flex flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 shadow-card focus-within:border-accent"
			>
				<span class="text-muted"><Icon name="search" size={17} /></span>
				<input
					type="search"
					placeholder="Search stops"
					bind:value={$searchStore.search}
					class="w-full bg-transparent py-3 text-[15px] text-ink placeholder:text-muted focus:outline-none"
				/>
			</div>
			<button
				class="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-xl border shadow-card transition-colors
					{getPosition
					? 'border-accent bg-accent text-accent-fg'
					: 'border-border bg-surface text-ink-soft hover:bg-surface-2'}"
				aria-label="Sort by nearest"
				on:click={locate}
			>
				<Icon name="crosshair" size={18} />
			</button>
		</div>

		{#if locating}
			<p class="px-1 text-xs font-medium text-muted">Finding your location…</p>
		{:else if getPosition && detail.latitude}
			<p class="px-1 text-xs font-medium text-accent">Sorted by distance from you</p>
		{/if}

		{#if $searchStore.filtered.length > 0}
			<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each $searchStore.filtered as stop, i}
					<li>
						<a
							href="/stop/{stop.name}"
							class="flex h-full items-center justify-between gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-3 text-[14px] font-medium leading-tight text-ink shadow-card transition-all hover:-translate-y-0.5 hover:border-border-strong"
						>
							<span>{stop.caption}</span>
							{#if getPosition && detail.latitude && i === 0}
								<span class="text-accent"><Icon name="pin" size={14} /></span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<div class="flex flex-col items-center gap-2 py-16 text-center">
				<span class="text-muted"><Icon name="search" size={28} /></span>
				<p class="text-sm font-medium text-ink">No stops match that</p>
				<p class="text-xs text-muted">Try a shorter or different term.</p>
			</div>
		{/if}
	</div>
</section>
