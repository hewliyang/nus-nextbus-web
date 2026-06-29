<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/inter';
	import Icon from '$lib/components/Icon.svelte';
	import GitHub from '$lib/icons/github.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { dev } from '$app/environment';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const theme = $derived($page.data.theme);
	const nextTheme = $derived(theme === 'dark' ? 'light' : 'dark');
	const pathname = $derived($page.url.pathname);
	// The home page is a full-bleed map + bottom sheet, so it owns the whole
	// viewport (no header/footer/container chrome). Other pages keep the column.
	const isHome = $derived(pathname === '/');
	// The stop detail page has its own back link + title + actions, so the global
	// header is redundant chrome there (its route sub-page keeps the header).
	const isStopDetail = $derived(pathname.startsWith('/stop/') && !pathname.includes('/route/'));

	const applyTheme: SubmitFunction = ({ action }) => {
		const t = action.searchParams.get('theme');
		if (t) document.documentElement.setAttribute('data-theme', t);
	};
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

{#if isHome}
	<div class="relative mx-auto h-[100dvh] w-full max-w-xl overflow-hidden bg-bg">
		{@render children()}

		<!-- floating theme toggle over the map -->
		<form method="POST" use:enhance={applyTheme} class="absolute right-3 top-3 z-30">
			<button
				formaction="/?/setTheme&theme={nextTheme}&redirectTo=/"
				class="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface/90 text-ink-soft shadow-card backdrop-blur-md transition-colors hover:bg-surface"
				aria-label="Toggle {nextTheme} mode"
			>
				<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
			</button>
		</form>
	</div>
{:else}
	<div class="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-4 sm:px-5">
		{#if !isStopDetail}
			<header
				class="sticky top-0 z-30 -mx-4 mb-1 flex items-center justify-between gap-3 bg-bg/85 px-4 py-3 backdrop-blur-md sm:-mx-5 sm:px-5"
			>
				<a href="/" class="shrink-0">
					<img
						src="/logo.png"
						alt="NUS LiveBus"
						class="h-9 w-9 rounded-lg object-cover shadow-sm"
						width="36"
						height="36"
					/>
				</a>

				<form method="POST" use:enhance={applyTheme}>
					<button
						formaction="/?/setTheme&theme={nextTheme}&redirectTo={pathname}"
						class="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-ink-soft shadow-sm transition-colors hover:bg-surface-2"
						aria-label="Toggle {nextTheme} mode"
					>
						<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
					</button>
				</form>
			</header>
		{/if}

		<main class="flex-1 pb-3 {isStopDetail ? 'pt-[max(0.75rem,env(safe-area-inset-top))]' : 'pt-3'}">
			{@render children()}
		</main>

		<footer class="mt-6 flex items-center justify-between py-4 text-xs text-muted">
			<a
				href="https://github.com/ianfromdover/nus-livebus"
				class="flex items-center gap-1.5 transition-colors hover:text-ink"
				aria-label="GitHub repository"
			>
				<GitHub />
				<span class="font-medium">Source</span>
			</a>
			<span class="font-mono font-medium">
				<a href="https://hewliyang.com" class="transition-colors hover:text-ink">hewliyang</a>
				and
				<a href="https://github.com/ianfromdover" class="transition-colors hover:text-ink">ianfromdover</a>
				· {new Date().getFullYear()}
			</span>
		</footer>
	</div>
{/if}
