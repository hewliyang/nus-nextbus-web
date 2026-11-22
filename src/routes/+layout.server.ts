import { parseBookmarks, parseLocPref, parseTheme, parseUiSize } from '$lib/parse';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies, depends }) => {
	// Lets star/unstar, theme-toggle, and settings forms re-run only this cheap
	// cookie parse via invalidate(...) instead of invalidateAll().
	depends('app:bookmarks');
	depends('app:theme');
	depends('app:prefs');
	return {
		bookmarks: parseBookmarks(cookies.get('bookmarks') || '[]'),
		theme: parseTheme(cookies.get('colortheme')),
		uiSize: parseUiSize(cookies.get('uisize')),
		locPref: parseLocPref(cookies.get('locpref'))
	};
};
