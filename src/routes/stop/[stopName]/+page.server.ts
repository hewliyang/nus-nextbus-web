import { error, fail, type Actions } from '@sveltejs/kit';
import { fmsFetch } from '$lib/server/nextbus';
import type { ActiveBusResponse, FmsShuttle, ShuttleServiceResponse } from '$lib/server/fms-types';
import { routesServingStop, stopCoord } from '$lib/routes';
import { parseBookmarks } from '$lib/parse';
import type { BusStopTiming, ActiveBus, Bookmark, Timing } from '$lib/types';
import type { PageServerLoad } from './$types';

function shuttleToTiming(shuttle: FmsShuttle): Timing {
	const etas = shuttle._etas ?? [];
	const timing: Timing = {
		name: shuttle.name,
		arrivalTime: shuttle.arrivalTime,
		nextArrivalTime: shuttle.nextArrivalTime,
		arrivalTime_ts: etas[0]?.ts,
		nextArrivalTime_ts: etas[1]?.ts
	};
	if (shuttle.arrivalTime_veh_plate || shuttle.nextArrivalTime_veh_plate) {
		timing.busStopCode = shuttle.busstopcode;
		timing.arrivalTime_veh_plate = shuttle.arrivalTime_veh_plate;
		timing.nextArrivalTime_veh_plate = shuttle.nextArrivalTime_veh_plate;
	}
	return timing;
}

export const load: PageServerLoad = async ({ params }) => {
	async function get_etas(stop: string): Promise<BusStopTiming> {
		const res = await fmsFetch<ShuttleServiceResponse>('ShuttleService', { busstopname: stop });

		const result = res.ShuttleServiceResult;
		if (!result) {
			throw new Error(`ShuttleService error: ${JSON.stringify(res).slice(0, 120)}`);
		}
		const shuttles = result.shuttles ?? [];

		return {
			lastUpdated: result.Timestamp ?? result.TimeStamp ?? new Date().toISOString(),
			busStopName: result.name,
			busStopCaption: result.caption,
			timings: shuttles.map(shuttleToTiming)
		};
	}

	async function get_active_bus(route: string): Promise<ActiveBus[]> {
		const res = await fmsFetch<ActiveBusResponse>('ActiveBus', { route_code: route });
		const buses = res.ActiveBusResult?.activebus ?? [];

		return buses.map((bus) => ({
			route,
			vehplate: bus.vehplate,
			occupancy: bus.loadInfo.occupancy,
			capacity: bus.loadInfo.capacity,
			ridership: bus.loadInfo.ridership
		}));
	}

	function get_route_list(etas: BusStopTiming): string[] {
		const res: string[] = [];

		for (const timing of etas.timings) {
			if (timing.name.startsWith('PUB')) {
				continue;
			}
			res.push(timing.name);
		}

		return res;
	}

	function joinCapacityAndRidership(timings: BusStopTiming, vehicles: ActiveBus[][]) {
		const vehplateToCapacityAndRidership = new Map<
			string,
			{ capacity: number; ridership: number }
		>();
		for (const vehicleList of vehicles) {
			for (const vehicle of vehicleList) {
				vehplateToCapacityAndRidership.set(vehicle.vehplate, {
					capacity: vehicle.capacity,
					ridership: vehicle.ridership
				});
			}
		}

		for (const timing of timings.timings) {
			if (timing.arrivalTime_veh_plate) {
				const capacityAndRidership = vehplateToCapacityAndRidership.get(
					timing.arrivalTime_veh_plate
				);
				if (capacityAndRidership) {
					timing.arrivalTime_capacity = capacityAndRidership.capacity;
					timing.arrivalTime_ridership = capacityAndRidership.ridership;
				}
			}
			if (timing.nextArrivalTime_veh_plate) {
				const capacityAndRidership = vehplateToCapacityAndRidership.get(
					timing.nextArrivalTime_veh_plate
				);
				if (capacityAndRidership) {
					timing.nextArrivalTime_capacity = capacityAndRidership.capacity;
					timing.nextArrivalTime_ridership = capacityAndRidership.ridership;
				}
			}
		}

		return timings;
	}

	try {
		const timings = await get_etas(params.stopName);
		const routeList = get_route_list(timings);
		const routePromises = routeList.map((route) => get_active_bus(route));
		const ridership = await Promise.all(routePromises);

		return {
			etas: joinCapacityAndRidership(timings, ridership),
			degraded: false as const
		};
	} catch (e) {
		console.error('Failed to load shuttle timings:', e);

		const serving = routesServingStop(params.stopName);
		if (serving.length > 0) {
			const etas: BusStopTiming = {
				lastUpdated: new Date().toISOString(),
				busStopName: params.stopName,
				busStopCaption: stopCoord(params.stopName)?.caption ?? params.stopName,
				timings: serving.map((name) => ({ name, arrivalTime: '-', nextArrivalTime: '-' }))
			};
			return { etas, degraded: true as const };
		}

		throw error(502, "Couldn't reach the NUS shuttle service. Try again in a moment.");
	}
};

export const actions: Actions = {
	addBookmark: async ({ url, cookies }) => {
		const id = url.searchParams.get('id');
		const caption = url.searchParams.get('caption');

		if (!id || !caption) {
			return fail(400, { message: 'Invalid Request' });
		}

		try {
			const bookmarksOld = parseBookmarks(cookies.get('bookmarks') || '[]');
			const bookmarksNew: Bookmark[] = [...bookmarksOld, { caption, name: id }];
			cookies.set('bookmarks', JSON.stringify(bookmarksNew), {
				path: '/',
				maxAge: 60 * 60 * 24 * 365
			});
		} catch (err) {
			console.error(err);
			return fail(500, {
				message: 'Something went wrong'
			});
		}

		return {
			status: 200
		};
	}
};
