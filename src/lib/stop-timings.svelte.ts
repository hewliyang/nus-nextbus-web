import type { BusStopTiming } from '$lib/types';

type StopResponse = { etas: BusStopTiming; degraded: boolean };
const POLL_MS = 20_000;

export class StopTimingsState {
	data = $state<StopResponse | null>(null);
	loading = $state(true);
	refreshing = $state(false);
	failed = $state(false);
	readonly code: string;

	#subscribers = 0;
	#request: Promise<void> | null = null;

	constructor(code: string) {
		this.code = code;
	}

	get active(): boolean {
		return this.#subscribers > 0;
	}

	acquire(): () => void {
		this.#subscribers += 1;
		if (this.#subscribers === 1) polling.activate(this);
		return () => {
			this.#subscribers = Math.max(0, this.#subscribers - 1);
			if (this.#subscribers === 0) polling.deactivate();
		};
	}

	refresh(): Promise<void> {
		if (this.#request) return this.#request;
		this.refreshing = true;
		this.#request = (async () => {
			try {
				const response = await fetch(`/api/stop/${encodeURIComponent(this.code)}`);
				if (!response.ok) throw new Error(`Stop timings request failed: ${response.status}`);
				this.data = await response.json();
				this.failed = false;
			} catch {
				this.failed = true;
			} finally {
				this.loading = false;
				this.refreshing = false;
				this.#request = null;
			}
		})();
		return this.#request;
	}
}

class StopTimingsPolling {
	#states = new Map<string, StopTimingsState>();
	#timer: ReturnType<typeof setInterval> | null = null;
	#listening = false;

	get(code: string): StopTimingsState {
		let state = this.#states.get(code);
		if (!state) {
			state = new StopTimingsState(code);
			this.#states.set(code, state);
		}
		return state;
	}

	activate(state: StopTimingsState): void {
		void state.refresh();
		if (this.#timer === null) this.#timer = setInterval(() => this.#refreshActive(), POLL_MS);
		if (!this.#listening) {
			document.addEventListener('visibilitychange', this.#onVisibilityChange);
			this.#listening = true;
		}
	}

	deactivate(): void {
		if ([...this.#states.values()].some((state) => state.active)) return;
		if (this.#timer !== null) clearInterval(this.#timer);
		this.#timer = null;
		if (this.#listening) document.removeEventListener('visibilitychange', this.#onVisibilityChange);
		this.#listening = false;
	}

	#refreshActive = (): void => {
		if (document.hidden) return;
		for (const state of this.#states.values()) {
			if (state.active) void state.refresh();
		}
	};

	#onVisibilityChange = (): void => {
		if (!document.hidden) this.#refreshActive();
	};
}

const polling = new StopTimingsPolling();

export function stopTimingsState(code: string): StopTimingsState {
	return polling.get(code);
}
