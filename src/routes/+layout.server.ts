import { parseAlert, parseBookmarks, parseTheme } from '$lib/parse';

export const load = ({ cookies, depends }) => {
	// Lets star/unstar forms re-run only this cheap cookie parse via
	// invalidate('app:bookmarks') instead of invalidateAll().
	depends('app:bookmarks');
	return {
		bookmarks: parseBookmarks(cookies.get('bookmarks') || '[]'),
		alert: parseAlert(cookies.get('alert')),
		theme: parseTheme(cookies.get('colortheme'))
	};
};
