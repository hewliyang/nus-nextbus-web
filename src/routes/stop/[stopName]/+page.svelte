<script lang="ts">
    export let data;
    const result = data.times
    const { TimeStamp, shuttles, caption } = result
    const ts = new Date(TimeStamp)
</script>

<h2 class="text-semibold text-2xl justify-center">{caption}</h2>

<h3>Last updated at: {ts.toLocaleString("en-SG")}</h3>


<div class="overflow-x-auto mt-5">
    <table class="table table-compact w-full">
      <!-- head -->
      <thead>
        <tr>
          <th>Route</th>
          <th>Arrival</th>
          <th>Next Arrival</th>
        </tr>
      </thead>
      <tbody>
        {#each shuttles as {name, arrivalTime, nextArrivalTime}}
        <tr>
            <td>{name}</td>
            <td>{arrivalTime} <span class="text-xs">mins</span></td>
            <td>{nextArrivalTime} <span class="text-xs">mins</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>