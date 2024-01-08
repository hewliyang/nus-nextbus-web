export type Timing = {
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
};

export type ActiveBus = {
	route: string;
	vehplate: string;
	occupancy: number;
	capacity: number;
	ridership: number;
};

export type BusStopTiming = {
	lastUpdated: string;
	busStopName: string;
	busStopCaption: string;
	timings: Timing[];
};

export type Bookmark = {
	caption: string;
	name: string;
};
