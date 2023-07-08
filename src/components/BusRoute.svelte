<script lang="ts">
	type Stop = {
		seq: number;
		stop_name: string;
		busstopcode: string;
	};

	export let stops: Stop[] = [];

	$: stopsCopy = [...stops];
	$: firstStop = stopsCopy.shift();
	$: lastStop = stopsCopy.pop();
</script>

<div>
	<div>
		<ul class="steps steps-vertical">
			<li class="step step-primary">
				<a href="/stop/{firstStop?.busstopcode}">{firstStop?.stop_name}</a>
			</li>
			{#each stopsCopy as stop}
				<li class="step"><a href="/stop/{stop.busstopcode}">{stop.stop_name}</a></li>
			{/each}
			<li class="step step-primary">
				<a href="/stop/{lastStop?.busstopcode}">{lastStop?.stop_name}</a>
			</li>
		</ul>
	</div>
</div>
