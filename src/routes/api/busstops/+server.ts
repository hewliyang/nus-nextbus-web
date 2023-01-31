import busStops from "$lib/data/bus_stops.json";

export const GET = () => {
    return new Response(JSON.stringify(busStops), { status: 200 })
}
