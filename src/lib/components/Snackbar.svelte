<script lang="ts">
	import { Button } from '@ui-sdk/svelte/button';
	import Icon from './Icon.svelte';

	interface Props {
		message: string;
		actionLabel?: string;
		onAction?: () => void;
		/** Renders a dismiss button on the left edge. */
		onClose?: () => void;
		icon?: string;
		loading?: boolean;
	}
	let { message, actionLabel, onAction, onClose, icon = 'pin', loading = false }: Props = $props();
</script>

<div
	class="flex items-center gap-2.5 rounded-2xl border border-border bg-surface/95 px-3.5 py-2.5 shadow-card backdrop-blur-md"
	role="status"
>
	{#if onClose}
		<Button
			onclick={onClose}
			class="-ml-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border-0 bg-transparent p-0 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
			aria-label="Dismiss"
		>
			<Icon name="x" size={15} />
		</Button>
	{/if}
	<span class="shrink-0 text-accent {loading ? 'animate-spin' : ''}">
		<Icon name={loading ? 'refresh' : icon} size={17} />
	</span>
	<p class="flex-1 text-[0.8125rem] font-medium leading-snug text-ink-soft">{message}</p>
	{#if actionLabel}
		<Button
			onclick={onAction}
			class="h-auto shrink-0 rounded-lg border-0 bg-accent px-3 py-1.5 text-[0.8125rem] font-semibold text-accent-fg transition-opacity hover:bg-accent hover:opacity-90"
		>
			{actionLabel}
		</Button>
	{/if}
</div>
