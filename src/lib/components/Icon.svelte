<script lang="ts">
	interface Props {
		name: string;
		size?: number;
		stroke?: number;
	}

	let { name, size = 18, stroke = 1.75 }: Props = $props();

	const paths: Record<string, string> = {
		search: 'M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z',
		crosshair:
			'M12 22v-3M12 5V2M22 12h-3M5 12H2M12 17a5 5 0 100-10 5 5 0 000 10z',
		map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
		route:
			'M6 19a2 2 0 100-4 2 2 0 000 4zM18 9a2 2 0 100-4 2 2 0 000 4zM6 15V9a4 4 0 014-4h4',
		bus: 'M8 6v6M16 6v6M2 12h20M4 17h16a1 1 0 001-1V7a3 3 0 00-3-3H6a3 3 0 00-3 3v9a1 1 0 001 1zM7 19v1.5M17 19v1.5M6.5 17a1 1 0 100-2 1 1 0 000 2zM17.5 17a1 1 0 100-2 1 1 0 000 2z',
		refresh: 'M21 12a9 9 0 11-2.64-6.36M21 3v5h-5',
		bookmark: 'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z',
		'bookmark-fill': 'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z',
		x: 'M18 6L6 18M6 6l12 12',
		'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
		'arrow-right': 'M5 12h14M12 5l7 7-7 7',
		chevron: 'M9 18l6-6-6-6',
		sun: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
		moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
		clock: 'M12 7v5l3 2M12 22a10 10 0 100-20 10 10 0 000 20z',
		pin: 'M12 22s8-4.5 8-11a8 8 0 10-16 0c0 6.5 8 11 8 11zM12 13a3 3 0 100-6 3 3 0 000 6z',
		person:
			'M12 4a3.2 3.2 0 110 6.4 3.2 3.2 0 010-6.4zM6.5 19.2c0-3 2.5-5 5.5-5s5.5 2 5.5 5a.8.8 0 01-.8.8H7.3a.8.8 0 01-.8-.8z'
	};

	const filled = $derived(name === 'bookmark-fill' || name === 'person');
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill={filled ? 'currentColor' : 'none'}
	stroke="currentColor"
	stroke-width={stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d={paths[name] ?? ''} />
</svg>
