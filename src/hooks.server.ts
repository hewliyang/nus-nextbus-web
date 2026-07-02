import type { Handle } from '@sveltejs/kit';

const THEMES = new Set(['light', 'dark']);

export const handle = (async ({ event, resolve }) => {
	// Validated against a whitelist — these values are spliced into raw HTML,
	// so anything else (e.g. a crafted ?theme= query) must never pass through.
	const newTheme = event.url.searchParams.get('theme');
	const cookieTheme = event.cookies.get('colortheme');
	const rawTheme = newTheme ?? cookieTheme ?? '';
	const theme = THEMES.has(rawTheme) ? rawTheme : null;

	const rawSize = event.cookies.get('uisize') ?? '';
	const uisize = /^[0-4]$/.test(rawSize) ? rawSize : null;

	if (event.request.url.endsWith('__data.json')) {
		return new Response('Uh oh!', { status: 404 });
	}

	if (theme || uisize) {
		return await resolve(event, {
			transformPageChunk: ({ html }) => {
				let out = html;
				if (theme) out = out.replace('data-theme=""', `data-theme="${theme}"`);
				if (uisize) out = out.replace('data-uisize=""', `data-uisize="${uisize}"`);
				return out;
			}
		});
	}

	return await resolve(event);
}) satisfies Handle;
