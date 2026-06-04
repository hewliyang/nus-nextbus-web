<script lang="ts">
	export let veh_plate: string | undefined;
	export let capacity: number | undefined;
	export let ridership: number | undefined;

	type Status = 'low' | 'mid' | 'full';
	const meta: Record<Status, { color: string; label: string }> = {
		low: { color: 'var(--ok)', label: 'Seats' },
		mid: { color: 'var(--warn)', label: 'Filling' },
		full: { color: 'var(--bad)', label: 'Packed' }
	};

	// ridership is usually understated, nudge it up a touch
	$: progress = ((Math.min((ridership ?? 0) + 7, capacity ?? 88) || 0) / (capacity || 88)) * 100;
	$: status = (progress < 34 ? 'low' : progress > 66 ? 'full' : 'mid') as Status;
	$: hasLoad = !!ridership && ridership > 0;
</script>

{#if veh_plate && veh_plate !== '-'}
	<div class="flex items-center gap-2">
		<div
			class="relative h-1.5 w-14 overflow-hidden rounded-full bg-border"
			role="img"
			aria-label={hasLoad ? meta[status].label : 'Capacity unknown'}
		>
			<div
				class="absolute inset-y-0 left-0 rounded-full"
				style="width: {hasLoad ? progress : 100}%; background: {hasLoad
					? meta[status].color
					: 'var(--border-strong)'}"
			/>
		</div>
		<span class="font-mono text-[10px] font-medium uppercase tracking-wide text-muted">
			{veh_plate}
		</span>
	</div>
{/if}
