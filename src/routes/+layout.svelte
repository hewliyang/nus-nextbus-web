<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/inter';
	import Icon from '$lib/components/Icon.svelte';
	import GitHub from '$lib/icons/github.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { dev } from '$app/environment';
	import type { SubmitFunction } from '@sveltejs/kit';

	$: theme = $page.data.theme;
	$: nextTheme = theme === 'dark' ? 'light' : 'dark';

	const applyTheme: SubmitFunction = ({ action }) => {
		const t = action.searchParams.get('theme');
		if (t) document.documentElement.setAttribute('data-theme', t);
	};

	const tabs = [
		{ href: '/', label: 'Stops', icon: 'bus' },
		{ href: '/busroutes', label: 'Routes', icon: 'route' }
	];
	$: pathname = $page.url.pathname;
	$: activeTab = pathname.startsWith('/busroutes') ? '/busroutes' : '/';
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

		<div class="flex items-center gap-2">
			<nav
				class="flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5 shadow-sm"
			>
				{#each tabs as tab}
					<a
						href={tab.href}
						aria-current={activeTab === tab.href ? 'page' : undefined}
						class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors
							{activeTab === tab.href
							? 'bg-accent text-accent-fg shadow-sm'
							: 'text-ink-soft hover:bg-surface-2'}"
					>
						<Icon name={tab.icon} size={15} />
						{tab.label}
					</a>
				{/each}
			</nav>

			<form method="POST" use:enhance={applyTheme}>
				<button
					formaction="/?/setTheme&theme={nextTheme}&redirectTo={pathname}"
					class="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-ink-soft shadow-sm transition-colors hover:bg-surface-2"
					aria-label="Toggle {nextTheme} mode"
				>
					<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
				</button>
			</form>
		</div>
	</header>

	<main class="flex-1 py-3">
		<slot />
	</main>

	<footer
		class="mt-6 flex items-center justify-between py-4 text-xs text-muted"
	>
		<a
			href="https://github.com/hewliyang/nus-betternextbus"
			class="flex items-center gap-1.5 transition-colors hover:text-ink"
			aria-label="GitHub repository"
		>
			<GitHub />
			<span class="font-medium">Source</span>
		</a>
		<a href="https://hewliyang.com" class="font-mono font-medium transition-colors hover:text-ink">
			hewliyang · {new Date().getFullYear()}
		</a>
	</footer>
</div>
