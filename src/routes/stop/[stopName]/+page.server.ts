import { NEXTBUS_BASIC_AUTH, NEXTBUS_API_URL } from '$env/static/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ fetch, params }) => {

    const fetchTimes = async (name: string) => {
        const auth = { "Authorization": `Basic ${NEXTBUS_BASIC_AUTH}`}
        const res = await fetch(`${NEXTBUS_API_URL}/ShuttleService?busstopname=${name}`, {headers: auth})
        const data = await res.json()
        return data.ShuttleServiceResult
    }

    return {
        times: fetchTimes(params.stopName)
    }
}