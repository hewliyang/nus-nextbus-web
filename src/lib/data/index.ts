import stopsJson from './stops.json';
import routesJson from './routes.json';
import type { RoutesMap, SearchStop } from '$lib/types';

export const stops = stopsJson as SearchStop[];
export const routes = routesJson as RoutesMap;
