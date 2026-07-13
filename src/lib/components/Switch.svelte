<script lang="ts">
	interface Props {
		checked: boolean;
		label: string;
		onToggle: () => void;
	}
	let { checked, label, onToggle }: Props = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={label}
	onclick={onToggle}
	class="relative h-7 w-12 shrink-0 rounded-full border transition-colors {checked
		? 'border-accent bg-accent'
		: 'border-border-strong bg-surface-2'}"
>
	<span
		class="absolute top-0.5 h-[1.375rem] w-[1.375rem] rounded-full bg-surface shadow-card transition-[left] duration-200 ease-out"
		style="left: {checked ? 'calc(100% - 1.5rem)' : '0.125rem'}"
	></span>
</button>
