import type { Timing } from '$lib/types';

export const FAR_ARRIVAL_MINUTES = 60;

export function hasArrival(time: string | undefined): boolean {
	return !!time && time !== '-';
}

export function arrivalMinutes(time: string | undefined): number | null {
	const value = Number(time);
	return Number.isNaN(value) ? null : value;
}

/**
 * Terminal responses can contain both start (-S) and end (-E) records for the
 * same route. Drop the end record only when its matching start record exists.
 */
export function dedupeTerminalVariants(timings: Timing[]): Timing[] {
	const routesWithStart = new Set(
		timings.filter((timing) => timing.busStopCode?.endsWith('-S')).map((timing) => timing.name)
	);
	return timings.filter(
		(timing) => !(timing.busStopCode?.endsWith('-E') && routesWithStart.has(timing.name))
	);
}

function clockTime(timestamp: string): string {
	const match = timestamp.match(/(\d{1,2}):(\d{2})/);
	if (!match) return timestamp;
	let hour = Number(match[1]);
	const period = hour < 12 ? 'am' : 'pm';
	hour = hour % 12 || 12;
	return `${hour}:${match[2]}${period}`;
}

export type FormattedArrival = { value: string; unit: '' | 'min' };

export function formatArrival(time: string | undefined, timestamp?: string): FormattedArrival {
	if (!hasArrival(time)) return { value: '—', unit: '' };
	const minutes = arrivalMinutes(time);
	if (minutes === null) return { value: time!, unit: '' };
	if (minutes === 0) return { value: 'Arr', unit: '' };
	if (minutes >= FAR_ARRIVAL_MINUTES && timestamp) {
		return { value: clockTime(timestamp), unit: '' };
	}
	return { value: String(minutes), unit: 'min' };
}

/**
 * Compact first+next display for stop cards. A shared trailing `min` is only
 * returned when every minute-valued part can share it — otherwise the unit is
 * inlined (e.g. `24 min, 11:04pm`) so we never render `24, 11:04pm min`.
 */
export function formatArrivalPair(timing: Timing): FormattedArrival {
	const first = formatArrival(timing.arrivalTime, timing.arrivalTime_ts);
	const next = formatArrival(timing.nextArrivalTime, timing.nextArrivalTime_ts);
	const hasFirst = first.value !== '—';
	const hasNext = next.value !== '—';

	if (hasFirst && hasNext) {
		if (first.unit === 'min' && next.unit === 'min') {
			return { value: `${first.value}, ${next.value}`, unit: 'min' };
		}
		if (first.unit === 'min') {
			return { value: `${first.value} min, ${next.value}`, unit: '' };
		}
		if (next.unit === 'min') {
			return { value: `${first.value}, ${next.value}`, unit: 'min' };
		}
		return { value: `${first.value}, ${next.value}`, unit: '' };
	}
	return hasFirst ? first : next;
}
