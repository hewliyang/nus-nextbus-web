<script lang="ts">
    import BusRoute from "../../components/BusRoute.svelte";
    import routeA2 from "$lib/data/route_A2.json";
    import routeA1 from "$lib/data/route_A1.json";
    import routeD1 from "$lib/data/route_D1.json";
    import routeD2 from "$lib/data/route_D2.json";
    import routeBTC from "$lib/data/route_BTC.json";
    import routeK from "$lib/data/route_K.json";
    import routeE from "$lib/data/route_E.json";
    import routeL from "$lib/data/route_L.json";

    const stopsA2 = routeA2.route;
    const stopsA1 = routeA1.route;
    const stopsD1 = routeD1.route;
    const stopsD2 = routeD2.route;
    const stopsBTC = routeBTC.route;
    const stopsK = routeK.route;
    const stopsE = routeE.route;
    const stopsL = routeL.route;

</script>

<h1 class="text-2xl font-bold mb-5">Routes</h1>

<h2 class="text-xl font-semibold mb-3" id="A1"> A1 </h2>
<BusRoute stops={stopsA1}/>

<h2 class="text-xl font-semibold mb-3" id="A2"> A2 </h2>
<BusRoute stops={stopsA2}/>

<h2 class="text-xl font-semibold mb-3" id="D1"> D1 </h2>
<BusRoute stops={stopsD1}/>

<h2 class="text-xl font-semibold mb-3" id="D2"> D2 </h2>
<BusRoute stops={stopsD2}/>

<h2 class="text-xl font-semibold mb-3" id="BTC"> BTC </h2>
<BusRoute stops={stopsBTC}/>

<h2 class="text-xl font-semibold mb-3" id="K"> K </h2>
<BusRoute stops={stopsK}/>

<h2 class="text-xl font-semibold mb-3" id="E"> E </h2>
<BusRoute stops={stopsE}/>

<h2 class="text-xl font-semibold mb-3" id="L"> L </h2>
<BusRoute stops={stopsL}/>
