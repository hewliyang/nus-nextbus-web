export type UnivusResponse<T> = {
	code: string;
	msg?: string;
	data: T;
	ts?: string;
};

export type ShuttleEta = {
	eta: number;
	eta_s?: number;
	ts: string;
	plate?: string;
};

export type Shuttle = {
	name: string;
	routeid?: number;
	busstopcode?: string;
	_etas?: ShuttleEta[];
	arrivalTime: string;
	nextArrivalTime: string;
	passengers?: string;
	nextPassengers?: string;
	arrivalTime_veh_plate?: string;
	nextArrivalTime_veh_plate?: string;
};

export type ShuttleServiceData = {
	TimeStamp: string;
	caption: string;
	name: string;
	shuttles?: Shuttle[];
	hints?: string[];
};

export type ActiveBusLoad = {
	occupancy: number;
	crowdLevel?: string;
	capacity: number;
	ridership: number;
};

export type ActiveBus = {
	vehplate: string;
	lat?: number;
	lng?: number;
	loadInfo: ActiveBusLoad;
};

export type ActiveBusData = {
	TimeStamp?: string;
	ActiveBusCount?: string;
	activebus?: ActiveBus[];
};
