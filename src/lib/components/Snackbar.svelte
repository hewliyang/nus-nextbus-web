<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		message: string;
		actionLabel?: string;
		onAction?: () => void;
		icon?: string;
		loading?: boolean;
	}
	let { message, actionLabel, onAction, icon = 'pin', loading = false }: Props = $props();
</script>

<div
	class="flex items-center gap-2.5 rounded-2xl border border-border bg-surface/95 px-3.5 py-2.5 shadow-card backdrop-blur-md"
	role="status"
>
	<span class="shrink-0 text-accent {loading ? 'animate-spin' : ''}">
		<Icon name={loading ? 'refresh' : icon} size={17} />
	</span>
	<p class="flex-1 text-[13px] font-medium leading-snug text-ink-soft">{message}</p>
	{#if actionLabel}
		<button
			onclick={onAction}
			class="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-fg transition-opacity hover:opacity-90"
		>
			{actionLabel}
		</button>
	{/if}
</div>
