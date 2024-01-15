<script lang="ts">
	import '../app.css';
	import Icons from '$lib/icons';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { dev } from '$app/environment';
	import type { SubmitFunction } from '@sveltejs/kit';

	const submitUpdateTheme: SubmitFunction = ({ action }) => {
		const theme = action.searchParams.get('theme');

		if (theme) {
			document.documentElement.setAttribute('data-theme', theme);
		}
	};
</script>

<!-- only inject the tracking script if in prod -->
<svelte:head>
	{#if !dev}
		<script
			async
			src="https://umami.hewliyang.com/script.js"
			data-website-id="d6998608-6fea-427f-a123-c562f07e20be"
		></script>
	{/if}
</svelte:head>

<div class="max-w-2xl mx-auto px-6 pb-3 flex flex-col items-center justify-between min-h-screen">
	<nav
		class="navbar justify-between mt-3 mb-2 px-3 border bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow rounded"
	>
		<div class="flex-1">
			<h1
				class="font-semibold text-xl tracking-tighter hover:text-gray-400 dark:hover:text-gray-100"
			>
				<a href="/">NUS NextBus</a>
			</h1>
		</div>
		<div>
			<div class="flex gap-3 mr-3 items-center">
				<a class="hidden btn btn-info btn-outline btn-sm md:flex items-center" href="/">Stops</a>
				<a class="hidden btn btn-warning btn-outline btn-sm md:flex items-center" href="/busroutes"
					>Routes</a
				>
			</div>
			<ul class="dropdown dropdown-bottom dropdown-end">
				<li>
					<div
						tabindex="0"
						role="button"
						class="border rounded-xl p-1.5 border-neutral-200 dark:border-neutral-700"
						aria-label="switch-theme"
					>
						<Icons.sun />
					</div>
					<ul class="bg-base-200 rounded-xl dropdown-content z-[1] menu p-2 shadow">
						<form method="POST" use:enhance={submitUpdateTheme}>
							<li>
								<button
									formaction="/?/setTheme&theme=halloween&redirectTo={$page.url.pathname}"
									aria-label="dark-theme"
									class="rounded-xl">Dark</button
								>
							</li>
							<li>
								<button
									formaction="/?/setTheme&theme=light&redirectTo={$page.url.pathname}"
									aria-label="light-theme"
									class="rounded-xl">Light</button
								>
							</li>
						</form>
					</ul>
				</li>
			</ul>
		</div>
	</nav>
	<div class="flex justify-center items-center space-x-5 p-5 md:hidden">
		<a class="btn btn-info btn-sm" href="/">Stops</a>
		<a class="btn btn-warning btn-sm" href="/busroutes">Routes</a>
	</div>

	<slot />

	<footer
		class="footer px-3 border py-2 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-base-content inset-x-0 bottom-0 mt-auto rounded flex items-center justify-between shadow-xl text-xs"
	>
		<div class="flex items-center grid-flow-col">
			<a href="https://github.com/hewliyang/nus-betternextbus">
				<Icons.github />
			</a>
		</div>
		<div>
			<p>
				<span class="font-mono font-semibold text-success">{new Date().getFullYear()}</span>
				<a href="https://hewliyang.com" class="hover:underline font-semibold font-mono"
					>hewliyang 👋</a
				><br />
			</p>
		</div>
	</footer>
</div>
