import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

type Bookmark = {
    caption: string,
    name: string,
}

// pass bookmarks array to page.svelte to SSR the stored bookmarks in cookies
// export const load: PageServerLoad = ({ cookies }) => {
//     return {
//         bookmarks: JSON.parse(cookies.get('bookmarks') || "[]"),
//     }
// };

// ^ we already do this in layout. can reaccess using $page.data.bookmarks instead!

export const actions: Actions = {
    setTheme: async ({ url, cookies }) => {
        const theme = url.searchParams.get("theme");
        const redirectTo = url.searchParams.get("redirectTo");
        
        if (theme) {
            cookies.set("colortheme", theme, {
                path: '/',
                maxAge: 60*60*24*365,
            });
        };

        throw redirect(303, redirectTo ?? '/');
    },

    deleteBookmark: async ({ url, cookies }) => {
        const id = url.searchParams.get("id")
        if (!id) {
            return fail(400, { message: "Invalid Request" })
        }

        try {
            const bookmarksOld: Bookmark[] = JSON.parse(cookies.get('bookmarks') || "[]")
            const bookmarksNew = bookmarksOld.filter(({name}) => name !== id)
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

    },
    closeAlert: async({ cookies }) => {
        try {
            cookies.set('alert', 'false', { path: '/', maxAge: 60*60*24*365 })
        } catch (err) {
            console.error(err)
            return fail(500, {
                message: JSON.stringify(err)
            })
        } 
    }
};