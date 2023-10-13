import { NEXTBUS_BASIC_AUTH, NEXTBUS_API_URL } from '$env/static/private';
import { fail, type Actions } from '@sveltejs/kit';

type Bookmark = {
    caption: string,
    name: string,
}

const headers = {
    Authorization: `Basic ${NEXTBUS_BASIC_AUTH}`
};

export async function load({ fetch, params }) {

    async function get_etas(stop: string) : Promise<BusStopTiming> {
    
        const resp = await fetch(NEXTBUS_API_URL + '/ShuttleService?busstopname=' + stop, {
            headers: headers
        });
    
        const res = await resp.json();
    
        const result = res.ShuttleServiceResult;
        const shuttles = result.shuttles;
    
        const res_d: BusStopTiming = {
            lastUpdated: result.TimeStamp,
            busStopName: result.name,
            busStopCaption: result.caption,
            timings: []
        };
    
        for (const shuttle of shuttles) {
            const name = shuttle.name;
            const d: any = { name };
    
            const arrivalTime = shuttle.arrivalTime;
            const arrivalTime_veh_plate = shuttle.arrivalTime_veh_plate;
            const nextArrivalTime = shuttle.nextArrivalTime;
            const nextArrivalTime_veh_plate = shuttle.nextArrivalTime_veh_plate;
    
            if (arrivalTime_veh_plate || nextArrivalTime_veh_plate) {
                d.busStopCode = shuttle.busstopcode;
                d.arrivalTime = arrivalTime;
                d.arrivalTime_veh_plate = arrivalTime_veh_plate;
                d.nextArrivalTime = nextArrivalTime;
                d.nextArrivalTime_veh_plate = nextArrivalTime_veh_plate;
            } else {
                d.arrivalTime = arrivalTime;
                d.nextArrivalTime = nextArrivalTime;
            }
    
            res_d.timings.push(d);
        }
    
        return res_d;
    }

    async function get_active_bus(route: string): Promise<ActiveBus[]> {
    
        const active_buses = await fetch(NEXTBUS_API_URL + '/ActiveBus?route_code=' + route, {
            headers: headers
        });
    
        const res = await active_buses.json();
    
        return res.ActiveBusResult.activebus.map((bus : any) => ({
            route: route,
            vehplate: bus.vehplate,
            occupancy: bus.loadInfo.occupancy,
            capacity: bus.loadInfo.capacity,
            ridership: bus.loadInfo.ridership
        }));
    }

    function get_route_list(etas: BusStopTiming) {
        const res = [];
    
        for (const timing of etas.timings) {
            if (timing.name.startsWith('PUB')) {
                continue;
            }
            res.push(timing.name);
        }
    
        return res;
    }

    function joinCapacityAndRidership(timings: BusStopTiming, vehicles: ActiveBus[][]) {
        const vehplateToCapacityAndRidership = new Map();
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
                const capacityAndRidership = vehplateToCapacityAndRidership.get(timing.arrivalTime_veh_plate);
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

    const timings = await get_etas(params.stopName);
    const routeList = get_route_list(timings)
	const routePromises = routeList.map((route) => get_active_bus(route));
	const ridership = await Promise.all(routePromises);
    
    return {
        etas: joinCapacityAndRidership(timings, ridership)
    }

}

export const actions: Actions = {
    addBookmark: async ({ url, cookies }) => {
        const id = url.searchParams.get("id");
        const caption = url.searchParams.get("caption");

        if (!id || !caption) {
            return fail(400, { message: "Invalid Request" })
        }

        try {
            const bookmarksOld: Bookmark[] = JSON.parse(cookies.get('bookmarks') || "[]")
            const bookmarksNew: Bookmark[] = [...bookmarksOld, {caption: caption, name: id}]
            cookies.set('bookmarks', JSON.stringify(bookmarksNew), {
                path: '/',
                maxAge: 60*60*24*365,
            })

        } catch (err) {
            console.error(err)
            return fail(500, {
                message: "Something went wrong",
            })
        }

        return {
            status: 200,
        }
    }
};