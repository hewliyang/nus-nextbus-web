import { describe, expect, it } from 'vitest';
import { routeTerminal } from '$lib/routes';
import { dedupeTerminalVariants, formatArrival, formatArrivalPair } from '$lib/timings';
import type { Timing } from '$lib/types';

const timing = (
	name: string,
	busStopCode: string,
	arrivalTime = '2',
	nextArrivalTime = '5',
	extra: Partial<Timing> = {}
): Timing => ({
	name,
	busStopCode,
	arrivalTime,
	nextArrivalTime,
	...extra
});

describe('routeTerminal', () => {
	it('returns the final regular stop instead of the loop-back sentinel', () => {
		expect(routeTerminal('D2')).toBe('TCOMS');
		expect(routeTerminal('A1')).toBe('Central Library');
	});
});

describe('timing helpers', () => {
	it('drops an end variant only when a matching start variant exists', () => {
		const timings = [
			timing('D2', 'COM3-D2-S'),
			timing('D2', 'COM3-D2-E'),
			timing('A1', 'COM3-A1-E')
		];
		expect(dedupeTerminalVariants(timings)).toEqual([timings[0], timings[2]]);
	});

	it('formats imminent and far-out arrivals consistently', () => {
		expect(formatArrival('0')).toEqual({ value: 'Arr', unit: '' });
		expect(formatArrival('12')).toEqual({ value: '12', unit: 'min' });
		expect(formatArrival('75', '2026-07-12T13:05:00+08:00')).toEqual({
			value: '1:05pm',
			unit: ''
		});
	});

	it('shares a trailing min only when both arrivals are minutes', () => {
		expect(formatArrivalPair(timing('K', 'KV', '24', '35'))).toEqual({
			value: '24, 35',
			unit: 'min'
		});
		expect(
			formatArrivalPair(
				timing('K', 'KV', '24', '75', {
					nextArrivalTime_ts: '2026-07-13T23:04:00+08:00'
				})
			)
		).toEqual({ value: '24 min, 11:04pm', unit: '' });
		expect(formatArrivalPair(timing('A1', 'OT', '0', '29'))).toEqual({
			value: 'Arr, 29',
			unit: 'min'
		});
	});
});
