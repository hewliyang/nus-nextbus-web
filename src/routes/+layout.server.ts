import type { PageServerLoad } from "./$types";

// pass bookmarks array to page.svelte to SSR the stored bookmarks in cookies

export const load: PageServerLoad = ({ cookies }) => {
    return {
        bookmarks: JSON.parse(cookies.get('bookmarks') || "[]"),
        alert: JSON.parse(cookies.get('alert') || 'true')
    }
};