import { writable } from "svelte/store"
import { getDistance } from "./utils"

export interface SearchStoreModel<T extends Record<PropertyKey, any>> {
    data: T[],
    filtered: T[],
    search: string
    sort: boolean
    pos: Record<PropertyKey, any>
}

export const createSearchStore = <T extends Record<PropertyKey, any>> (data: T[]) => {

    const { subscribe, set, update } = writable<SearchStoreModel<T>>({
        data: data,
        filtered: data,
        search: '',
        sort: false,
        pos: {}
    })

    return {
        subscribe,
        set,
        update,
    }
}

export const searchHandler = <T extends Record<PropertyKey, any>> (store: SearchStoreModel<T>) => {
    if (store.sort) {
        store.filtered = store.data.sort((a, b) => {
            return getDistance(a.latitude, a.longitude, store.pos.latitude, store.pos.longitude) - getDistance(b.latitude, b.longitude, store.pos.latitude, store.pos.longitude)
        })
    }

    const searchTerm = store.search.toLowerCase() || ""
    store.filtered = store.data.filter((item) => {
        return item.searchTerms.toLowerCase().includes(searchTerm)
    })
}