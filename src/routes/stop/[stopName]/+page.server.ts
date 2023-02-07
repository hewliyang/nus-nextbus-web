import { NEXTBUS_BASIC_AUTH, NEXTBUS_API_URL } from '$env/static/private';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type Bookmark = {
    caption: string,
    name: string,
}


export const load: PageServerLoad = ({ fetch, params, setHeaders }) => {

    const fetchTimes = async (name: string) => {
        const auth = { "Authorization": `Basic ${NEXTBUS_BASIC_AUTH}`}
        const res = await fetch(`${NEXTBUS_API_URL}/ShuttleService?busstopname=${name}`, {headers: auth})
        const data = await res.json()
        setHeaders({ "cache-control": "max-age-15" })
        return data.ShuttleServiceResult
    }

    return {
        times: fetchTimes(params.stopName)
    }
}

export const actions: Actions = {
    addBookmark: async ({ url, cookies }) => {
        const id = url.searchParams.get("id");
        const caption = url.searchParams.get("caption");

        if (!id || !caption) {
            return fail(400, { message: "Invalid Request" })
        }

        try {
            const bookmarksOld: Bookmark[] = JSON.parse(cookies.get('bookmarks') || "[]")
            const bookmarksNew: Bookmark[] = [...bookmarksOld, {caption: caption, name: id}]
            cookies.set('bookmarks', JSON.stringify(bookmarksNew), {
                path: '/',
                maxAge: 60*60*24*365,
            })

        } catch (err) {
            console.error(err)
            return fail(500, {
                message: "Something went wrong",
            })
        }

        return {
            status: 200,
        }
    }
};