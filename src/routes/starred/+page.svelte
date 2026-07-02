<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import StopCard from '$lib/components/StopCard.svelte';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Bookmark } from '$lib/types';

	const bookmarks = $derived(($page.data.bookmarks ?? []) as Bookmark[]);

	// Optimistic removal: hide the card instantly, then reconcile with the
	// layout's cookie-derived list via invalidate('app:bookmarks') — never
	// invalidateAll(), which would re-run every load function. On failure the
	// id is dropped from `removed` so the card comes back.
	let removed = $state<string[]>([]);
	const visible = $derived(bookmarks.filter((b) => !removed.includes(b.name)));
	const removeSubmit =
		(id: string): import('@sveltejs/kit').SubmitFunction =>
		() => {
			removed = [...removed, id];
			return async ({ result }) => {
				if (result.type === 'success') {
					await invalidate('app:bookmarks');
				}
				removed = removed.filter((name) => name !== id);
			};
		};
</script>

<section class="fade-up space-y-4">
	<div>
		<a
			href="/"
			class="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-ink"
		>
			<Icon name="arrow-left" size={15} /> Home
		</a>
		<h1 class="flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
			<Icon name="star-fill" size={20} /> Starred stops
		</h1>
	</div>

	{#if visible.length > 0}
		<div class="space-y-2.5">
			{#each visible as bm (bm.name)}
				<StopCard code={bm.name} caption={bm.caption}>
					{#snippet extra()}
						<form
							action="?/deleteBookmark&id={bm.name}"
							method="POST"
							use:enhance={removeSubmit(bm.name)}
						>
							<button
								class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-bad/10 hover:text-bad"
								aria-label="Remove {bm.caption}"
							>
								<Icon name="x" size={16} />
							</button>
						</form>
					{/snippet}
				</StopCard>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center gap-2 py-16 text-center">
			<span class="text-muted"><Icon name="star" size={28} /></span>
			<p class="text-sm font-medium text-ink">No starred stops yet</p>
			<p class="max-w-xs text-xs text-muted">
				Open a stop and tap the star icon to pin it here for quick access.
			</p>
		</div>
	{/if}
</section>
