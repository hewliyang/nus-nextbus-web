import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = ({ fetch }) => {
    const getBusStops = async () => {
        const res = await fetch('/api/busstops')
        const data = await res.json()
        return data.BusStopsResult
    }

    return {
        busStops: getBusStops(),
    }
}