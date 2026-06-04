<script lang="ts">
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';
</script>

<section class="fade-up flex flex-col items-center gap-3 py-20 text-center">
	<span class="text-muted"><Icon name="bus" size={32} /></span>
	<h1 class="text-lg font-semibold text-ink">{$page.status} · Service unavailable</h1>
	<p class="max-w-xs text-sm text-muted">
		{$page.error?.message ?? "Couldn't load timings for this stop."}
	</p>
	<div class="mt-2 flex items-center gap-2">
		<a
			href="/stop/{$page.params.stopName}"
			data-sveltekit-reload
			class="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg shadow-card transition-transform hover:-translate-y-0.5"
		>
			<Icon name="refresh" size={15} /> Retry
		</a>
		<a
			href="/"
			class="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink-soft shadow-card transition-colors hover:bg-surface-2"
		>
			<Icon name="arrow-left" size={15} /> Stops
		</a>
	</div>
</section>
