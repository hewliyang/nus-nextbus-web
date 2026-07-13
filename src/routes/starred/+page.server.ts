import { fail, type Actions } from '@sveltejs/kit';
import { parseBookmarks } from '$lib/parse';

export const actions: Actions = {
	deleteBookmark: async ({ url, cookies }) => {
		const id = url.searchParams.get('id');
		if (!id) {
			return fail(400, { message: 'Invalid Request' });
		}

		try {
			const bookmarksOld = parseBookmarks(cookies.get('bookmarks') || '[]');
			const bookmarksNew = bookmarksOld.filter(({ name }) => name !== id);
			cookies.set('bookmarks', JSON.stringify(bookmarksNew), {
				path: '/',
				maxAge: 60 * 60 * 24 * 365
			});
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Something went wrong' });
		}

		return { status: 200 };
	}
};
