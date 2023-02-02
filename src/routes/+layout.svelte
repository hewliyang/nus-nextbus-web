<script lang="ts">
    import "../app.css"
</script>

<div class="max-w-2xl mx-auto p-8 flex flex-col justify-center items-center">
    <h1 class="font-bold text-3xl"><a href="/">NUS BetterNextBus</a></h1>

    <div class="flex justify-center items-center space-x-5 p-5">
        <a class="btn btn-info rounded-xl" href="/stops">Stops</a>
        <a class="btn btn-success rounded-xl" href="/busroutes">Routes</a>
    </div>

    <slot />
</div>