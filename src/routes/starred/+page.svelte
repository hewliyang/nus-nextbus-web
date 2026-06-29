<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import StopCard from '$lib/components/StopCard.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { Bookmark } from '$lib/types';

	const bookmarks = $derived(($page.data.bookmarks ?? []) as Bookmark[]);
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
			<Icon name="bookmark-fill" size={20} /> Starred stops
		</h1>
	</div>

	{#if bookmarks.length > 0}
		<div class="space-y-2.5">
			{#each bookmarks as bm (bm.name)}
				<StopCard code={bm.name} caption={bm.caption}>
					{#snippet extra()}
						<form action="?/deleteBookmark&id={bm.name}" method="POST" use:enhance>
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
			<span class="text-muted"><Icon name="bookmark" size={28} /></span>
			<p class="text-sm font-medium text-ink">No starred stops yet</p>
			<p class="max-w-xs text-xs text-muted">
				Open a stop and tap the bookmark icon to pin it here for quick access.
			</p>
		</div>
	{/if}
</section>
