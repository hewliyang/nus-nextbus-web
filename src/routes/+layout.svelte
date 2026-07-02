<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/inter';
	import Icon from '$lib/components/Icon.svelte';
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
		<header
			class="sticky top-0 z-30 -mx-4 mb-1 flex items-center justify-between gap-3 bg-bg/85 px-4 py-3 backdrop-blur-md sm:-mx-5 sm:px-5"
		>
			<a href="/" class="shrink-0">
				<img
					src="/logo.png"
					alt="NUS NextBus"
					class="h-9 w-9 rounded-lg object-cover shadow-sm"
					width="36"
					height="36"
				/>
			</a>

			<!-- the dark-mode toggle lives on the Settings page now -->
			<a
				href="/settings"
				class="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-ink-soft shadow-sm transition-colors hover:bg-surface-2"
				aria-label="Settings"
			>
				<Icon name="settings" size={17} />
			</a>
		</header>

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
