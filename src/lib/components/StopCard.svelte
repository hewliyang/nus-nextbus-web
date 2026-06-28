<script lang="ts">
	import Icon from './Icon.svelte';
	import { routeColor, routeTextColor, routeTerminal, isPublic, baseRoute } from '$lib/routes';
	import { onMount, type Snippet } from 'svelte';
	import type { Timing } from '$lib/types';

	interface Props {
		code: string;
		caption: string;
		/** Optional extra header control (e.g. a delete button on Starred). */
		extra?: Snippet;
	}
	let { code, caption, extra }: Props = $props();

	// Each card owns its arrivals (self-contained $state) and polls every 20s.
	let timings = $state<Timing[]>([]);
	let loading = $state(true);
	let refreshing = $state(false);
	let failed = $state(false);

	async function load() {
		refreshing = true;
		try {
			const res = await fetch(`/api/stop/${encodeURIComponent(code)}`);
			if (res.ok) {
				const data = await res.json();
				timings = data?.etas?.timings ?? [];
				failed = false;
			} else {
				failed = true;
			}
		} catch {
			failed = true;
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	onMount(() => {
		load();
		const poll = setInterval(() => {
			if (!document.hidden) load();
		}, 20_000);
		const onVis = () => {
			if (!document.hidden) load();
		};
		document.addEventListener('visibilitychange', onVis);
		return () => {
			clearInterval(poll);
			document.removeEventListener('visibilitychange', onVis);
		};
	});

	const hasTime = (t: string | undefined) => !!t && t !== '-';
	const mins = (t: string | undefined) => {
		const n = Number(t);
		return Number.isNaN(n) ? null : n;
	};

	// Live routes only, earliest first. Terminal stops list each route twice
	// (loop "-S"/"-E" variants); drop the "-E" duplicate so we show one row per
	// route and keys stay unique (matches the stop page's handling).
	const live = $derived(
		timings
			.filter((s) => {
				const tokens = s.busStopCode?.split('-');
				if (tokens && tokens.length > 2 && tokens[2] === 'E') return false;
				return hasTime(s.arrivalTime) || hasTime(s.nextArrivalTime);
			})
			.sort((a, b) => (mins(a.arrivalTime) ?? 999) - (mins(b.arrivalTime) ?? 999))
	);

	// Far-out waits (e.g. first bus of the day) read better as a clock time.
	const FAR_MIN = 60;
	function clock(ts: string | undefined): string {
		const m = ts?.match(/(\d{1,2}):(\d{2})/);
		if (!m) return ts ?? '';
		let h = Number(m[1]);
		const ap = h < 12 ? 'am' : 'pm';
		h = h % 12 || 12;
		return `${h}:${m[2]}${ap}`;
	}
	function part(t: string | undefined, ts: string | undefined): string | null {
		if (!hasTime(t)) return null;
		const n = mins(t);
		if (n === null) return t!;
		if (n === 0) return 'Arr';
		if (n >= FAR_MIN && ts) return clock(ts);
		return String(n);
	}
	function arrivalText(s: Timing): string {
		const pa = part(s.arrivalTime, s.arrivalTime_ts);
		const pb = part(s.nextArrivalTime, s.nextArrivalTime_ts);
		if (pa && pb) return `${pa}, ${pb}`;
		return pa ?? pb ?? '—';
	}
	const showUnit = (s: Timing) => {
		const n = mins(s.arrivalTime);
		return n !== null && n > 0 && n < FAR_MIN;
	};
</script>

<div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
	<div class="flex items-center gap-2 border-b border-border px-3.5 py-3">
		<a href="/stop/{code}" class="flex min-w-0 flex-1 items-center gap-2.5">
			<span class="shrink-0 text-accent"><Icon name="bus" size={18} /></span>
			<span class="truncate text-[15px] font-semibold text-ink">{caption}</span>
		</a>
		{#if extra}{@render extra()}{/if}
		<button
			onclick={load}
			class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink {refreshing
				? 'opacity-40'
				: ''}"
			aria-label="Refresh {caption}"
		>
			<Icon name="refresh" size={15} />
		</button>
	</div>

	{#if live.length > 0}
		<ul>
			{#each live as s (s.name)}
				{@const rt = baseRoute(s.name)}
				{@const label = isPublic(s.name) ? s.name.slice(4) : s.name}
				<li class="border-b border-border last:border-0">
					<a
						href="/?view=routes&route={rt}"
						class="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-surface-2"
					>
						<span
							class="grid h-7 min-w-[1.9rem] shrink-0 place-items-center rounded-md px-1 font-mono text-xs font-bold"
							style="background: {routeColor(s.name)}; color: {routeTextColor(s.name)}"
						>
							{label}
						</span>
						<span class="min-w-0 flex-1 truncate text-[13px] text-ink-soft">{routeTerminal(rt)}</span>
						<span class="shrink-0 whitespace-nowrap text-right">
							<span class="text-[15px] font-semibold tabular-nums text-ink">{arrivalText(s)}</span>
							{#if showUnit(s)}<span class="ml-1 text-[11px] font-medium text-muted">min</span>{/if}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="px-3.5 py-3 text-[13px] text-muted">
			{#if loading}
				Loading arrivals…
			{:else if failed}
				Couldn’t load arrivals.
			{:else}
				No buses running now.
			{/if}
		</p>
	{/if}
</div>
