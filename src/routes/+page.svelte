<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { stops } from '$lib/data';
	import { nearestStops } from '$lib/geo';
	import { NUS_CENTER } from '$lib/routes';
	import Icon from '$lib/components/Icon.svelte';
	import NearbyMap from '$lib/components/NearbyMap.svelte';
	import RouteMap from '$lib/components/RouteMap.svelte';
	import Segmented from '$lib/components/Segmented.svelte';
	import Snackbar from '$lib/components/Snackbar.svelte';
	import StopCard from '$lib/components/StopCard.svelte';
	import RoutesView from '$lib/components/RoutesView.svelte';

	type LocationStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable';

	// view + selected route are URL-driven: deep-linkable, and survive in-place
	// navigation from a card's route badge (/?view=routes&route=D2).
	const view = $derived($page.url.searchParams.get('view') === 'routes' ? 'routes' : 'stops');
	const selectedRoute = $derived($page.url.searchParams.get('route') ?? 'D2');

	const navOpts = { replaceState: true, noScroll: true, keepFocus: true };
	function setView(v: string) {
		const u = new URL($page.url);
		if (v === 'stops') u.searchParams.delete('view');
		else u.searchParams.set('view', v);
		goto(u, navOpts);
	}
	function setRoute(r: string) {
		const u = new URL($page.url);
		u.searchParams.set('view', 'routes');
		u.searchParams.set('route', r);
		goto(u, navOpts);
	}

	// ── location + nearby (client-only GPS) ──
	// Coords are plain $state; cards self-fetch. Show the nearest few; reveal more
	// on demand with a button (avoids the remount churn an auto-observer caused).
	let userLat = $state(NUS_CENTER[1]);
	let userLng = $state(NUS_CENTER[0]);
	let userReal = $state(false);
	let locStatus = $state<LocationStatus>('idle');
	let limit = $state(3);
	let mounted = $state(false);

	const allNearby = $derived(nearestStops(userLat, userLng, 12));
	const visibleNearby = $derived(allNearby.slice(0, limit));
	const canLoadMore = $derived(limit < allNearby.length);
	const mapStops = $derived(
		allNearby
			.filter((s) => s.distanceM < 700)
			.map((s) => ({ code: s.name, lat: s.latitude, lng: s.longitude }))
	);

	function requestLocation() {
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			locStatus = 'unavailable';
			return;
		}
		locStatus = 'locating';
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				userLat = coords.latitude;
				userLng = coords.longitude;
				userReal = true;
				locStatus = 'granted';
				limit = 3;
			},
			(err) => {
				locStatus = err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable';
			},
			{ enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
		);
	}

	onMount(() => {
		mounted = true;
		// auto-locate only if already granted — never prompt without intent
		if ('permissions' in navigator) {
			navigator.permissions
				.query({ name: 'geolocation' as PermissionName })
				.then((p) => {
					if (p.state === 'granted') requestLocation();
				})
				.catch(() => {});
		}
	});

	// ── search (relabelled "Get Me Somewhere"; lands on /stop/[code]) ──
	// Pure-runes substring search (no legacy store).
	const searchStops = stops.map((s) => ({
		stop: s,
		terms: `${s.caption} ${s.name} ${s.ShortName} ${s.LongName}`.toLowerCase()
	}));
	let searchTerm = $state('');
	const searching = $derived(searchTerm.trim().length > 0);
	const searchResults = $derived(
		searching
			? searchStops.filter((e) => e.terms.includes(searchTerm.toLowerCase())).map((e) => e.stop)
			: []
	);

	const snackText = $derived(
		locStatus === 'denied'
			? 'Location is off — showing campus stops.'
			: locStatus === 'unavailable'
				? 'Location unavailable — showing campus stops.'
				: 'See stops near you.'
	);
	const snackAction = $derived(
		locStatus === 'denied' || locStatus === 'unavailable' ? undefined : 'Enable location'
	);
</script>

<section class="fade-up space-y-4">
	<!-- MAP -->
	<div class="relative h-72 overflow-hidden rounded-2xl border border-border shadow-card">
		{#if view === 'stops'}
			<NearbyMap lat={userLat} lng={userLng} real={userReal} stops={mapStops} />
		{:else}
			<RouteMap route={selectedRoute} arrows />
		{/if}

		{#if view === 'stops' && locStatus !== 'granted'}
			<div class="absolute inset-x-2 bottom-2">
				<Snackbar
					message={snackText}
					actionLabel={snackAction}
					loading={locStatus === 'locating'}
					onAction={requestLocation}
				/>
			</div>
		{/if}
	</div>

	<!-- SEARCH (Stops view only) -->
	{#if view === 'stops'}
		<div class="flex items-center gap-2">
			<div
				class="flex flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 shadow-card focus-within:border-accent"
			>
				<span class="text-muted"><Icon name="search" size={17} /></span>
				<input
					type="search"
					placeholder="Get Me Somewhere"
					bind:value={searchTerm}
					class="w-full bg-transparent py-3 text-[15px] text-ink placeholder:text-muted focus:outline-none"
				/>
			</div>
			<a
				href="/starred"
				class="flex h-[50px] shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-[13px] font-semibold text-ink-soft shadow-card transition-colors hover:bg-surface-2"
			>
				<Icon name="bookmark" size={16} /> Starred
			</a>
		</div>
	{/if}

	<!-- SEGMENTED -->
	<Segmented
		value={view}
		onSelect={setView}
		options={[
			{ value: 'stops', label: 'Stops' },
			{ value: 'routes', label: 'Routes' }
		]}
	/>

	<!-- CONTENT -->
	{#if view === 'stops'}
		{#if searching}
			{#if searchResults.length > 0}
				<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{#each searchResults as stop (stop.name)}
						<li>
							<a
								href="/stop/{stop.name}"
								class="flex h-full items-center rounded-xl border border-border bg-surface px-3.5 py-3 text-[14px] font-medium leading-tight text-ink shadow-card transition-all hover:-translate-y-0.5 hover:border-border-strong"
							>
								{stop.caption}
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="flex flex-col items-center gap-2 py-12 text-center">
					<span class="text-muted"><Icon name="search" size={26} /></span>
					<p class="text-sm font-medium text-ink">No stops match that</p>
				</div>
			{/if}
		{:else}
			<div class="space-y-2.5">
				<h2 class="px-1 text-xs font-semibold uppercase tracking-wide text-muted">Nearby</h2>
				{#if mounted}
					{#each visibleNearby as stop (stop.name)}
						<StopCard code={stop.name} caption={stop.caption} />
					{/each}
					{#if canLoadMore}
						<button
							onclick={() => (limit += 3)}
							class="w-full rounded-xl border border-border bg-surface py-3 text-[13px] font-semibold text-ink-soft shadow-card transition-colors hover:bg-surface-2"
						>
							Show more stops
						</button>
					{/if}
				{:else}
					<div class="py-8 text-center text-sm text-muted">Locating nearby stops…</div>
				{/if}
			</div>
		{/if}
	{:else}
		<RoutesView selected={selectedRoute} onSelect={setRoute} />
	{/if}
</section>
