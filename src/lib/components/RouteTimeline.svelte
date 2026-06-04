<script lang="ts">
	import { routeColor, routeTextColor } from '$lib/routes';
	import type { RouteStop } from '$lib/types';

	interface Props {
		stops: RouteStop[];
		route: string;
		current?: string | null;
	}

	let { stops, route, current = null }: Props = $props();

	const COLS = 3;
	const CELL_H = 104;
	const NODE_Y = 34;

	const color = $derived(routeColor(route));
	const textColor = $derived(routeTextColor(route));
	const currentIdx = $derived(current ? stops.findIndex((s) => s.busstopcode === current) : -1);

	type Cell = {
		stop: RouteStop;
		i: number;
		row: number;
		col: number;
		isCurrent: boolean;
		upcoming: boolean;
		hRight: boolean;
		hLeft: boolean;
		vDown: boolean;
		vUp: boolean;
		hActive: boolean;
		vDownActive: boolean;
		vUpActive: boolean;
	};

	const segActive = (i: number) => currentIdx >= 0 && i >= currentIdx;

	const cells = $derived(
		stops.map((stop, i): Cell => {
		const row = Math.floor(i / COLS);
		const inRow = i % COLS;
		const col = row % 2 === 0 ? inRow : COLS - 1 - inRow;

		const next = stops[i + 1];
		let hRight = false;
		let hLeft = false;
		let vDown = false;
		if (next) {
			const nRow = Math.floor((i + 1) / COLS);
			if (nRow === row) {
				if (row % 2 === 0) hRight = true;
				else hLeft = true;
			} else {
				vDown = true;
			}
		}
		const prevRow = i > 0 ? Math.floor((i - 1) / COLS) : row;
		const vUp = i > 0 && prevRow !== row;

		return {
			stop,
			i,
			row,
			col,
			isCurrent: i === currentIdx,
			upcoming: currentIdx >= 0 && i >= currentIdx,
			hRight,
			hLeft,
			vDown,
			vUp,
			hActive: segActive(i),
			vDownActive: segActive(i),
			vUpActive: segActive(i - 1)
		};
		})
	);

	const rowCount = $derived(Math.ceil(stops.length / COLS));
</script>

<div
	class="grid"
	style="grid-template-columns: repeat({COLS}, minmax(0, 1fr));
		grid-auto-rows: {CELL_H}px;
		grid-template-rows: repeat({rowCount}, {CELL_H}px);"
>
	{#each cells as c (c.i)}
		<div
			class="relative"
			style="grid-row: {c.row + 1}; grid-column: {c.col + 1};"
		>
			{#if c.hRight}
				<span
					class="absolute h-[3px] w-full -translate-y-1/2 rounded-full"
					style="top: {NODE_Y}px; left: 50%;
						background: {c.hActive ? color : 'var(--border-strong)'};"
				></span>
			{/if}
			{#if c.hLeft}
				<span
					class="absolute h-[3px] w-full -translate-y-1/2 rounded-full"
					style="top: {NODE_Y}px; right: 50%;
						background: {c.hActive ? color : 'var(--border-strong)'};"
				></span>
			{/if}
			{#if c.vDown}
				<span
					class="absolute bottom-0 w-[3px] -translate-x-1/2 rounded-full"
					style="top: {NODE_Y}px; left: 50%;
						background: {c.vDownActive ? color : 'var(--border-strong)'};"
				></span>
			{/if}
			{#if c.vUp}
				<span
					class="absolute top-0 w-[3px] -translate-x-1/2 rounded-full"
					style="height: {NODE_Y}px; left: 50%;
						background: {c.vUpActive ? color : 'var(--border-strong)'};"
				></span>
			{/if}

			<a
				href="/stop/{c.stop.busstopcode}"
				class="group absolute inset-0 flex flex-col items-center"
				title={c.stop.stop_name}
			>
				<span
					class="absolute z-10 rounded-full transition-transform group-hover:scale-110
						{c.isCurrent ? 'h-[18px] w-[18px]' : 'h-3 w-3'}"
					style="top: {NODE_Y}px; left: 50%; transform: translate(-50%, -50%);
						background: {c.upcoming ? color : 'var(--surface)'};
						border: 2px solid {c.upcoming ? color : 'var(--border-strong)'};
						{c.isCurrent
						? `box-shadow: 0 0 0 4px color-mix(in oklch, ${color} 22%, transparent);`
						: ''}"
				></span>
				<span
					class="absolute left-1/2 w-[calc(100%-8px)] -translate-x-1/2 px-0.5 text-center text-[11px] font-medium leading-tight
						{c.isCurrent ? 'text-ink' : 'text-ink-soft group-hover:text-ink'}"
					style="top: {NODE_Y + 16}px;
						display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
				>
					{c.stop.stop_name}
				</span>
				{#if c.isCurrent}
					<span
						class="absolute left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
						style="bottom: 6px; background: {color}; color: {textColor};">Here</span
					>
				{/if}
			</a>
		</div>
	{/each}
</div>
