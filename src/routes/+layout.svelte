<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { page } from '$app/stores';
	import SEO from '../components/SEO.svelte';
	import '../app.css';
	import { dev } from '$app/environment';
	import { inject } from '@vercel/analytics';

	inject({ mode: dev ? 'development' : 'production' });

	const submitUpdateTheme: SubmitFunction = ({ action }) => {
		const theme = action.searchParams.get('theme');

		if (theme) {
			document.documentElement.setAttribute('data-theme', theme);
		}
	};
</script>

<div class="max-w-2xl mx-auto px-6 pb-3 flex flex-col items-center justify-between min-h-screen">
	<nav class="navbar justify-between">
		<div class="flex-1">
			<h1 class="font-bold text-2xl tracking-tighter hover:text-gray-400 dark:hover:text-gray-100">
				<a href="/">NUS NextBus 🚌</a>
			</h1>
		</div>
		<div>
			<div class="flex gap-3 mr-3 items-center">
				<a class="hidden btn btn-info btn-outline btn-sm md:flex items-center" href="/">Stops</a>
				<a class="hidden btn btn-warning btn-outline btn-sm md:flex items-center" href="/busroutes"
					>All Routes</a
				>
			</div>
			<ul class="menu menu-xs menu-horizontal z-1">
				<li>
					<button
						class="border rounded-xl p-1.5 border-neutral-200 dark:border-neutral-700"
						aria-label="switch-theme"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
							<path
								fill="currentColor"
								d="M12 5q-.425 0-.713-.288T11 4V2q0-.425.288-.713T12 1q.425 0 .713.288T13 2v2q0 .425-.288.713T12 5Zm4.95 2.05q-.275-.275-.275-.687t.275-.713l1.4-1.425q.3-.3.712-.3t.713.3q.275.275.275.7t-.275.7L18.35 7.05q-.275.275-.7.275t-.7-.275ZM20 13q-.425 0-.713-.288T19 12q0-.425.288-.713T20 11h2q.425 0 .713.288T23 12q0 .425-.288.713T22 13h-2Zm-8 10q-.425 0-.713-.288T11 22v-2q0-.425.288-.713T12 19q.425 0 .713.288T13 20v2q0 .425-.288.713T12 23ZM5.65 7.05l-1.425-1.4q-.3-.3-.3-.725t.3-.7q.275-.275.7-.275t.7.275L7.05 5.65q.275.275.275.7t-.275.7q-.3.275-.7.275t-.7-.275Zm12.7 12.725l-1.4-1.425q-.275-.3-.275-.713t.275-.687q.275-.275.688-.275t.712.275l1.425 1.4q.3.275.288.7t-.288.725q-.3.3-.725.3t-.7-.3ZM2 13q-.425 0-.713-.288T1 12q0-.425.288-.713T2 11h2q.425 0 .713.288T5 12q0 .425-.288.713T4 13H2Zm2.225 6.775q-.275-.275-.275-.7t.275-.7L5.65 16.95q.275-.275.687-.275t.713.275q.3.3.3.713t-.3.712l-1.4 1.4q-.3.3-.725.3t-.7-.3ZM12 18q-2.5 0-4.25-1.75T6 12q0-2.5 1.75-4.25T12 6q2.5 0 4.25 1.75T18 12q0 2.5-1.75 4.25T12 18Zm0-2q1.65 0 2.825-1.175T16 12q0-1.65-1.175-2.825T12 8q-1.65 0-2.825 1.175T8 12q0 1.65 1.175 2.825T12 16Zm0-4Z"
							/>
						</svg>
					</button>
					<ul class="bg-base-200 rounded-xl">
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
		<a class="btn btn-warning btn-sm" href="/busroutes">All Routes</a>
	</div>

	<slot />

	<footer
		class="footer px-10 py-4 border bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-base-content inset-x-0 bottom-0 mt-auto rounded flex items-center justify-center shadow-xl"
	>
		<div class="flex items-center grid-flow-col">
			<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 15 15"
				><path
					fill="currentColor"
					d="M2 3c0-1.1.9-2 2-2h7c1.1 0 2 .9 2 2v8c0 1-1 1-1 1v1c0 .55-.45 1-1 1s-1-.45-1-1v-1H5v1c0 .55-.45 1-1 1s-1-.45-1-1v-1c-1 0-1-1-1-1V3Zm1.5 1c-.28 0-.5.22-.5.5v3c0 .28.22.5.5.5h8c.28 0 .5-.22.5-.5v-3c0-.28-.22-.5-.5-.5h-8ZM4 9c-.55 0-1 .45-1 1s.45 1 1 1s1-.45 1-1s-.45-1-1-1Zm7 0c-.55 0-1 .45-1 1s.45 1 1 1s1-.45 1-1s-.45-1-1-1ZM4 2.5c0 .28.22.5.5.5h6c.28 0 .5-.22.5-.5s-.22-.5-.5-.5h-6c-.28 0-.5.22-.5.5Z"
				/></svg
			>
			<p>
				© {new Date().getFullYear()}
				<a href="https://hewliyang.tech" class="hover:underline font-semibold">hewliyang 👋</a><br
				/>Open Source:
				<a
					href="https://github.com/hewliyang/nus-betternextbus"
					class="hover:underline font-semibold">GitHub Repo</a
				>
			</p>
		</div>
	</footer>
</div>

<SEO />
