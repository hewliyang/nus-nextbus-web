<script lang="ts">
	import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  interface Shuttles {
    name: string,
    busstopcode: string,
    arrivalTime: string,
    nextArrivalTime: string,
  }

  export let data;
  const result = data.times
  const stopName = data.times.name

  // disambiguate the terminal stations
  const terminals: string[] = ["KRB", "OTH", "UTOWN", "COM3"]
  
  const { TimeStamp, name, shuttles, caption }: { TimeStamp: string; name: string; shuttles: Shuttles[]; caption:string } = result

  let filteredShuttles: Shuttles[];

  if (terminals.includes(stopName)) {
    filteredShuttles = shuttles.filter(({ busstopcode }) => {
      const tokens = busstopcode.split("-");
      return !(tokens.length > 1 && tokens[2] === "E");
      });
  } else {
    filteredShuttles = shuttles;
  }

  // check if current stop is already in bookmarks

  type Bookmark = {
    caption: string
    name: string
  }
  
  let alreadyBookmarked: boolean;
  let bookmarks: string[];
  let bookmark_objs: Bookmark[];

  $: bookmark_objs= $page.data.bookmarks;
  $: bookmarks = bookmark_objs.map(obj => obj.name);
  $: alreadyBookmarked = bookmarks.includes(stopName);

  const ts = new Date(TimeStamp)

</script>

<h2 class="text-semibold text-2xl text-center mb-2">{caption}</h2>

<h3>Last updated at: {ts.toLocaleString("en-SG")}</h3>


<div class="overflow-x-auto mt-5">
    <table class="table table-compact w-full text-center">
      <!-- head -->
      <thead>
        <tr>
          <th>Route</th>
          <th>Arrival</th>
          <th>Next Arrival</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredShuttles as {name, arrivalTime, nextArrivalTime}}
        <tr>
            <td><a class="font-semibold text-info-content text-lg" href="/stop/{stopName}/route/{name}#current"><code>{name}</code></a></td>
            <td>{arrivalTime} <span class="text-xs">mins</span></td>
            <td>{nextArrivalTime} <span class="text-xs">mins</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

<div class="flex flex-row space-x-4 items-center justify-between mt-3">
  <form action="?/addBookmark&id={name}&caption={caption}" method="POST" use:enhance>
    <button class="mt-3 btn btn-outline btn-warning mb-3" disabled={alreadyBookmarked}>
      {#if alreadyBookmarked}  
        Bookmarked!
      {:else}
        Bookmark
      {/if}
    </button>
  </form>
  <a class="mt-3 btn btn-outline btn-error mb-3" href="/">
    Home
  </a>
  <a class="mt-3 btn btn-outline btn-success mb-3" href="./{stopName}" data-sveltekit-reload>
    Refresh
  </a>
</div>