<script lang="ts">

    type Stop = {
        seq: number,
        stop_name: string,
        busstopcode: string,
    }

    export let stops: Stop[] = [];

    const stopsCopy = [...stops]
    const firstStop = stopsCopy.shift();
    const lastStop = stopsCopy.pop();

</script>

<div class="flex flex-col justify-center items-center mb-3">
    <div class="p-4">
        <ul class="steps steps-vertical lg:steps-horizontal lg:overflow-x-auto lg:space-x-3">
            <li class="step step-primary">{firstStop?.stop_name}</li>
            {#each stopsCopy as stop}
                <li class="step">{stop.stop_name}</li>
            {/each} 
            <li class="step step-primary">{lastStop?.stop_name}</li>
        </ul>
    </div>
</div>

