import stopsJson from './stops.json';
import routesJson from './routes.json';
import schedulesJson from './schedules.json';
import type { RoutesMap, SearchStop, SchedulesMap } from '$lib/types';

export const stops = stopsJson as SearchStop[];
export const routes = routesJson as RoutesMap;
// First/last bus timings, keyed by route. Sparse placeholder data for now —
// real NUS ISB operating hours to be filled in; the UI hides routes with no entry.
export const schedules = schedulesJson as SchedulesMap;
