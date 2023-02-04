<script lang="ts">
	import { enhance, type SubmitFunction } from "$app/forms";
    import { page } from "$app/stores";
    import "../app.css"

    const submitUpdateTheme: SubmitFunction = ({action}) => {
        const theme = action.searchParams.get('theme')

        if (theme) {
            document.documentElement.setAttribute('data-theme', theme)
        }
    };

</script>

<div class="max-w-2xl mx-auto p-6 flex flex-col justify-center items-center">
    <div class="navbar">
        <div class="flex-1">
            <h1 class="font-bold text-2xl"><a href="/">BetterNextBus</a></h1>
        </div>
        <div>
            <ul class="menu menu-horizontal px-1 z-50">
                <li>
                    <button class="border btn-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M7.5 2c-1.79 1.15-3 3.18-3 5.5s1.21 4.35 3.03 5.5C4.46 13 2 10.54 2 7.5A5.5 5.5 0 0 1 7.5 2m11.57 1.5l1.43 1.43L4.93 20.5L3.5 19.07L19.07 3.5m-6.18 2.43L11.41 5L9.97 6l.42-1.7L9 3.24l1.75-.12l.58-1.65L12 3.1l1.73.03l-1.35 1.13l.51 1.67m-3.3 3.61l-1.16-.73l-1.12.78l.34-1.32l-1.09-.83l1.36-.09l.45-1.29l.51 1.27l1.36.03l-1.05.87l.4 1.31M19 13.5a5.5 5.5 0 0 1-5.5 5.5c-1.22 0-2.35-.4-3.26-1.07l7.69-7.69c.67.91 1.07 2.04 1.07 3.26m-4.4 6.58l2.77-1.15l-.24 3.35l-2.53-2.2m4.33-2.7l1.15-2.77l2.2 2.54l-3.35.23m1.15-4.96l-1.14-2.78l3.34.24l-2.2 2.54M9.63 18.93l2.77 1.15l-2.53 2.19l-.24-3.34Z"/></svg>
                    </button>
                    <ul class="p-2 bg-base-200">
                        <form method="POST" use:enhance={submitUpdateTheme}>
                            <li>
                                <button formaction="/?/setTheme&theme=halloween&redirectTo={$page.url.pathname}">Dark</button>
                            </li>
                            <li>
                                <button formaction="/?/setTheme&theme=light&redirectTo={$page.url.pathname}">Light</button>
                            </li>
                        </form>
                    </ul>
                </li>
            </ul>
        </div>
    </div> 
    <div class="flex justify-center items-center space-x-5 p-5">
        <a class="btn btn-info rounded-xl" href="/">Stops</a>
        <a class="btn btn-success rounded-xl" href="/busroutes">Routes</a>
    </div>
    <slot />
</div>