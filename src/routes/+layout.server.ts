import { parseAlert, parseBookmarks, parseLocPref, parseTheme, parseUiSize } from '$lib/parse';

export const load = ({ cookies, depends }) => {
	// Lets star/unstar, theme-toggle, and settings forms re-run only this cheap
	// cookie parse via invalidate(...) instead of invalidateAll().
	depends('app:bookmarks');
	depends('app:theme');
	depends('app:prefs');
	return {
		bookmarks: parseBookmarks(cookies.get('bookmarks') || '[]'),
		alert: parseAlert(cookies.get('alert')),
		theme: parseTheme(cookies.get('colortheme')),
		uiSize: parseUiSize(cookies.get('uisize')),
		locPref: parseLocPref(cookies.get('locpref'))
	};
};
