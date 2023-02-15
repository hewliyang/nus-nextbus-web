<script lang="ts">
	import { enhance, type SubmitFunction } from "$app/forms";
    import { page } from "$app/stores";
    import SEO from "../components/SEO.svelte";
    import "../app.css"
    import { dev } from '$app/environment';
    import { inject } from '@vercel/analytics';

    inject({ mode: dev ? 'development' : 'production' });

    const submitUpdateTheme: SubmitFunction = ({action}) => {
        const theme = action.searchParams.get('theme')

        if (theme) {
            document.documentElement.setAttribute('data-theme', theme)
        }
    };

</script>

<div class="max-w-2xl mx-auto p-6 flex flex-col items-center justify-between min-h-screen">
    <div class="navbar">
        <div class="flex-1">
            <h1 class="font-bold text-2xl"><a href="/">BetterNextBus</a></h1>
        </div>
        <div>
            <ul class="menu menu-horizontal px-1 z-50">
                <li>
                    <button class="border btn-md" aria-label="switch-theme">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M7.5 2c-1.79 1.15-3 3.18-3 5.5s1.21 4.35 3.03 5.5C4.46 13 2 10.54 2 7.5A5.5 5.5 0 0 1 7.5 2m11.57 1.5l1.43 1.43L4.93 20.5L3.5 19.07L19.07 3.5m-6.18 2.43L11.41 5L9.97 6l.42-1.7L9 3.24l1.75-.12l.58-1.65L12 3.1l1.73.03l-1.35 1.13l.51 1.67m-3.3 3.61l-1.16-.73l-1.12.78l.34-1.32l-1.09-.83l1.36-.09l.45-1.29l.51 1.27l1.36.03l-1.05.87l.4 1.31M19 13.5a5.5 5.5 0 0 1-5.5 5.5c-1.22 0-2.35-.4-3.26-1.07l7.69-7.69c.67.91 1.07 2.04 1.07 3.26m-4.4 6.58l2.77-1.15l-.24 3.35l-2.53-2.2m4.33-2.7l1.15-2.77l2.2 2.54l-3.35.23m1.15-4.96l-1.14-2.78l3.34.24l-2.2 2.54M9.63 18.93l2.77 1.15l-2.53 2.19l-.24-3.34Z"/></svg>
                    </button>
                    <ul class="p-2 bg-base-200">
                        <form method="POST" use:enhance={submitUpdateTheme}>
                            <li>
                                <button formaction="/?/setTheme&theme=halloween&redirectTo={$page.url.pathname}" aria-label="dark-theme">Dark</button>
                            </li>
                            <li>
                                <button formaction="/?/setTheme&theme=light&redirectTo={$page.url.pathname}" aria-label="light-theme">Light</button>
                            </li>
                        </form>
                    </ul>
                </li>
            </ul>
        </div>
    </div> 
    <div class="flex justify-center items-center space-x-5 p-5">
        <a class="btn btn-info rounded-xl" href="/">Stops</a>
        <a class="btn btn-warning rounded-xl" href="/busroutes">All Routes</a>
    </div>
    
    <slot />

    <footer class="footer px-10 py-4 border-t bg-base-200 text-base-content border-base-300 inset-x-0 bottom-0 mt-auto rounded-2xl flex items-center justify-center">
        <div class="flex items-center grid-flow-col">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 15 15"><path fill="currentColor" d="M2 3c0-1.1.9-2 2-2h7c1.1 0 2 .9 2 2v8c0 1-1 1-1 1v1c0 .55-.45 1-1 1s-1-.45-1-1v-1H5v1c0 .55-.45 1-1 1s-1-.45-1-1v-1c-1 0-1-1-1-1V3Zm1.5 1c-.28 0-.5.22-.5.5v3c0 .28.22.5.5.5h8c.28 0 .5-.22.5-.5v-3c0-.28-.22-.5-.5-.5h-8ZM4 9c-.55 0-1 .45-1 1s.45 1 1 1s1-.45 1-1s-.45-1-1-1Zm7 0c-.55 0-1 .45-1 1s.45 1 1 1s1-.45 1-1s-.45-1-1-1ZM4 2.5c0 .28.22.5.5.5h6c.28 0 .5-.22.5-.5s-.22-.5-.5-.5h-6c-.28 0-.5.22-.5.5Z"/></svg>
          <p>© {new Date().getFullYear()} <a href="https://hewliyang.tech" class="hover:underline font-semibold">hewliyang</a><br/>Open Source: <a href="https://github.com/hewliyang/nus-betternextbus" class="hover:underline font-semibold">GitHub Repo</a></p>
        </div> 
    </footer>
</div>

<SEO />