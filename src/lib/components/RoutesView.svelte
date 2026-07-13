<script lang="ts">
	import Icon from './Icon.svelte';
	import { routeColor, routeTextColor, routeKeysSorted, routeStops } from '$lib/routes';
	import { schedules } from '$lib/data';

	interface Props {
		selected: string;
		onSelect: (route: string) => void;
		/** Stop code to highlight on the rail (deep link from a stop's route badge). */
		current?: string | null;
		/** Routes available after an optional parent-level search filter. */
		routeOptions?: string[];
	}
	let { selected, onSelect, current = null, routeOptions = routeKeysSorted }: Props = $props();

	// Stops in travel order; the seq:32767 entry is the loop-back to the origin
	// terminal, shown at the bottom so the list reads terminal → terminal.
	const stops = $derived(routeStops(selected));
	const uniqueStops = $derived(stops.filter((s) => s.seq !== 32767).length);
	const schedule = $derived(schedules[selected]);
	const color = $derived(routeColor(selected));

	// Rail state: with a highlighted stop, everything before it dims and the
	// rail lights up in the route colour from that stop onward; without one,
	// the whole rail is coloured.
	const currentIdx = $derived(current ? stops.findIndex((s) => s.code === current) : -1);
	const hasCurrent = $derived(currentIdx >= 0);
	const segColor = (i: number) => (!hasCurrent || i >= currentIdx ? color : 'var(--border-strong)');

	// Bring the highlighted stop into view when landing from a deep link.
	let rowEls: HTMLElement[] = [];
	$effect(() => {
		if (currentIdx >= 0) rowEls[currentIdx]?.scrollIntoView({ block: 'center', inline: 'nearest' });
	});

	// Footnote: call out no-service days and terminal/notes, when present.
	const footnote = $derived.by(() => {
		if (!schedule) return '';
		const noServiceDays: string[] = [];
		if (schedule.saturday.noService) noServiceDays.push('Sat');
		if (schedule.sundayPh.noService) noServiceDays.push('Sun & PH');
		const parts: string[] = [];
		if (noServiceDays.length) parts.push(`No service on ${noServiceDays.join(', ')}.`);
		if (schedule.terminal) parts.push(`Times are departures from ${schedule.terminal}.`);
		if (schedule.notes) parts.push(schedule.notes);
		return parts.join(' ');
	});
</script>

<div class="space-y-4">
	<!-- route chips (alphabetical, wrapping) -->
	<div class="flex flex-wrap gap-2">
		{#each routeOptions as key}
			{@const active = key === selected}
			<button
				onclick={() => onSelect(key)}
				aria-pressed={active}
				class="rounded-full px-3.5 py-1.5 font-mono text-sm font-bold transition-all
					{active ? 'shadow-card' : 'border border-border bg-surface text-ink-soft hover:bg-surface-2'}"
				style={active ? `background: ${routeColor(key)}; color: ${routeTextColor(key)}` : ''}
			>
				{key}
			</button>
		{/each}
	</div>

	<!-- stop list (terminal → terminal) threaded by the route-coloured rail -->
	<div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
		<div class="border-b border-border px-3.5 py-2.5">
			<h2 class="text-xs font-semibold uppercase tracking-wide text-muted">{uniqueStops} stops</h2>
		</div>
		<ul>
			{#each stops as stop, i (`${stop.code}-${stop.seq}`)}
				{@const isCurrent = i === currentIdx}
				{@const passed = hasCurrent && i < currentIdx}
				<li bind:this={rowEls[i]}>
					<a
						href="/stop/{stop.code}"
						class="flex items-center gap-3 px-3.5 transition-colors hover:bg-surface-2"
						aria-current={isCurrent ? 'true' : undefined}
					>
						<!-- rail column: line segments meet edge-to-edge across rows -->
						<span
							class="relative flex w-5 shrink-0 items-center justify-center self-stretch"
							aria-hidden="true"
						>
							{#if i > 0}
								<span
									class="absolute left-1/2 top-0 h-1/2 w-[3px] -translate-x-1/2"
									style="background: {segColor(i - 1)}"
								></span>
							{/if}
							{#if i < stops.length - 1}
								<span
									class="absolute bottom-0 left-1/2 h-1/2 w-[3px] -translate-x-1/2"
									style="background: {segColor(i)}"
								></span>
							{/if}
							<span
								class="relative z-10 border-2
									{isCurrent ? 'h-[1.125rem] w-[1.125rem] rounded-[5px]' : 'h-3 w-3 rounded-[4px]'}"
								style="background: {isCurrent ? color : 'var(--surface)'};
									border-color: {passed ? 'var(--border-strong)' : color};
									{isCurrent ? `box-shadow: 0 0 0 4px color-mix(in oklch, ${color} 22%, transparent);` : ''}"
							></span>
						</span>
						<span
							class="min-w-0 flex-1 truncate py-3 text-[0.875rem]
								{isCurrent ? 'font-semibold text-ink' : passed ? 'font-medium text-muted' : 'font-medium text-ink'}"
						>
							{stop.name}
						</span>
						{#if isCurrent}
							<span
								class="shrink-0 rounded-full px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wide"
								style="background: {color}; color: {routeTextColor(selected)}">Here</span
							>
						{/if}
						<span class="shrink-0 text-muted"><Icon name="chevron" size={15} /></span>
					</a>
				</li>
			{/each}
		</ul>
	</div>

	<!-- first / last bus (hidden when no schedule data for this route) -->
	{#if schedule}
		<div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
			<div class="overflow-x-auto">
				<table class="w-full whitespace-nowrap text-[0.8125rem]">
					<thead>
						<tr class="border-b border-border text-xs uppercase tracking-wide text-muted">
							<th class="px-3.5 py-2 text-left font-semibold" aria-label="Service"></th>
							<th class="px-2.5 py-2 text-right font-semibold">Weekdays</th>
							<th class="px-2.5 py-2 text-right font-semibold">Sat</th>
							<th class="px-2.5 py-2 text-right font-semibold">Sun & PH</th>
						</tr>
					</thead>
					<tbody class="tabular-nums">
						<tr class="border-b border-border">
							<td class="px-3.5 py-2.5 font-medium text-ink-soft">First bus</td>
							<td class="px-2.5 py-2.5 text-right text-ink">{schedule.weekday.first ?? '–'}</td>
							<td class="px-2.5 py-2.5 text-right text-ink">
								{schedule.saturday.noService ? '–' : schedule.saturday.first}
							</td>
							<td class="px-2.5 py-2.5 text-right text-ink">
								{schedule.sundayPh.noService ? '–' : schedule.sundayPh.first}
							</td>
						</tr>
						<tr>
							<td class="px-3.5 py-2.5 font-medium text-ink-soft">Last bus</td>
							<td class="px-2.5 py-2.5 text-right text-ink">{schedule.weekday.last ?? '–'}</td>
							<td class="px-2.5 py-2.5 text-right text-ink">
								{schedule.saturday.noService ? '–' : schedule.saturday.last}
							</td>
							<td class="px-2.5 py-2.5 text-right text-ink">
								{schedule.sundayPh.noService ? '–' : schedule.sundayPh.last}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			{#if footnote}
				<p class="border-t border-border px-3.5 py-2 text-[0.6875rem] text-muted">{footnote}</p>
			{/if}
		</div>
	{/if}
</div>
