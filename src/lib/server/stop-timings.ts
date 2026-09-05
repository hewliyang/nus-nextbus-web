import { busProxy } from '$lib/server/nextbus';
import type { ActiveBusData, Shuttle, ShuttleServiceData } from '$lib/server/fms-types';
import type { ActiveBus, BusStopTiming, Timing } from '$lib/types';

export type StopResult = { etas: BusStopTiming; degraded: boolean };

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
}

export async function fetchStopTimings(stop: string): Promise<StopResult> {
	const basic = await fetchBasicStopTimings(stop);
	const { etas } = basic;
	const routes = [...new Set(etas.timings.filter((timing) => !timing.name.startsWith('PUB')).map((timing) => timing.name))];
	const active = await Promise.all(
		routes.map(async (route): Promise<ActiveBus[]> => {
			const res = await busProxy<ActiveBusData>('active-bus', { route_code: route });
			return (res.activebus ?? []).map((bus) => ({
				route,
				vehplate: bus.vehplate,
				occupancy: bus.loadInfo.occupancy,
				capacity: bus.loadInfo.capacity,
				ridership: bus.loadInfo.ridership
			}));
		})
	);
	const loads = new Map(active.flat().map((bus) => [bus.vehplate, bus]));
	for (const timing of etas.timings) {
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

	return { etas, degraded: false };
}
