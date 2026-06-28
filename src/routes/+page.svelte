<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { stops } from '$lib/data';
	import { nearestStops } from '$lib/geo';
	import { NUS_CENTER, routeKeysSorted } from '$lib/routes';
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
	const rawRoute = $derived($page.url.searchParams.get('route'));
	const selectedRoute = $derived(rawRoute && routeKeysSorted.includes(rawRoute) ? rawRoute : 'D2');

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
		if ('permissions' in navigator) {
			navigator.permissions
				.query({ name: 'geolocation' as PermissionName })
				.then((p) => {
					if (p.state === 'granted') requestLocation();
				})
				.catch(() => {});
		}
	});

	// ── bottom sheet: drag the grabber between a peek and an expanded snap
	//    point, or tap / press Enter to toggle. `moved` suppresses the click
	//    that a real drag would otherwise also fire. ──
	const PEEK = 48;
	const EXPANDED = 90;
	let sheetH = $state(PEEK); // height as % of the viewport
	let dragging = $state(false);
	let moved = false;
	let startY = 0;
	let startH = PEEK;
	function grabDown(e: PointerEvent) {
		dragging = true;
		moved = false;
		startY = e.clientY;
		startH = sheetH;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function grabMove(e: PointerEvent) {
		if (!dragging) return;
		if (Math.abs(e.clientY - startY) > 4) moved = true;
		const dvh = ((startY - e.clientY) / window.innerHeight) * 100;
		sheetH = Math.min(92, Math.max(34, startH + dvh));
	}
	function grabEnd(e: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		if (moved) sheetH = sheetH > 64 ? EXPANDED : PEEK; // snap
		(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
	}
	// tap / keyboard activation (no drag) toggles between the two snap points
	function toggleSheet() {
		if (moved) {
			moved = false;
			return;
		}
		sheetH = sheetH > 64 ? PEEK : EXPANDED;
	}

	// ── search (pure-runes substring; lands on /stop/[code]) ──
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

<div class="relative h-full w-full">
	<!-- MAP background (full-bleed) -->
	<div class="absolute inset-0">
		{#if view === 'stops'}
			<NearbyMap lat={userLat} lng={userLng} real={userReal} stops={mapStops} />
		{:else}
			<RouteMap route={selectedRoute} arrows fillBottom />
		{/if}
	</div>

	<!-- location snackbar floats just above the sheet -->
	{#if view === 'stops' && locStatus !== 'granted'}
		<div class="absolute inset-x-3 z-20" style="bottom: min(calc({sheetH}% + 0.75rem), 72%)">
			<Snackbar
				message={snackText}
				actionLabel={snackAction}
				loading={locStatus === 'locating'}
				onAction={requestLocation}
			/>
		</div>
	{/if}

	<!-- BOTTOM SHEET (drawer over the map) -->
	<div
		class="absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-3xl border-t border-border bg-bg shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.3)] {dragging
			? ''
			: 'transition-[height] duration-300 ease-out'}"
		style="height: {sheetH}%"
	>
		<button
			type="button"
			class="flex w-full shrink-0 cursor-grab touch-none justify-center pb-1.5 pt-3 active:cursor-grabbing"
			onpointerdown={grabDown}
			onpointermove={grabMove}
			onpointerup={grabEnd}
			onpointercancel={grabEnd}
			onclick={toggleSheet}
			aria-label="Expand or collapse the panel"
		>
			<span class="h-1.5 w-10 rounded-full bg-border-strong"></span>
		</button>

		<div
			class="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
		>
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
							aria-label="Search stops"
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
		</div>
	</div>
</div>
