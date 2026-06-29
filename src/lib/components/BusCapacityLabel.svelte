<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		veh_plate: string | undefined;
		capacity: number | undefined;
		ridership: number | undefined;
	}

	let { veh_plate, capacity, ridership }: Props = $props();

	type Status = 'low' | 'mid' | 'full';
	const labels: Record<Status, string> = {
		low: 'Free seats',
		mid: 'Limited space',
		full: 'Crowded'
	};

	const progress = $derived(
		((Math.min((ridership ?? 0) + 7, capacity ?? 88) || 0) / (capacity || 88)) * 100
	);
	const status = $derived((progress < 34 ? 'low' : progress > 66 ? 'full' : 'mid') as Status);
	const hasLoad = $derived(!!ridership && ridership > 0);
	const filledCount = $derived(status === 'low' ? 1 : status === 'mid' ? 2 : 3);
	// Citymapper palette: neutral grey while seats remain, red only once crowded.
	const fillColor = $derived(status === 'full' ? 'var(--bad)' : 'var(--ink-soft)');
</script>

{#if veh_plate && veh_plate !== '-'}
	<div class="flex items-center gap-2">
		<div
			class="flex items-center gap-px rounded-full border border-border bg-surface-2 px-1.5 py-1 leading-none"
			role="img"
			aria-label={hasLoad ? labels[status] : 'Capacity unknown'}
		>
			{#each [0, 1, 2] as i}
				<span style="color: {hasLoad && i < filledCount ? fillColor : 'var(--border-strong)'}">
					<Icon name="person" size={12} stroke={0} />
				</span>
			{/each}
		</div>
		<span class="font-mono text-[10px] font-medium uppercase tracking-wide text-muted">
			{veh_plate}
		</span>
	</div>
{/if}
