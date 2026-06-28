<script lang="ts">
	import BusCapacityLabel from '$lib/components/BusCapacityLabel.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { routeColor, routeTextColor, isPublic } from '$lib/routes';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { Timing, Bookmark } from '$lib/types';

	let { data }: { data: PageData } = $props();

	// `data` is the SSR snapshot; `polled` overlays fresher results from the
	// /api/stop endpoint. `current` prefers the poll when present.
	let polled = $state<PageData | null>(null);
	let refreshing = $state(false);
	let now = $state(Date.now());

	const current = $derived(polled ?? data);
	const degraded = $derived(current.degraded);
	const etas = $derived(current.etas);
	const busStopName = $derived(etas.busStopName);
	const busStopCaption = $derived(etas.busStopCaption);
	const lastUpdated = $derived(etas.lastUpdated);
	const timings = $derived(etas.timings);

	// Drop a stale poll overlay when the server data changes (navigating stops).
	$effect(() => {
		data;
		polled = null;
	});

	const terminals = ['KRB', 'OTH', 'UTOWN', 'COM3'];
	const filteredShuttles = $derived.by<Timing[]>(() => {
		if (terminals.includes(busStopName)) {
			return timings.filter(({ busStopCode }) => {
				if (!busStopCode) return true;
				const tokens = busStopCode.split('-');
				return !(tokens.length > 2 && tokens[2] === 'E');
			});
		}
		return timings;
	});

	const hasTime = (t: string | undefined) => !!t && t !== '-';
	const liveShuttles = $derived(
		filteredShuttles.filter((s) => hasTime(s.arrivalTime) || hasTime(s.nextArrivalTime))
	);
	const idleRoutes = $derived([
		...new Set(
			filteredShuttles
				.filter((s) => !hasTime(s.arrivalTime) && !hasTime(s.nextArrivalTime))
				.map((s) => s.name)
		)
	]);

	const bookmark_objs: Bookmark[] = $derived($page.data.bookmarks);
	const alreadyBookmarked = $derived(bookmark_objs.map((o) => o.name).includes(busStopName));

	function relative(d: Date, nowMs: number) {
		const s = Math.round((nowMs - d.getTime()) / 1000);
		if (s < 45) return 'just now';
		const m = Math.round(s / 60);
		if (m < 60) return `${m} min ago`;
		const h = Math.round(m / 60);
		if (h < 24) return `${h} hr ago`;
		const days = Math.round(h / 24);
		return `${days} day${days > 1 ? 's' : ''} ago`;
	}
	const updatedLabel = $derived(relative(new Date(lastUpdated), now));

	// Live polling: refresh timings every 20s (paused while the tab is hidden,
	// and refreshed immediately when it becomes visible again). Keeps hewliyang's
	// server lightly loaded; its own response is cached for ~8s server-side too.
	const POLL_MS = 20_000;
	async function refresh() {
		if (typeof document !== 'undefined' && document.hidden) return;
		refreshing = true;
		try {
			const res = await fetch(`/api/stop/${encodeURIComponent(busStopName)}`);
			if (res.ok) polled = await res.json();
		} catch {
			// keep the last good data on transient failure
		} finally {
			refreshing = false;
		}
	}

	onMount(() => {
		const poll = setInterval(refresh, POLL_MS);
		const tick = setInterval(() => (now = Date.now()), 1000);
		const onVisible = () => {
			if (!document.hidden) refresh();
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			clearInterval(poll);
			clearInterval(tick);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});

	const FAR_MIN = 60;
	function clock(ts: string) {
		const m = ts.match(/(\d{1,2}):(\d{2})/);
		if (!m) return ts;
		let h = Number(m[1]);
		const ap = h < 12 ? 'am' : 'pm';
		h = h % 12 || 12;
		return `${h}:${m[2]}${ap}`;
	}
	function fmt(t: string, ts?: string) {
		if (!t || t === '-') return { value: '—', unit: '' };
		const n = Number(t);
		if (!Number.isNaN(n)) {
			if (n === 0) return { value: 'Arr', unit: '' };
			if (n >= FAR_MIN && ts) return { value: clock(ts), unit: '' };
			return { value: String(n), unit: 'min' };
		}
		return { value: t, unit: '' };
	}
</script>

<section class="fade-up space-y-5">
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<a
				href="/"
				class="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-ink"
			>
				<Icon name="arrow-left" size={15} /> Stops
			</a>
			<h1 class="text-2xl font-semibold leading-tight tracking-tight text-ink">
				{busStopCaption}
			</h1>
			<p class="mt-1 flex items-center gap-1.5 text-xs text-muted">
				{#if degraded}
					<Icon name="clock" size={13} /> Live timings unavailable
				{:else}
					<span
						class="inline-block h-2 w-2 rounded-full bg-ok transition-opacity {refreshing
							? 'opacity-40'
							: 'opacity-100'}"
						aria-hidden="true"
					></span>
					Live · updated {updatedLabel}
				{/if}
			</p>
		</div>

		<div class="flex shrink-0 items-center gap-1.5">
			<form action="?/addBookmark&id={busStopName}&caption={busStopCaption}" method="POST" use:enhance>
				<button
					disabled={alreadyBookmarked}
					class="grid h-10 w-10 place-items-center rounded-xl border shadow-card transition-colors
						{alreadyBookmarked
						? 'border-accent/30 bg-accent-soft text-accent'
						: 'border-border bg-surface text-ink-soft hover:bg-surface-2'}"
					aria-label={alreadyBookmarked ? 'Bookmarked' : 'Add bookmark'}
				>
					<Icon name={alreadyBookmarked ? 'bookmark-fill' : 'bookmark'} size={18} />
				</button>
			</form>
			<button
				onclick={refresh}
				class="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-ink-soft shadow-card transition-colors hover:bg-surface-2"
				aria-label="Refresh now"
			>
				<Icon name="refresh" size={17} />
			</button>
		</div>
	</div>

	{#if liveShuttles.length === 0}
		<div class="flex flex-col items-center gap-2 py-12 text-center">
			<span class="text-muted"><Icon name="bus" size={28} /></span>
			<p class="text-sm font-medium text-ink">
				{degraded ? 'Live timings are down' : 'No buses running right now'}
			</p>
			<p class="max-w-xs text-xs text-muted">
				{degraded
					? "The shuttle service isn't responding. The routes serving this stop are below."
					: 'Nothing is currently arriving at this stop. Check back closer to operating hours.'}
			</p>
		</div>
	{/if}

	{#if liveShuttles.length > 0}
		<ul class="space-y-2">
			{#each liveShuttles as { name, arrivalTime, nextArrivalTime, arrivalTime_ts, nextArrivalTime_ts, arrivalTime_ridership, arrivalTime_veh_plate, arrivalTime_capacity, nextArrivalTime_capacity, nextArrivalTime_ridership, nextArrivalTime_veh_plate } (name)}
				{@const arr = fmt(arrivalTime, arrivalTime_ts)}
				{@const nxt = fmt(nextArrivalTime, nextArrivalTime_ts)}
				{@const label = isPublic(name) ? name.slice(4) : name}
				<li
					class="grid grid-cols-[auto_1fr_1fr] items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card"
				>
					{#if isPublic(name)}
						<span
							class="grid h-12 w-12 place-items-center rounded-xl border border-border bg-surface-2 text-center font-mono text-[13px] font-bold leading-none text-ink-soft"
						>
							{label}
						</span>
					{:else}
						<a
							href="/stop/{busStopName}/route/{name}#current"
							class="grid h-12 w-12 place-items-center rounded-xl font-mono text-base font-bold shadow-sm transition-transform hover:scale-105"
							style="background: {routeColor(name)}; color: {routeTextColor(name)}"
							aria-label="View route {label}"
						>
							{label}
						</a>
					{/if}

					<div class="flex flex-col gap-1.5">
						<div class="flex items-baseline gap-1">
							<span
								class="text-xl font-semibold tabular-nums tracking-tight
									{arr.value === 'Arr' ? 'text-ok' : 'text-ink'}"
							>
								{arr.value}
							</span>
							{#if arr.unit}<span class="text-xs font-medium text-muted">{arr.unit}</span>{/if}
						</div>
						<BusCapacityLabel
							capacity={arrivalTime_capacity}
							veh_plate={arrivalTime_veh_plate}
							ridership={arrivalTime_ridership}
						/>
					</div>

					<div class="flex flex-col gap-1.5 border-l border-border pl-3">
						<div class="flex items-baseline gap-1">
							<span class="text-[10px] font-medium uppercase tracking-wide text-muted">next</span>
							<span class="text-lg font-semibold tabular-nums tracking-tight text-ink-soft">
								{nxt.value}
							</span>
							{#if nxt.unit}<span class="text-xs font-medium text-muted">{nxt.unit}</span>{/if}
						</div>
						<BusCapacityLabel
							capacity={nextArrivalTime_capacity}
							veh_plate={nextArrivalTime_veh_plate}
							ridership={nextArrivalTime_ridership}
						/>
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	{#if idleRoutes.length > 0}
		<div class="space-y-2.5">
			<h2 class="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
				Serves this stop · not running
			</h2>
			<ul class="flex flex-wrap gap-2">
				{#each idleRoutes as name}
					{@const label = isPublic(name) ? name.slice(4) : name}
					<li>
						{#if isPublic(name)}
							<span
								class="flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-1.5 pr-3.5 font-mono text-sm font-bold text-muted"
							>
								<span class="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-[11px]"
									>{label}</span
								>
							</span>
						{:else}
							<a
								href="/stop/{busStopName}/route/{name}#current"
								class="flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-1.5 pr-3.5 font-mono text-sm font-bold text-ink-soft transition-colors hover:bg-surface-2"
							>
								<span
									class="grid h-6 w-6 place-items-center rounded-full text-[11px]"
									style="background: {routeColor(name)}; color: {routeTextColor(name)}">{label}</span
								>
								Route
							</a>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
