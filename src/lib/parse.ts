import type { Bookmark, ColorTheme } from '$lib/types';

function isBookmark(value: unknown): value is Bookmark {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as Bookmark).name === 'string' &&
		typeof (value as Bookmark).caption === 'string'
	);
}

export function parseBookmarks(raw: string): Bookmark[] {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isBookmark);
	} catch {
		return [];
	}
}

export function parseAlert(raw: string | undefined): boolean {
	if (raw === undefined) return true;
	try {
		return JSON.parse(raw) !== false;
	} catch {
		return true;
	}
}

export function parseTheme(raw: string | undefined): ColorTheme {
	return raw === 'dark' ? 'dark' : 'light';
}
