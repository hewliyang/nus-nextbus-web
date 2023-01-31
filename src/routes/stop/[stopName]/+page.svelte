<script lang="ts">
    export let data;
    const result = data.times
    const { TimeStamp, shuttles, caption } = result
</script>

<h1>{caption}</h1>

<h3>Last updated at: {TimeStamp}</h3>

<ul>
    {#each shuttles as {name, arrivalTime, nextArrivalTime}}
        <li>{name} : {arrivalTime}, {nextArrivalTime}</li>
    {/each}
</ul>