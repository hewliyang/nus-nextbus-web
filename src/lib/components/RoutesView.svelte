<script lang="ts">
	import Icon from './Icon.svelte';
	import { routeColor, routeTextColor, routeKeysSorted, routeStops } from '$lib/routes';
	import { schedules } from '$lib/data';

	interface Props {
		selected: string;
		onSelect: (route: string) => void;
	}
	let { selected, onSelect }: Props = $props();

	// Stops in travel order; drop the seq:32767 loop-back duplicate of the origin.
	const stops = $derived(routeStops(selected).filter((s) => s.seq !== 32767));
	const schedule = $derived(schedules[selected]);

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
		{#each routeKeysSorted as key}
			{@const active = key === selected}
			<button
				onclick={() => onSelect(key)}
				aria-pressed={active}
				class="rounded-full px-3.5 py-1.5 font-mono text-sm font-bold transition-all
					{active
					? 'shadow-card'
					: 'border border-border bg-surface text-ink-soft hover:bg-surface-2'}"
				style={active ? `background: ${routeColor(key)}; color: ${routeTextColor(key)}` : ''}
			>
				{key}
			</button>
		{/each}
	</div>

	<!-- stop list (terminal → terminal) -->
	<div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
		<div class="flex items-center justify-between border-b border-border px-3.5 py-2.5">
			<h2 class="text-xs font-semibold uppercase tracking-wide text-muted">{stops.length} stops</h2>
			<span class="flex items-center gap-1.5 text-xs font-medium text-muted">
				<span class="h-2.5 w-2.5 rounded-full" style="background: {routeColor(selected)}"></span>
				Line {selected}
			</span>
		</div>
		<ul>
			{#each stops as stop (stop.code)}
				<li class="border-b border-border last:border-0">
					<a
						href="/stop/{stop.code}"
						class="flex items-center gap-2.5 px-3.5 py-3 transition-colors hover:bg-surface-2"
					>
						<span class="shrink-0 text-muted"><Icon name="bus" size={16} /></span>
						<span class="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{stop.name}</span>
						<span class="shrink-0 text-muted"><Icon name="chevron" size={15} /></span>
					</a>
				</li>
			{/each}
		</ul>
	</div>

	<!-- first / last bus (hidden when no schedule data for this route) -->
	{#if schedule}
		<div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
			<table class="w-full text-[13px]">
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
			{#if footnote}
				<p class="border-t border-border px-3.5 py-2 text-[11px] text-muted">{footnote}</p>
			{/if}
		</div>
	{/if}
</div>
