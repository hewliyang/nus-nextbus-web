import { parseAlert, parseBookmarks, parseTheme } from '$lib/parse';

export const load = ({ cookies }) => {
	return {
		bookmarks: parseBookmarks(cookies.get('bookmarks') || '[]'),
		alert: parseAlert(cookies.get('alert')),
		theme: parseTheme(cookies.get('colortheme'))
	};
};
