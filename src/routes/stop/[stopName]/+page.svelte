<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	interface Shuttles {
		name: string;
		busstopcode: string;
		arrivalTime: string;
		nextArrivalTime: string;
	}

	export let data;
	const result = data.times;
	const stopName: string = data.times.name;

	// disambiguate the terminal stations
	const terminals: string[] = ['KRB', 'OTH', 'UTOWN', 'COM3'];

	const {
		TimeStamp,
		name,
		shuttles,
		caption
	}: { TimeStamp: string; name: string; shuttles: Shuttles[]; caption: string } = result;

	let filteredShuttles: Shuttles[];

	if (terminals.includes(stopName)) {
		filteredShuttles = shuttles.filter(({ busstopcode }) => {
			const tokens = busstopcode.split('-');
			return !(tokens.length > 1 && tokens[2] === 'E');
		});
	} else {
		filteredShuttles = shuttles;
	}

	// check if current stop is already in bookmarks

	type Bookmark = {
		caption: string;
		name: string;
	};

	let bookmark_objs: Bookmark[];
	let alreadyBookmarked: boolean;

	$: bookmark_objs = $page.data.bookmarks;
	$: alreadyBookmarked = bookmark_objs.map((obj) => obj.name).includes(stopName);

	const ts = new Date(TimeStamp);
</script>

<h2 class="text-semibold text-2xl text-center mb-2 md:mt-5">{caption}</h2>

<h3>Last updated at: {ts.toLocaleString('en-SG')}</h3>

<div class="relative overflow-x-auto mt-5">
	<table class="w-full text-center">
		<!-- head -->
		<thead class="text-sm text-black uppercase dark:text-white bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
			<tr>
				<th class="px-6 py-3 rounded-l-lg">Route</th>
				<th class="px-6 py-3">Arrival</th>
				<th class="px-6 py-3 rounded-r-lg">Next Arrival</th>
			</tr>
		</thead>
		<tbody>
			{#each filteredShuttles as { name, arrivalTime, nextArrivalTime }}
				<tr class="border-b dark:border-b-gray-700 ">
					<td class="px-6 py-3 font-medium text-gray-900 dark:text-white">
						{#if name.slice(0, 3) === 'PUB'}
							<span class="text-lg font-semibold font-mono">{name.slice(4)}</span>
						{:else}
							<a
								class="text-lg font-semibold font-mono btn btn-tertiary btn-sm"
								href="/stop/{stopName}/route/{name}#current"
							>
								{name}
							</a>
						{/if}
					</td>
					<td class="px-6 py-3">{arrivalTime} <span class="text-xs">mins</span></td>
					<td class="px-6 py-3">{nextArrivalTime} <span class="text-xs">mins</span></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<div class="flex flex-row space-x-4 items-center justify-between my-3">
	<form action="?/addBookmark&id={name}&caption={caption}" method="POST" use:enhance>
		<button class="mt-3 btn btn-outline btn-warning mb-3" disabled={alreadyBookmarked}>
			{#if alreadyBookmarked}
				Bookmarked!
			{:else}
				Bookmark
			{/if}
		</button>
	</form>
	<a class="mt-3 btn btn-outline btn-error mb-3" href="/"> Home </a>
	<a class="mt-3 btn btn-outline btn-success mb-3" href="./{stopName}" data-sveltekit-reload>
		Refresh
	</a>
</div>