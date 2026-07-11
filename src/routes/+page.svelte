<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { nearestStops } from '$lib/geo';
	import { searchBookmarks, searchRoutes, searchStops } from '$lib/search';
	import { getDistance } from '$lib/stores/utils';
	import { setPref } from '$lib/prefs';
	import type { LocPref } from '$lib/parse';
	import type { Bookmark } from '$lib/types';
	import {
		NUS_CENTER,
		routeKeysSorted,
		routeStops
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
	const view = $derived.by<'stops' | 'starred' | 'routes'>(() => {
		const value = $page.url.searchParams.get('view');
		return value === 'routes' || value === 'starred' ? value : 'stops';
	});
	const rawRoute = $derived($page.url.searchParams.get('route'));
	const selectedRoute = $derived(rawRoute && routeKeysSorted.includes(rawRoute) ? rawRoute : 'D2');
	// Optional highlighted stop (/?view=routes&route=D2&stop=COM3 from a stop
	// page's route badge) — honoured only when the stop is on the selected route.
	const rawStop = $derived($page.url.searchParams.get('stop'));
	const selectedStop = $derived(
		rawStop && routeStops(selectedRoute).some((s) => s.code === rawStop) ? rawStop : null
	);

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
		// The highlight belongs to the route it arrived with — picking another
		// route clears it rather than dimming an unrelated prefix of stops.
		u.searchParams.delete('stop');
		goto(u, navOpts);
	}

	// ── location + nearby (client-only GPS) ──
	let userLat = $state(NUS_CENTER[1]);
	let userLng = $state(NUS_CENTER[0]);
	let userReal = $state(false);
	let locStatus = $state<LocationStatus>('idle');
	let limit = $state(3);
	let mounted = $state(false);
	let desktop = $state(false);
	let loadMoreSentinel = $state<HTMLDivElement>();

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

	// Extend the Nearby list as its tail enters the scroll viewport. Recreating
	// the observer after each batch also fills unusually tall screens without
	// requiring an initial manual interaction.
	$effect(() => {
		void limit;
		if (!mounted || !canLoadMore || !loadMoreSentinel) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) limit = Math.min(limit + 3, allNearby.length);
			},
			{ rootMargin: '0px 0px 160px' }
		);
		observer.observe(loadMoreSentinel);
		return () => observer.disconnect();
	});

	const bookmarks = $derived(($page.data.bookmarks ?? []) as Bookmark[]);
	const starredCodes = $derived(bookmarks.map((bookmark) => bookmark.name));

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
		try {
			const savedSheetHeight = Number(localStorage.getItem(SHEET_HEIGHT_KEY));
			if (savedSheetHeight === PEEK || savedSheetHeight === EXPANDED) sheetH = savedSheetHeight;
		} catch {
			// Keep the default height when storage is unavailable.
		}
		const media = window.matchMedia('(min-width: 1024px)');
		const syncDesktop = () => (desktop = media.matches);
		syncDesktop();
		media.addEventListener('change', syncDesktop);

		const cleanup = () => media.removeEventListener('change', syncDesktop);
		if (locPref === 'off') return cleanup; // the user said no — don't auto-locate
		if (locPref === 'on') {
			requestLocation();
			return cleanup;
		}
		if ('permissions' in navigator) {
			navigator.permissions
				.query({ name: 'geolocation' as PermissionName })
				.then((p) => {
					if (p.state === 'granted') requestLocation();
				})
				.catch(() => {});
		}
		return cleanup;
	});

	// ── bottom sheet: drag the grabber between a peek and an expanded snap
	//    point, or tap / press Enter to toggle. `moved` suppresses the click
	//    that a real drag would otherwise also fire. ──
	const PEEK = 48;
	const EXPANDED = 90;
	const SHEET_HEIGHT_KEY = 'home-drawer-height';
	let sheetH = $state(PEEK); // height as % of the viewport

	function saveSheetHeight() {
		try {
			localStorage.setItem(SHEET_HEIGHT_KEY, String(sheetH));
		} catch {
			// Storage may be unavailable in private browsing or restricted contexts.
		}
	}
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
		if (moved) {
			sheetH = sheetH > 64 ? EXPANDED : PEEK; // snap
			saveSheetHeight();
		}
		(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
	}
	// tap / keyboard activation (no drag) toggles between the two snap points
	function toggleSheet() {
		if (moved) {
			moved = false;
			return;
		}
		sheetH = sheetH > 64 ? PEEK : EXPANDED;
		saveSheetHeight();
	}

	// ── search ──
	let searchTerm = $state('');
	const query = $derived(searchTerm.trim());
	const searching = $derived(query.length > 0);
	const searchResults = $derived(searchStops(query));
	const starredResults = $derived(searchBookmarks(bookmarks, query));
	const matchingRoutes = $derived(searchRoutes(query));
	const activeRoute = $derived(
		view === 'routes' && searching && !matchingRoutes.includes(selectedRoute)
			? (matchingRoutes[0] ?? selectedRoute)
			: selectedRoute
	);
	const mappedStarredCodes = $derived(
		view === 'starred' ? starredResults.map((bookmark) => bookmark.name) : starredCodes
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

<div class="relative h-full w-full lg:grid lg:grid-cols-[26rem_minmax(0,1fr)]">
	<!-- MAP background (full-bleed) — one shared instance; layers + zoom-frame
	     switch with the view, so toggling Stops/Routes never re-creates the map. -->
	<div class="absolute inset-0 lg:relative lg:col-start-2 lg:row-start-1">
		<HomeMap
			bind:this={homeMap}
			{view}
			starred={mappedStarredCodes}
			lat={userLat}
			lng={userLng}
			real={userReal}
			route={activeRoute}
			activeStop={selectedStop}
			coveredPct={desktop ? 0 : sheetH}
			sidePanel={desktop}
			dragging={desktop ? false : dragging}
			onCenterChange={(lng, lat) => {
				cursorLng = lng;
				cursorLat = lat;
			}}
		/>
	</div>

	<!-- settings — top-left over the map (dark mode + UI size + location live there) -->
	<a
		href="/settings"
		class="absolute left-3 top-3 z-30 grid h-10 w-10 lg:left-[calc(26rem+0.75rem)] place-items-center rounded-full border border-border bg-surface/90 text-ink-soft shadow-card backdrop-blur-md transition-colors hover:bg-surface"
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
			class="absolute inset-x-3 z-20 lg:left-[calc(26rem+0.75rem)] lg:pointer-events-auto lg:opacity-100 {sheetH >
			64
				? 'pointer-events-none opacity-0'
				: 'opacity-100'} {dragging ? '' : 'transition-[bottom,opacity] duration-300 ease-out'}"
			style:bottom={desktop ? '0.75rem' : `calc(${sheetH}% + 0.75rem)`}
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
		class="home-panel absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-3xl border-t border-border bg-bg shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.3)] lg:relative lg:inset-auto lg:col-start-1 lg:row-start-1 lg:rounded-none lg:border-r lg:border-t-0 lg:shadow-none {dragging
			? ''
			: 'transition-[height] duration-300 ease-out'}"
		style="height: {sheetH}%"
	>
		<button
			type="button"
			class="flex w-full shrink-0 cursor-grab touch-none justify-center pb-1.5 pt-3 active:cursor-grabbing lg:hidden"
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
			class="flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:px-4 lg:pt-4"
		>
			<!-- Search follows the active scope: all stops, saved stops, or routes by stop. -->
			<div
				class="flex min-h-10 items-center gap-2.5 rounded-xl border border-border bg-surface px-3 shadow-card focus-within:border-accent"
			>
				<span class="text-muted"><Icon name="search" size={17} /></span>
				<input
					type="search"
					placeholder={view === 'routes'
						? 'Search routes or stops'
						: view === 'starred'
							? 'Search starred stops'
							: 'Search bus stops'}
					aria-label={view === 'routes'
						? 'Search routes by stop'
						: view === 'starred'
							? 'Search starred stops'
							: 'Search stops'}
					bind:value={searchTerm}
					class="w-full bg-transparent py-2 text-[0.875rem] text-ink placeholder:text-muted focus:outline-none"
				/>
				{#if searching}
					<button
						onclick={() => (searchTerm = '')}
						class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
						aria-label="Clear search"
					>
						<Icon name="x" size={14} />
					</button>
				{/if}
			</div>

			<!-- SEGMENTED -->
			<Segmented
				value={view}
				onSelect={setView}
				options={[
					{ value: 'stops', label: 'Nearby' },
					{ value: 'starred', label: 'Starred' },
					{ value: 'routes', label: 'Routes' }
				]}
			/>

			<!-- CONTENT -->
			{#if view === 'stops'}
				{#if searching}
					{#if searchResults.length > 0}
						<div class="space-y-2">
							{#each searchResults as stop (stop.name)}
								<StopCard code={stop.name} caption={stop.caption} />
							{/each}
						</div>
					{:else}
						<div class="flex flex-col items-center gap-2 py-12 text-center">
							<span class="text-muted"><Icon name="search" size={26} /></span>
							<p class="text-sm font-medium text-ink">No stops match that</p>
						</div>
					{/if}
				{:else}
					<div class="space-y-2">
						{#if cursorAdrift}
							<p class="px-1 text-[0.6875rem] font-medium text-muted">Near map centre</p>
						{/if}
						{#if mounted}
							{#each visibleNearby as stop (stop.name)}
								<StopCard code={stop.name} caption={stop.caption} />
							{/each}
							{#if canLoadMore}
								<div
									bind:this={loadMoreSentinel}
									class="flex h-8 items-center justify-center"
									aria-label="Loading more nearby stops"
								>
									<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-border-strong"></span>
								</div>
							{/if}
						{:else}
							<div class="py-8 text-center text-sm text-muted">Locating nearby stops…</div>
						{/if}
					</div>
				{/if}
			{:else if view === 'starred'}
				{#if starredResults.length > 0}
					<div class="space-y-2">
						{#if searching}
							<p class="px-1 text-[0.6875rem] font-medium text-muted">
								{starredResults.length} matching stops
							</p>
						{/if}
						{#each starredResults as bookmark (bookmark.name)}
							<StopCard code={bookmark.name} caption={bookmark.caption} />
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center gap-2 py-12 text-center">
						<span class="text-muted"><Icon name={searching ? 'search' : 'star'} size={26} /></span>
						<p class="text-sm font-medium text-ink">
							{searching ? 'No starred stops match' : 'No starred stops yet'}
						</p>
						{#if !searching}
							<p class="max-w-xs text-xs text-muted">
								Star a stop from its page to keep it here and highlight it on the map.
							</p>
							<button
								onclick={() => setView('stops')}
								class="mt-2 rounded-lg px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-soft"
							>
								Browse nearby stops
							</button>
						{/if}
					</div>
				{/if}
			{:else if matchingRoutes.length > 0}
				<RoutesView
					selected={activeRoute}
					onSelect={setRoute}
					current={selectedStop}
					routeOptions={matchingRoutes}
				/>
			{:else}
				<div class="flex flex-col items-center gap-2 py-12 text-center">
					<span class="text-muted"><Icon name="search" size={26} /></span>
					<p class="text-sm font-medium text-ink">No routes serve a matching stop</p>
					<p class="max-w-xs text-xs text-muted">Try another stop name or code.</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	@media (min-width: 1024px) {
		.home-panel {
			height: 100% !important;
		}
	}
</style>
