import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {

    if (params.routeCode.split(":")[0] == "PUB") {
        throw error(404, "Public Bus! No info (yet)")
    }

    return {
        stopName: params.stopName,
        routeCode: params.routeCode
    }
};