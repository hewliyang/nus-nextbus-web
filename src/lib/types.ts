export type Timing = {
	name: string;
	busStopCode?: string;
	arrivalTime: string;
	arrivalTime_ts?: string;
	arrivalTime_veh_plate?: string;
	nextArrivalTime: string;
	nextArrivalTime_ts?: string;
	nextArrivalTime_veh_plate?: string;
	arrivalTime_capacity?: number;
	arrivalTime_ridership?: number;
	nextArrivalTime_capacity?: number;
	nextArrivalTime_ridership?: number;
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

export type RouteStop = {
	seq: number;
	stop_name: string;
	busstopcode: string;
};

export type RoutesMap = Record<string, RouteStop[]>;

export type SearchStop = {
	caption: string;
	name: string;
	LongName: string;
	ShortName: string;
	latitude: number;
	longitude: number;
};

export type RouteScheduleEntry = { first: string; last: string };
export type RouteSchedule = { weekday: RouteScheduleEntry; weekend: RouteScheduleEntry };
/** Per-route first/last bus timings. Sparse — routes without data are omitted. */
export type SchedulesMap = Record<string, RouteSchedule>;

export type ColorTheme = 'light' | 'dark';
