<script lang="ts">

    type Stop = {
        seq: number,
        stop_name: string,
        busstopcode: string,
    }

    export let stops: Stop[];
    export let curStopCode: string;
    export let route: string;

    const stopsCopy = [...stops]

    // get first and last stop
    var firstStop = stopsCopy[0]
    var lastStop = stopsCopy[stops.length-1]

    const curStopIndex = stopsCopy.map(stop => stop.busstopcode).indexOf(curStopCode)
    const curStop = stopsCopy[curStopIndex]
    const stopsBefore: Stop[] = stopsCopy.slice(1, curStopIndex)
    const stopsAfter: Stop[] = stopsCopy.slice(curStopIndex+1, -1)
</script>

<div class="flex flex-col justify-center items-center">
    <h2 class="text-xl font-semibold mt-3">{route}</h2>
    <div class="p-4">
        <ul class="steps steps-vertical">
            {#if curStop === firstStop}
                <li class="step step-secondary">{firstStop?.stop_name}</li>
            {:else}
                <li class="step step-primary">{firstStop?.stop_name}</li>
            {/if}
            {#each stopsBefore as { stop_name }}
                <li class="step">{stop_name}</li>
            {/each}
            {#if curStop != firstStop && curStop != lastStop}
                <li id="current" class="step step-secondary">{curStop.stop_name}</li>
            {/if}
            {#each stopsAfter as { stop_name }}
                <li class="step step-success">{stop_name}</li>
            {/each} 
            {#if curStop === lastStop}
                <li class="step step-secondary">{lastStop?.stop_name}</li>
            {:else}
                <li class="step step-primary">{lastStop?.stop_name}</li>
            {/if}
        </ul>
    </div>
</div>
