export type FmsErrorBody = {
	result: false;
	error: number;
};

export type UnivusResponse<T> = {
	code: string;
	msg?: string;
	data: T;
};

export type AccessTokenData = {
	token: string;
	userid: string;
	domain: string;
};

export type InitDataPayload = {
	tokens?: { nextbus_token2?: string };
	'bus-stop-color'?: { BUS: string; COLOR_CODE: string; COLOR_FONT: string }[];
};

export type FmsShuttle = {
	name: string;
	arrivalTime: string;
	nextArrivalTime: string;
	arrivalTime_veh_plate?: string;
	nextArrivalTime_veh_plate?: string;
	busstopcode?: string;
};

export type ShuttleServiceResult = {
	Timestamp?: string;
	TimeStamp?: string;
	name: string;
	caption: string;
	shuttles?: FmsShuttle[];
};

export type ShuttleServiceResponse = {
	ShuttleServiceResult?: ShuttleServiceResult;
} & Partial<FmsErrorBody>;

export type FmsActiveBus = {
	vehplate: string;
	loadInfo: {
		occupancy: number;
		capacity: number;
		ridership: number;
	};
};

export type ActiveBusResponse = {
	ActiveBusResult?: { activebus?: FmsActiveBus[] };
} & Partial<FmsErrorBody>;

export type FmsJson = Record<string, unknown>;
