<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}
	interface Props {
		value: string;
		options: Option[];
		onSelect: (value: string) => void;
	}
	let { value, options, onSelect }: Props = $props();
</script>

<div
	class="grid gap-0.5 rounded-xl border border-border bg-surface-2 p-0.5"
	style="grid-template-columns: repeat({options.length}, minmax(0, 1fr))"
	role="tablist"
>
	{#each options as opt}
		{@const active = value === opt.value}
		<button
			role="tab"
			aria-selected={active}
			onclick={() => onSelect(opt.value)}
			class="min-h-10 rounded-[0.625rem] px-3 py-1 text-[0.8125rem] font-semibold transition-colors
				{active ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}"
		>
			{opt.label}
		</button>
	{/each}
</div>
