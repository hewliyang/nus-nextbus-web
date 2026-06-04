<script lang="ts">
	interface Props {
		veh_plate: string | undefined;
		capacity: number | undefined;
		ridership: number | undefined;
	}

	let { veh_plate, capacity, ridership }: Props = $props();

	type Status = 'low' | 'mid' | 'full';
	const meta: Record<Status, { color: string; label: string }> = {
		low: { color: 'var(--ok)', label: 'Seats' },
		mid: { color: 'var(--warn)', label: 'Filling' },
		full: { color: 'var(--bad)', label: 'Packed' }
	};

	const progress = $derived(
		((Math.min((ridership ?? 0) + 7, capacity ?? 88) || 0) / (capacity || 88)) * 100
	);
	const status = $derived((progress < 34 ? 'low' : progress > 66 ? 'full' : 'mid') as Status);
	const hasLoad = $derived(!!ridership && ridership > 0);
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
			></div>
		</div>
		<span class="font-mono text-[10px] font-medium uppercase tracking-wide text-muted">
			{veh_plate}
		</span>
	</div>
{/if}
