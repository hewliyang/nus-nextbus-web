import { unflatten } from 'devalue';
import type { BusStopTiming } from '$lib/types';

export type StopResult = { etas: BusStopTiming; degraded: boolean };

type DataNode = { type: 'data'; data: unknown[] } | { type: 'skip' } | null;

/**
 * SvelteKit's `__data.json` is `{ type: 'data', nodes: [...] }` where each
 * page/layout node carries a `devalue`-flattened `data` array. Decode each
 * candidate node and return the one whose root is our `{ etas, degraded }`
 * payload (robust against the layout node and `{ type: 'skip' }` placeholders).
 */
export function decodeStopPayload(body: unknown): StopResult {
	const nodes = (body as { nodes?: DataNode[] } | null)?.nodes;
	if (!Array.isArray(nodes)) throw new Error('unexpected __data.json shape');

	for (const node of nodes) {
		if (node && node.type === 'data' && Array.isArray(node.data)) {
			const value = unflatten(node.data) as unknown;
			if (value && typeof value === 'object' && 'etas' in value) {
				return value as StopResult;
			}
		}
	}
	throw new Error('no stop-timing node in __data.json');
}
