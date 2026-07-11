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

export function formatArrivalPair(timing: Timing): string {
	const first = formatArrival(timing.arrivalTime, timing.arrivalTime_ts).value;
	const next = formatArrival(timing.nextArrivalTime, timing.nextArrivalTime_ts).value;
	if (first !== '—' && next !== '—') return `${first}, ${next}`;
	return first !== '—' ? first : next;
}
