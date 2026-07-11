<script lang="ts">
	import Icon from './Icon.svelte';
	import {
		routeColor,
		routeTextColor,
		routeTerminal,
		isPublic,
		baseRoute,
		routesServingStop
	} from '$lib/routes';
	import type { Snippet } from 'svelte';
	import { stopTimingsState } from '$lib/stop-timings.svelte';
	import {
		arrivalMinutes,
		dedupeTerminalVariants,
		formatArrival,
		formatArrivalPair,
		hasArrival
	} from '$lib/timings';

	interface Props {
		code: string;
		caption: string;
		/** Optional extra header control (e.g. a delete button on Starred). */
		extra?: Snippet;
	}
	let { code, caption, extra }: Props = $props();

	const arrivals = $derived(stopTimingsState(code));
	$effect(() => arrivals.acquire());

	const timings = $derived(arrivals.data?.etas.timings ?? []);
	const live = $derived(
		dedupeTerminalVariants(timings)
			.filter((timing) => hasArrival(timing.arrivalTime) || hasArrival(timing.nextArrivalTime))
			.sort(
				(a, b) => (arrivalMinutes(a.arrivalTime) ?? 999) - (arrivalMinutes(b.arrivalTime) ?? 999)
			)
	);

	// Routes that serve this stop, known statically — used to shape the loading
	// skeleton so the card holds its final size before arrivals land (no shift).
	const servingRoutes = $derived(routesServingStop(code));
</script>

<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
	<div class="flex min-h-10 items-center gap-2 border-b border-border px-3 py-1">
		<a href="/stop/{code}" class="min-w-0 flex-1">
			<span class="block truncate text-[0.875rem] font-semibold text-ink">{caption}</span>
		</a>
		{#if extra}{@render extra()}{/if}
		<button
			onclick={() => arrivals.refresh()}
			class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink {arrivals.refreshing
				? 'opacity-40'
				: ''}"
			aria-label="Refresh {caption}"
		>
			<Icon name="refresh" size={15} />
		</button>
	</div>

	{#if live.length > 0}
		<ul>
			<!-- Key includes the index: a route can serve a stop twice per loop (two
		     timings sharing a name), and duplicate keys throw. -->
			{#each live as s, i (`${s.name}|${i}`)}
				{@const rt = baseRoute(s.name)}
				{@const label = isPublic(s.name) ? s.name.slice(4) : s.name}
				<li class="border-b border-border last:border-0">
					<a
						href="/?view=routes&route={rt}"
						class="flex min-h-10 items-center gap-2.5 px-3 py-1 transition-colors hover:bg-surface-2"
					>
						<span
							class="grid h-6 min-w-[1.75rem] shrink-0 place-items-center rounded-md px-1 font-mono text-[0.6875rem] font-bold"
							style="background: {routeColor(s.name)}; color: {routeTextColor(s.name)}"
						>
							{label}
						</span>
						<span class="min-w-0 flex-1 truncate text-xs text-ink-soft"
							>{routeTerminal(rt)}</span
						>
						<span class="shrink-0 whitespace-nowrap text-right">
							<span class="text-[0.875rem] font-semibold tabular-nums text-ink"
								>{formatArrivalPair(s)}</span
							>
							{#if formatArrival(s.arrivalTime, s.arrivalTime_ts).unit}<span
									class="ml-1 text-[0.6875rem] font-medium text-muted">min</span
								>{/if}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else if arrivals.loading}
		<ul aria-label="Loading arrivals" aria-busy="true">
			{#each servingRoutes as name (name)}
				{@const label = isPublic(name) ? name.slice(4) : name}
				<li class="flex min-h-10 items-center gap-2.5 border-b border-border px-3 py-1 last:border-0">
					<span
						class="grid h-6 min-w-[1.75rem] shrink-0 place-items-center rounded-md px-1 font-mono text-[0.6875rem] font-bold"
						style="background: {routeColor(name)}; color: {routeTextColor(name)}"
					>
						{label}
					</span>
					<span class="h-3 w-28 max-w-[55%] animate-pulse rounded bg-surface-2"></span>
					<span class="ml-auto h-4 w-9 animate-pulse rounded bg-surface-2"></span>
				</li>
			{:else}
				<li class="px-3 py-2.5">
					<span class="block h-4 w-32 animate-pulse rounded bg-surface-2"></span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="px-3 py-2.5 text-xs text-muted">
			{#if arrivals.failed}
				Couldn’t load arrivals.
			{:else}
				No buses running now.
			{/if}
		</p>
	{/if}
</div>
