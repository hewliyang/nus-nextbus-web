<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/inter';
	import GitHub from '$lib/icons/github.svelte';
	import { page } from '$app/stores';
	import { dev } from '$app/environment';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const pathname = $derived($page.url.pathname);
	// The home page is a full-bleed map + bottom sheet, so it owns the whole
	// viewport (no header/footer/container chrome). Other pages keep the column.
	const isHome = $derived(pathname === '/');
	// The stop detail page is a full-bleed map strip + drawer with its own back
	// link + title + actions, so it shares the home shell.
	const isStopDetail = $derived(pathname.startsWith('/stop/'));
	const isFullBleed = $derived(isHome || isStopDetail);
</script>

<svelte:head>
	{#if !dev}
		<script
			async
			src="https://umami.hewliyang.com/script.js"
			data-website-id="d6998608-6fea-427f-a123-c562f07e20be"
		></script>
	{/if}
</svelte:head>

{#if isFullBleed}
	<div class="relative mx-auto h-[100dvh] w-full max-w-xl overflow-hidden bg-bg">
		{@render children()}
	</div>
{:else}
	<div class="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-4 sm:px-5">
		<main class="flex-1 pb-3 pt-3">
			{@render children()}
		</main>

		<footer class="mt-6 flex items-center justify-between py-4 text-xs text-muted">
			<a
				href="https://github.com/hewliyang/nus-betternextbus"
				class="flex items-center gap-1.5 transition-colors hover:text-ink"
				aria-label="GitHub repository"
			>
				<GitHub />
				<span class="font-medium">Source</span>
			</a>
			<span class="font-mono font-medium">
				<a href="https://hewliyang.com" class="transition-colors hover:text-ink">hewliyang</a>
				and
				<a href="https://github.com/ianfromdover" class="transition-colors hover:text-ink"
					>ianfromdover</a
				>
				· {new Date().getFullYear()}
			</span>
		</footer>
	</div>
{/if}
