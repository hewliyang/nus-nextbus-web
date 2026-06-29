import { describe, it, expect } from 'vitest';
import { decodeStopPayload } from './decode';
import fixture from './__fixtures__/stop-pgp.json';

describe('decodeStopPayload', () => {
	it('decodes a real hewliyang __data.json into { etas, degraded }', () => {
		const result = decodeStopPayload(fixture);

		expect(result.etas.busStopName).toBe('PGP');
		expect(typeof result.etas.busStopCaption).toBe('string');
		expect(typeof result.etas.lastUpdated).toBe('string');
		expect(Array.isArray(result.etas.timings)).toBe(true);
		expect(typeof result.degraded).toBe('boolean');
	});

	it('skips `skip`/null nodes and finds the page node', () => {
		const body = {
			type: 'data',
			nodes: [{ type: 'skip' }, null, (fixture as { nodes: unknown[] }).nodes[2]]
		};
		expect(decodeStopPayload(body).etas.busStopName).toBe('PGP');
	});

	it('throws when no stop-timing node is present', () => {
		expect(() => decodeStopPayload({ type: 'data', nodes: [{ type: 'skip' }, null] })).toThrow();
		expect(() => decodeStopPayload({})).toThrow();
	});
});
