import type { Bookmark, ColorTheme } from '$lib/types';

declare global {
	namespace App {
		interface LayoutData {
			bookmarks: Bookmark[];
			alert: boolean;
			theme: ColorTheme;
		}
	}
}

export {};
