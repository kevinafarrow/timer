<script>
  export let name;
	import ClockDisplay from './ClockDisplay.svelte';
	import PlanetDisplay from './PlanetDisplay.svelte';

  let timers = [];
  let timers_1 = [
    {"lane": "lane1", "mask": "lane-mask1", "border": 90, "duration": 30, "pos": 360},
  ]
  let timers_2 = [
    {"lane": "lane1", "mask": "lane-mask1", "border": 90, "duration": 70, "pos": 360},
    {"lane": "lane2", "mask": "lane-mask2", "border": 84, "duration": 60, "pos": 360},
    {"lane": "lane3", "mask": "lane-mask3", "border": 78, "duration": 50, "pos": 360},
    {"lane": "lane4", "mask": "lane-mask4", "border": 72, "duration": 40, "pos": 360},
    {"lane": "lane5", "mask": "lane-mask5", "border": 66, "duration": 30, "pos": 360},
    {"lane": "lane6", "mask": "lane-mask6", "border": 60, "duration": 20, "pos": 360},
    {"lane": "lane7", "mask": "lane-mask7", "border": 54, "duration": 10, "pos": 360}
  ];
  let numTimers = timers.length;

  timers = timers_1;

  function toggleTimer() {
	  if (timers === timers_1) {
      timers = timers_2;
    } else if (timers === timers_2) {
      timers = timers_1;
    };
  };
</script>

<main>
	<h1>{name}</h1>
  {#if timers.length > 1}
	  <PlanetDisplay {timers}/>
  {:else}
	  <ClockDisplay {timers}/>
  {/if}

  <button on:click={toggleTimer}>
    Demo toggle
  </button>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
		background-color: black;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 1.6em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
	:global(body) {
		background-color: black;
	}
  button {
    background-color: #ff3e00;
    border: none;
    margin: 1em;
    color: black;
  }
</style>