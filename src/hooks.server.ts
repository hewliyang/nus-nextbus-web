import type { Handle } from "@sveltejs/kit";

export const handle = (async ({ event, resolve }) => {
    let theme: string | null = null;

    const newTheme = event.url.searchParams.get("theme");
    const cookieTheme = event.cookies.get("colortheme");

    if (newTheme) {
        theme = newTheme;
    } else if (cookieTheme) {
        theme = cookieTheme;
    }

    if (event.request.url.endsWith("__data.json")) {
        return new Response("Uh oh!", { status: 404 });
    }

    if (theme) {
        return await resolve(event, {
            transformPageChunk: ({ html }) => 
                html.replace('data-theme=""', `data-theme="${theme}"`)
        });
    }

    return await resolve(event)
}) satisfies Handle;