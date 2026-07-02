import { parseAlert, parseBookmarks, parseTheme } from '$lib/parse';

export const load = ({ cookies, depends }) => {
	// Lets star/unstar and theme-toggle forms re-run only this cheap cookie
	// parse via invalidate(...) instead of invalidateAll().
	depends('app:bookmarks');
	depends('app:theme');
	return {
		bookmarks: parseBookmarks(cookies.get('bookmarks') || '[]'),
		alert: parseAlert(cookies.get('alert')),
		theme: parseTheme(cookies.get('colortheme'))
	};
};
