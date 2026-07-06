<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import { routeColor, routeTextColor } from '$lib/routes';
	import { setPref, applyUiSize, UI_SIZES } from '$lib/prefs';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';

	// Local optimistic copies — flipped instantly on tap, reconciled with the
	// cookie-derived layout data via targeted invalidations (never invalidateAll).
	let themeDark = $state($page.data.theme === 'dark');
	let uiStep = $state<number>($page.data.uiSize ?? 0);
	let locOn = $state($page.data.locPref === 'on');

	async function toggleTheme() {
		themeDark = !themeDark;
		const next = themeDark ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', next);
		setPref('colortheme', next);
		await invalidate('app:theme');
	}

	function setStep(step: number) {
		uiStep = Math.min(UI_SIZES.length - 1, Math.max(0, step));
		applyUiSize(uiStep);
		void invalidate('app:prefs');
	}

	async function toggleLocation() {
		locOn = !locOn;
		setPref('locpref', locOn ? 'on' : 'off');
		if (locOn && navigator.geolocation) {
			// Surface the browser permission prompt right away so the choice is
			// effective by the time the user returns to the map.
			navigator.geolocation.getCurrentPosition(
				() => {},
				() => {},
				{ timeout: 10_000 }
			);
		}
		await invalidate('app:prefs');
	}

	// Sample arrivals for the size preview — static, no polling.
	const sampleRows = [
		{ route: 'D2', dest: 'COM 3', eta: '4, 12' },
		{ route: 'A1', dest: 'Kent Ridge Bus Terminal', eta: '7, 15' }
	];
</script>

<section class="fade-up space-y-4">
	<a
		href="/"
		class="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[0.8125rem] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
	>
		<Icon name="arrow-left" size={15} /> Home
	</a>

	<!-- Appearance -->
	<div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
		<h2
			class="border-b border-border px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted"
		>
			Appearance
		</h2>

		<div class="flex items-center justify-between gap-3 border-b border-border px-3.5 py-3">
			<span class="flex items-center gap-2.5 text-[0.9375rem] font-medium text-ink">
				<span class="text-muted"><Icon name={themeDark ? 'moon' : 'sun'} size={17} /></span>
				Dark mode
			</span>
			<Switch checked={themeDark} label="Dark mode" onToggle={toggleTheme} />
		</div>

		<div class="space-y-3 px-3.5 py-3">
			<div class="flex items-center justify-between gap-3">
				<span class="text-[0.9375rem] font-medium text-ink">UI size</span>
				<div class="flex items-center gap-2">
					<button
						onclick={() => setStep(uiStep - 1)}
						disabled={uiStep === 0}
						class="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-ink-soft shadow-sm transition-colors hover:bg-surface-2 disabled:opacity-40"
						aria-label="Decrease UI size"
					>
						<Icon name="minus" size={16} />
					</button>
					<span class="w-12 text-center text-[0.9375rem] font-semibold tabular-nums text-ink">
						{UI_SIZES[uiStep]}%
					</span>
					<button
						onclick={() => setStep(uiStep + 1)}
						disabled={uiStep === UI_SIZES.length - 1}
						class="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-ink-soft shadow-sm transition-colors hover:bg-surface-2 disabled:opacity-40"
						aria-label="Increase UI size"
					>
						<Icon name="plus" size={16} />
					</button>
				</div>
			</div>

			<!-- static preview card (the whole app rescales live as you tap +/-) -->
			<div class="overflow-hidden rounded-xl border border-border bg-bg" aria-hidden="true">
				<div class="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
					<span class="shrink-0 text-accent"><Icon name="bus" size={18} /></span>
					<span class="truncate text-[0.9375rem] font-semibold text-ink">Central Library</span>
				</div>
				<ul>
					{#each sampleRows as r (r.route)}
						<li class="flex items-center gap-3 border-b border-border px-3.5 py-2.5 last:border-0">
							<span
								class="grid h-7 min-w-[1.9rem] shrink-0 place-items-center rounded-md px-1 font-mono text-xs font-bold"
								style="background: {routeColor(r.route)}; color: {routeTextColor(r.route)}"
							>
								{r.route}
							</span>
							<span class="min-w-0 flex-1 truncate text-[0.8125rem] text-ink-soft">{r.dest}</span>
							<span class="shrink-0 whitespace-nowrap text-right">
								<span class="text-[0.9375rem] font-semibold tabular-nums text-ink">{r.eta}</span>
								<span class="ml-1 text-[0.6875rem] font-medium text-muted">min</span>
							</span>
						</li>
					{/each}
				</ul>
			</div>
			<p class="text-[0.6875rem] leading-relaxed text-muted">
				Scales all text and controls. The two largest sizes hide minor details (like vehicle plates)
				so timings stay easy to scan.
			</p>
		</div>
	</div>

	<!-- Location -->
	<div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
		<h2
			class="border-b border-border px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted"
		>
			Location
		</h2>
		<div class="flex items-center justify-between gap-3 px-3.5 py-3">
			<span class="flex items-center gap-2.5 text-[0.9375rem] font-medium text-ink">
				<span class="text-muted"><Icon name="pin" size={17} /></span>
				Enable location
			</span>
			<Switch checked={locOn} label="Enable location" onToggle={toggleLocation} />
		</div>
		<p class="border-t border-border px-3.5 py-2 text-[0.6875rem] leading-relaxed text-muted">
			Sorts the home screen by the stops nearest to you. Remembered on this device; your browser may
			still ask for permission.
		</p>
	</div>
</section>
