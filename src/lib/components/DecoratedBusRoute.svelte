<script lang="ts">
	import Icons from '$lib/icons';
	import type { Stop } from '$lib/types';

	export let stops: Stop[];
	export let curStopCode: string;
	export let route: string;

	let stopsCopy = stops.map((stop, index) => {
		let side = index % 2 === 0 ? 'left' : 'right';
		let href = `/stop/${stop.busstopcode}`;
		return { ...stop, side, href };
	});

	const curStopIndex = stopsCopy.map((stop) => stop.busstopcode).indexOf(curStopCode);
	const stopsBefore = stopsCopy.slice(0, curStopIndex);
	const stopsAfter = stopsCopy.slice(curStopIndex, stopsCopy.length);
</script>

<div class="py-3">
	<h2 class="text-xl font-semibold mt-3 text-center mb-6">{route}</h2>
	<ul class="timeline timeline-vertical text-sm font-semibold tracking-tight">
		<!-- render first stop -> cur stop -->
		{#each stopsBefore as stop}
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
		<!-- render cur stop -> last stop -->
		{#each stopsAfter as stop, i}
			{#if stop.side === 'right'}
				<li id={i === 0 ? 'current' : ''}>
					<hr class={i === 0 ? '' : 'bg-primary'} />
					<div class="timeline-middle">
						<Icons.timestep active={true} />
					</div>
					<a href={stop.href} class="timeline-end timeline-box">{stop?.stop_name}</a>
					<hr class="bg-primary" />
				</li>
			{:else}
				<li>
					<hr class="bg-primary" />
					<div class="timeline-middle">
						<Icons.timestep active={true} />
					</div>
					<a href={stop.href} class="timeline-start timeline-box">{stop?.stop_name}</a>
					<hr class="bg-primary" />
				</li>
			{/if}
		{/each}
	</ul>
</div>
