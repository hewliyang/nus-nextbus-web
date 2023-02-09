import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
    return {
        stopName: params.stopName,
        routeCode: params.routeCode
    }
};