import type { PageLoad } from "./$types"

export const prerender = true;

export const load: PageLoad = ({ fetch }) => {
    const getBusStops = async () => {
        const res = await fetch('/api/busstops')
        const data = await res.json()
        return data.BusStopsResult
    }

    return {
        busStops: getBusStops(),
    }
}