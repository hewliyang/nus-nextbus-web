<script lang="ts">
	export let veh_plate: string | undefined;
	export let capacity: number | undefined;
	export let ridership: number | undefined;

	type Status = 'low' | 'mid' | 'full';
	const colors = new Map<Status, string>([
		['low', 'bg-green-500/75'],
		['mid', 'bg-orange-500/75'],
		['full', 'bg-red-500/75']
	]);

	// adjust ridership... usually understated
	const progress = ((Math.min(ridership! + 7, capacity!) || 0) / (capacity || 88)) * 100;

	let status: Status;
	if (progress < (1 / 3) * 100) {
		status = 'low';
	} else if (progress > (2 / 3) * 100) {
		status = 'full';
	} else {
		status = 'mid';
	}
</script>

{#if veh_plate && veh_plate != '-'}
	<div
		class="p-2.5 relative rounded border h-[18px] w-16 flex items-center justify-center border-gray-500/50 dark:border-white/50 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground"
	>
		{#if ridership && ridership > 0}
			<div
				class={`${colors.get(status)} absolute top-0 bottom-0 left-0 rounded`}
				style="width: {progress}%"
			/>
		{:else}
			<div
				class="bg-zinc-300/40 dark:bg-zinc-300/10 backdrop-blur-sm absolute top-0 bottom-0 left-0 rounded"
				style="width: 100%"
			/>
		{/if}

		<div class="relative">{veh_plate}</div>
	</div>
{/if}
