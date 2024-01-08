import type { Bookmark } from '$lib/types';

// pass bookmarks array to page.svelte to SSR the stored bookmarks in cookies
export const load = ({ cookies }) => {
	return {
		bookmarks: JSON.parse(cookies.get('bookmarks') || '[]') as Bookmark,
		alert: JSON.parse(cookies.get('alert') || 'true') as boolean
	};
};
