<script lang="ts">
	import Icons from '$lib/icons';
	import type { Stop } from '$lib/types';

	export let stops: Stop[];
	$: stopsCopy = stops.map((stop, index) => {
		let side = index % 2 === 0 ? 'left' : 'right';
		let href = `/stop/${stop.busstopcode}`;
		return { ...stop, side, href };
	});

	$: firstStop = stopsCopy.shift();
	$: lastStop = stopsCopy.pop();
</script>

<div class="py-6">
	<ul class="timeline timeline-vertical text-sm font-semibold tracking-tight">
		<li>
			<a href={firstStop?.href} class="timeline-start timeline-box">{firstStop?.stop_name}</a>
			<div class="timeline-middle">
				<Icons.timestep active={true} />
			</div>
			<hr />
		</li>
		{#each stopsCopy as stop}
			{#if stop.side === 'right'}
				<li>
					<hr />
					<div class="timeline-middle">
						<Icons.timestep active={false} />
					</div>
					<a href={stop.href} class="timeline-end timeline-box">{stop?.stop_name}</a>
					<hr />
				</li>
			{:else}
				<li>
					<hr />
					<div class="timeline-middle">
						<Icons.timestep active={false} />
					</div>
					<a href={stop.href} class="timeline-start timeline-box">{stop?.stop_name}</a>
					<hr />
				</li>
			{/if}
		{/each}
		<li>
			<hr />
			<a
				href={lastStop?.href}
				class="{lastStop?.side === 'left' ? 'timeline-start' : 'timeline-end'} timeline-box"
			>
				{lastStop?.stop_name}
			</a>
			<div class="timeline-middle">
				<Icons.timestep active={true} />
			</div>
		</li>
	</ul>
</div>
