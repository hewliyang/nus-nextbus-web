import { writable } from 'svelte/store';
import { getDistance } from './utils';

export type GeoPosition = {
	latitude?: number;
	longitude?: number;
};

export interface Searchable {
	searchTerms: string;
	latitude: number;
	longitude: number;
}

export interface SearchStoreModel<T extends Searchable> {
	data: T[];
	filtered: T[];
	search: string;
	sort: boolean;
	pos: GeoPosition;
}

export const createSearchStore = <T extends Searchable>(data: T[]) => {
	const { subscribe, set, update } = writable<SearchStoreModel<T>>({
		data: data,
		filtered: data,
		search: '',
		sort: false,
		pos: {}
	});

	return {
		subscribe,
		set,
		update
	};
};

export const searchHandler = <T extends Searchable>(store: SearchStoreModel<T>) => {
	if (store.sort && store.pos.latitude !== undefined && store.pos.longitude !== undefined) {
		const { latitude, longitude } = store.pos;
		store.filtered = [...store.data].sort(
			(a, b) =>
				getDistance(a.latitude, a.longitude, latitude, longitude) -
				getDistance(b.latitude, b.longitude, latitude, longitude)
		);
	}

	const searchTerm = store.search.toLowerCase() || '';
	store.filtered = store.data.filter((item) => item.searchTerms.toLowerCase().includes(searchTerm));
};
