interface Timing {
    name: string;
    busStopCode: string;
    arrivalTime: string;
    arrivalTime_veh_plate?: string;
    nextArrivalTime: string;
    nextArrivalTime_veh_plate?: string;
    arrivalTime_capacity?: number;
    arrivalTime_ridership?: number;
    nextArrivalTime_capacity?: number;
    nextArrivalTime_ridership?: number;
  }

interface ActiveBus {
    route: string;
    vehplate: string;
    occupancy: number;
    capacity: number;
    ridership: number;
}

interface BusStopTiming {
    lastUpdated: string;
    busStopName: string;
    busStopCaption: string;
    timings: Timing[];
}