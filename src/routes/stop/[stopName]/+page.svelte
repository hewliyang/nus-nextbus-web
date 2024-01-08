<script lang="ts">
	import BusCapacityLabel from '$lib/components/BusCapacityLabel.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { Timing, Bookmark } from '$lib/types';

	export let data;

	const { etas } = data;
	const { busStopName, lastUpdated, busStopCaption, timings } = etas;

	// disambiguate the terminal stations
	const terminals: string[] = ['KRB', 'OTH', 'UTOWN', 'COM3'];

	let filteredShuttles: Timing[];

	if (terminals.includes(busStopName)) {
		filteredShuttles = timings.filter(({ busStopCode }) => {
			if (!busStopCode) {
				return true;
			}
			const tokens = busStopCode.split('-');
			return !(tokens.length > 1 && tokens[2] === 'E');
		});
	} else {
		filteredShuttles = timings;
	}

	// check if current stop is already in bookmarks

	let bookmark_objs: Bookmark[];
	let alreadyBookmarked: boolean;

	$: bookmark_objs = $page.data.bookmarks;
	$: alreadyBookmarked = bookmark_objs.map((obj) => obj.name).includes(busStopName);

	const ts = new Date(lastUpdated);
</script>

<div
	class="flex flex-col rounded shadow-sm items-center justify-center border-b-2 border-gray-500/30 pb-3"
>
	<div class="px-6 pt-4 text-center">
		<div class="font-bold text-2xl mb-2">{busStopCaption}</div>
	</div>
	<div class="px-6 pt-2">
		<span
			class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2 text-center"
			>{ts.toLocaleString('en-SG')}</span
		>
	</div>
</div>

<div class="relative overflow-x-auto mt-5">
	<table class="table-fixed text-center">
		<!-- head -->
		<thead
			class="text-sm text-black uppercase dark:text-white bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
		>
			<tr>
				<th class="px-6 py-3 rounded-l-lg">Route</th>
				<th class="px-6 py-3">Arrival</th>
				<th class="px-6 py-3 rounded-r-lg">Next Arrival</th>
			</tr>
		</thead>
		<tbody>
			{#each filteredShuttles as { name, arrivalTime, nextArrivalTime, arrivalTime_ridership, arrivalTime_veh_plate, arrivalTime_capacity, nextArrivalTime_capacity, nextArrivalTime_ridership, nextArrivalTime_veh_plate }}
				<tr class="border-b dark:border-b-gray-700">
					<td class="px-3 py-2 font-medium text-gray-900 dark:text-white">
						{#if name.slice(0, 3) === 'PUB'}
							<span class="text-lg font-semibold font-mono">{name.slice(4)}</span>
						{:else}
							<a
								class="text-lg font-semibold font-mono px-2.5 py-1.5 rounded border bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
								href="/stop/{busStopName}/route/{name}#current"
							>
								{name}
							</a>
						{/if}
					</td>
					<td class="px-1 py-3">
						<div class="flex flex-col items-center justify-center space-y-2">
							<div>{arrivalTime} <span class="text-xs">mins</span></div>
							<BusCapacityLabel
								capacity={arrivalTime_capacity}
								veh_plate={arrivalTime_veh_plate}
								ridership={arrivalTime_ridership}
							/>
						</div></td
					>
					<td class="px-1 py-3">
						<div class="flex flex-col items-center justify-center space-y-2">
							<div>{nextArrivalTime} <span class="text-xs">mins</span></div>
							<BusCapacityLabel
								capacity={nextArrivalTime_capacity}
								veh_plate={nextArrivalTime_veh_plate}
								ridership={nextArrivalTime_ridership}
							/>
						</div></td
					>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<div class="flex flex-row space-x-4 items-center justify-between my-3">
	<form action="?/addBookmark&id={busStopName}&caption={busStopCaption}" method="POST" use:enhance>
		<button class="mt-3 btn btn-outline btn-warning mb-3" disabled={alreadyBookmarked}>
			{#if alreadyBookmarked}
				Bookmarked!
			{:else}
				Bookmark
			{/if}
		</button>
	</form>
	<a class="mt-3 btn btn-outline btn-error mb-3" href="/"> Home </a>
	<a class="mt-3 btn btn-outline btn-success mb-3" href="/stop/{busStopName}" data-sveltekit-reload>
		Refresh
	</a>
</div>
