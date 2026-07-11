import { describe, expect, it } from 'vitest';
import { routeTerminal } from '$lib/routes';
import { dedupeTerminalVariants, formatArrival } from '$lib/timings';
import type { Timing } from '$lib/types';

const timing = (name: string, busStopCode: string): Timing => ({
	name,
	busStopCode,
	arrivalTime: '2',
	nextArrivalTime: '5'
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
});
