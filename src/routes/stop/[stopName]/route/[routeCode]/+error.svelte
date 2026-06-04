<script lang="ts">
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';
</script>

<section class="fade-up flex flex-col items-center gap-3 py-20 text-center">
	<span class="text-muted"><Icon name="bus" size={32} /></span>
	<h1 class="text-lg font-semibold text-ink">No info for this bus yet</h1>
	<p class="max-w-xs text-sm text-muted">
		Public service routes aren't tracked here. Try a campus shuttle instead.
	</p>
	<a
		href="/stop/{$page.params.stopName}"
		class="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg shadow-card transition-transform hover:-translate-y-0.5"
	>
		<Icon name="arrow-left" size={15} /> Back to stop
	</a>
</section>
