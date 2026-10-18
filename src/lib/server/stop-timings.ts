import { busProxy } from '$lib/server/nextbus';
import type { ActiveBusData, Shuttle, ShuttleServiceData } from '$lib/server/fms-types';
import type { ActiveBus, BusStopTiming, Timing } from '$lib/types';

export type StopResult = { etas: BusStopTiming; degraded: boolean };

const CACHE_TTL_MS = 15_000;

type CacheEntry<T> = { value: T; expires: number };

function createTtlCache<T>(ttlMs: number) {
	const store = new Map<string, CacheEntry<T>>();
	const inflight = new Map<string, Promise<T>>();

	return async (key: string, loader: () => Promise<T>): Promise<T> => {
		const now = Date.now();
		const hit = store.get(key);
		if (hit && now < hit.expires) return hit.value;

		const pending = inflight.get(key);
		if (pending) return pending;

		const req = loader()
			.then((value) => {
				store.set(key, { value, expires: Date.now() + ttlMs });
				return value;
			})
			.finally(() => {
				inflight.delete(key);
			});

		inflight.set(key, req);
		return req;
	};
}

const cachedBasicTimings = createTtlCache<StopResult>(CACHE_TTL_MS);
const cachedActiveBuses = createTtlCache<ActiveBus[]>(CACHE_TTL_MS);

function shuttleToTiming(shuttle: Shuttle): Timing {
	const etas = shuttle._etas ?? [];
	return {
		name: shuttle.name,
		arrivalTime: shuttle.arrivalTime,
		nextArrivalTime: shuttle.nextArrivalTime,
		arrivalTime_ts: etas[0]?.ts,
		nextArrivalTime_ts: etas[1]?.ts,
		busStopCode: shuttle.busstopcode,
		arrivalTime_veh_plate: shuttle.arrivalTime_veh_plate,
		nextArrivalTime_veh_plate: shuttle.nextArrivalTime_veh_plate
	};
}

export async function fetchBasicStopTimings(stop: string): Promise<StopResult> {
	return cachedBasicTimings(stop, async () => {
		const result = await busProxy<ShuttleServiceData>('shuttle-service', { busstopname: stop });
		if (!result?.shuttles) throw new Error(`shuttle-service error: ${JSON.stringify(result).slice(0, 120)}`);

		return {
			etas: {
				lastUpdated: result.TimeStamp ?? new Date().toISOString(),
				busStopName: result.name,
				busStopCaption: result.caption,
				timings: result.shuttles.map(shuttleToTiming)
			},
			degraded: false
		};
	});
}

async function fetchRouteActiveBuses(route: string): Promise<ActiveBus[]> {
	return cachedActiveBuses(route, async () => {
		const res = await busProxy<ActiveBusData>('active-bus', { route_code: route });
		return (res.activebus ?? []).map((bus) => ({
			route,
			vehplate: bus.vehplate,
			occupancy: bus.loadInfo.occupancy,
			capacity: bus.loadInfo.capacity,
			ridership: bus.loadInfo.ridership
		}));
	});
}

export async function fetchStopTimings(stop: string): Promise<StopResult> {
	const basic = await fetchBasicStopTimings(stop);
	const timings = basic.etas.timings.map((t) => ({ ...t }));
	const routes = [
		...new Set(timings.filter((timing) => !timing.name.startsWith('PUB')).map((timing) => timing.name))
	];
	const active = await Promise.all(routes.map((route) => fetchRouteActiveBuses(route)));
	const loads = new Map(active.flat().map((bus) => [bus.vehplate, bus]));
	for (const timing of timings) {
		const first = timing.arrivalTime_veh_plate && loads.get(timing.arrivalTime_veh_plate);
		const next = timing.nextArrivalTime_veh_plate && loads.get(timing.nextArrivalTime_veh_plate);
		if (first) {
			timing.arrivalTime_capacity = first.capacity;
			timing.arrivalTime_ridership = first.ridership;
		}
		if (next) {
			timing.nextArrivalTime_capacity = next.capacity;
			timing.nextArrivalTime_ridership = next.ridership;
		}
	}

	return {
		etas: {
			...basic.etas,
			timings
		},
		degraded: false
	};
}
