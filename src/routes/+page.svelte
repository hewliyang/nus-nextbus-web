<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { stops } from '$lib/data';
	import { nearestStops } from '$lib/geo';
	import { getDistance } from '$lib/stores/utils';
	import { setPref } from '$lib/prefs';
	import type { LocPref } from '$lib/parse';
	import {
		NUS_CENTER,
		routeKeysSorted,
		routesServingStop,
		routeColor,
		routeTextColor
	} from '$lib/routes';
	import Icon from '$lib/components/Icon.svelte';
	import HomeMap from '$lib/components/HomeMap.svelte';
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

	// The crosshair cursor: wherever the map centre settles. The Nearby list
	// ranks around it, so panning the map re-ranks the drawer. Granting location
	// refits the map around the user; that fit's moveend updates the cursor.
	let cursorLat = $state(NUS_CENTER[1]);
	let cursorLng = $state(NUS_CENTER[0]);
	let homeMap: HomeMap | undefined = $state();

	// Recentre button: with a fix, re-frame on it (the fit's moveend pulls the
	// cursor back to the user); without one, ask for location first — the grant
	// path already recentres via the lat/lng-tracking effect in HomeMap.
	function recenterOnUser() {
		if (userReal) homeMap?.recenter();
		else requestLocation();
	}

	const allNearby = $derived(nearestStops(cursorLat, cursorLng, 12));
	const visibleNearby = $derived(allNearby.slice(0, limit));
	const canLoadMore = $derived(limit < allNearby.length);

	// Heading flips to "Near map centre" once the cursor has drifted >150 m from
	// its anchor — the user's real fix, or the campus-centre default before any
	// GPS grant (panning without location must not keep claiming "Nearby").
	const cursorAdrift = $derived(
		getDistance(
			cursorLat,
			cursorLng,
			userReal ? userLat : NUS_CENTER[1],
			userReal ? userLng : NUS_CENTER[0]
		) > 150
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
				// The successful choice survives the session: next visit auto-locates.
				setPref('locpref', 'on');
			},
			(err) => {
				locStatus = err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable';
			},
			{ enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
		);
	}

	// The saved location decision ('on' | 'off' | 'hide' | null) plus a local
	// override so dismissing the banner hides it without waiting on a reload.
	const locPref = $derived($page.data.locPref as LocPref);
	let bannerHidden = $state(false);
	const showBanner = $derived(
		!bannerHidden && locPref !== 'hide' && locPref !== 'off' && locStatus !== 'granted'
	);
	function dismissBanner() {
		bannerHidden = true;
		setPref('locpref', 'hide');
	}

	onMount(() => {
		mounted = true;
		if (locPref === 'off') return; // the user said no — don't auto-locate
		if (locPref === 'on') {
			requestLocation();
			return;
		}
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
	<!-- MAP background (full-bleed) — one shared instance; layers + zoom-frame
	     switch with the view, so toggling Stops/Routes never re-creates the map. -->
	<div class="absolute inset-0">
		<HomeMap
			bind:this={homeMap}
			{view}
			lat={userLat}
			lng={userLng}
			real={userReal}
			route={selectedRoute}
			coveredPct={sheetH}
			{dragging}
			onCenterChange={(lng, lat) => {
				cursorLng = lng;
				cursorLat = lat;
			}}
		/>
	</div>

	<!-- settings — top-left over the map (dark mode + UI size + location live there) -->
	<a
		href="/settings"
		class="absolute left-3 top-3 z-30 grid h-10 w-10 place-items-center rounded-full border border-border bg-surface/90 text-ink-soft shadow-card backdrop-blur-md transition-colors hover:bg-surface"
		aria-label="Settings"
	>
		<Icon name="settings" size={18} />
	</a>

	<!-- recentre on the user — top-right over the map -->
	{#if view === 'stops'}
		<button
			onclick={recenterOnUser}
			class="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-border bg-surface/90 text-ink-soft shadow-card backdrop-blur-md transition-colors hover:bg-surface"
			aria-label="Recentre on your location"
		>
			<Icon name="navigation" size={17} />
		</button>
	{/if}

	<!-- location snackbar floats just above the sheet. Past the snap threshold
	     the map is essentially hidden, and riding any higher would collide with
	     the top controls — so it fades out instead. -->
	{#if view === 'stops' && showBanner}
		<div
			class="absolute inset-x-3 z-20 {sheetH > 64
				? 'pointer-events-none opacity-0'
				: 'opacity-100'} {dragging ? '' : 'transition-[bottom,opacity] duration-300 ease-out'}"
			style="bottom: calc({sheetH}% + 0.75rem)"
		>
			<Snackbar
				message={snackText}
				actionLabel={snackAction}
				loading={locStatus === 'locating'}
				onAction={requestLocation}
				onClose={dismissBanner}
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
							placeholder="Search bus stops"
							aria-label="Search stops"
							bind:value={searchTerm}
							class="w-full bg-transparent py-3 text-[0.9375rem] text-ink placeholder:text-muted focus:outline-none"
						/>
					</div>
					<a
						href="/starred"
						aria-label="Starred stops"
						class="flex h-[3.125rem] shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-[0.8125rem] font-semibold text-ink-soft shadow-card transition-colors hover:bg-surface-2"
					>
						<Icon name="star" size={16} /> <span class="ui-opt">Starred</span>
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
						<ul class="space-y-2">
							{#each searchResults as stop (stop.name)}
								{@const servingRoutes = routesServingStop(stop.name)}
								<li>
									<a
										href="/stop/{stop.name}"
										class="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-[0.875rem] font-medium leading-tight text-ink shadow-card transition-all hover:-translate-y-0.5 hover:border-border-strong"
									>
										<span class="min-w-0 flex-1 truncate">{stop.caption}</span>
										{#if servingRoutes.length > 0}
											<span class="flex shrink-0 flex-wrap items-center justify-end gap-1">
												{#each servingRoutes as r (r)}
													<span
														class="grid h-6 w-6 place-items-center rounded-md font-mono text-[0.625rem] font-bold"
														style="background: {routeColor(r)}; color: {routeTextColor(r)}"
													>
														{r}
													</span>
												{/each}
											</span>
										{/if}
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
						<h2 class="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
							{cursorAdrift ? 'Near map centre' : 'Nearby'}
						</h2>
						{#if mounted}
							{#each visibleNearby as stop (stop.name)}
								<StopCard code={stop.name} caption={stop.caption} />
							{/each}
							{#if canLoadMore}
								<button
									onclick={() => (limit += 3)}
									class="w-full rounded-xl border border-border bg-surface py-3 text-[0.8125rem] font-semibold text-ink-soft shadow-card transition-colors hover:bg-surface-2"
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
