import stopsJson from './stops.json';
import routesJson from './routes.json';
import schedulesJson from './schedules.json';
import type { RoutesMap, SearchStop, SchedulesMap } from '$lib/types';

export const stops = stopsJson as SearchStop[];
export const routes = routesJson as RoutesMap;
// First/last bus timings, keyed by route. Covers all 8 NUS ISB routes with
// researched operating hours (post 5 Jan 2026 route revamp).
export const schedules = schedulesJson as SchedulesMap;
