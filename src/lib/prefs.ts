/** Client-side persistence for lightweight preferences (theme uses a form
 *  action; these are written directly — the server reads them on next load). */
export function setPref(name: 'uisize' | 'locpref' | 'colortheme', value: string): void {
	document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/** The data-uisize steps defined in app.css, as user-facing percentages. */
export const UI_SIZES = [100, 115, 130, 145, 160] as const;

export function applyUiSize(step: number): void {
	document.documentElement.setAttribute('data-uisize', String(step));
	setPref('uisize', String(step));
}
