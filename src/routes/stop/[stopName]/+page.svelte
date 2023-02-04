<script lang="ts">
    import { addBookmark } from "$lib/bookmarks/bookmark";

    export let data;
    const result = data.times
    const { TimeStamp, name, shuttles, caption } = result
    const ts = new Date(TimeStamp)

    // type Bookmark = {
    //   caption: string,
    //   name: string
    // }

    // const addBookmark = () => {
    //   const bookmarks = localStorage.getItem('bookmarks');
    //   let arr : Bookmark[] = [];

    //   if (bookmarks) {
    //     arr = JSON.parse(bookmarks) as Bookmark[]
    //   }
    //   const newBookmark = {caption: caption, name: name}
    //   const updatedArr = [...arr, newBookmark]
    //   localStorage.setItem('bookmarks', JSON.stringify(updatedArr))
    // }

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
            <td><a class="font-semibold text-gray-400" href="/busroutes#{name}">{name}</a></td>
            <td>{arrivalTime} <span class="text-xs">mins</span></td>
            <td>{nextArrivalTime} <span class="text-xs">mins</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <button class="mt-3 btn btn-outline btn-warning" on:click={() => addBookmark(caption, name)}>
    Bookmark
  </button>