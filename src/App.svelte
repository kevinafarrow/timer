<script>
  export let name;
	import Clock from './Clock.svelte';

  let demos = [
    [
      {"lane": "lane1", "mask": "lane-mask1", "border": 90, "duration": 10, "pos": 360},
    ],
    [
      {"lane": "lane1", "mask": "lane-mask1", "clip": "lane-clip-path1", "border": 90, "duration": 70, "pos": 360},
      {"lane": "lane2", "mask": "lane-mask2", "clip": "lane-clip-path2", "border": 84, "duration": 60, "pos": 360},
      {"lane": "lane3", "mask": "lane-mask3", "clip": "lane-clip-path3", "border": 78, "duration": 50, "pos": 360},
      {"lane": "lane4", "mask": "lane-mask4", "clip": "lane-clip-path4", "border": 72, "duration": 40, "pos": 360},
      {"lane": "lane5", "mask": "lane-mask5", "clip": "lane-clip-path5", "border": 66, "duration": 30, "pos": 360},
      {"lane": "lane6", "mask": "lane-mask6", "clip": "lane-clip-path6", "border": 60, "duration": 20, "pos": 360},
      {"lane": "lane7", "mask": "lane-mask7", "clip": "lane-clip-path7", "border": 54, "duration": 10, "pos": 360}
    ],
    [
      {"lane": "lane1", "mask": "lane-mask1", "clip": "lane-clip-path1", "border": 90, "duration": 10, "pos": 360},
      {"lane": "lane2", "mask": "lane-mask2", "clip": "lane-clip-path2", "border": 84, "duration": 20, "pos": 360},
      {"lane": "lane3", "mask": "lane-mask3", "clip": "lane-clip-path3", "border": 78, "duration": 30, "pos": 360},
      {"lane": "lane4", "mask": "lane-mask4", "clip": "lane-clip-path4", "border": 72, "duration": 40, "pos": 360},
      {"lane": "lane5", "mask": "lane-mask5", "clip": "lane-clip-path5", "border": 66, "duration": 50, "pos": 360},
      {"lane": "lane6", "mask": "lane-mask6", "clip": "lane-clip-path6", "border": 60, "duration": 60, "pos": 360},
      {"lane": "lane7", "mask": "lane-mask7", "clip": "lane-clip-path7", "border": 54, "duration": 70, "pos": 360}
    ],
    [
      {"lane": "lane1", "mask": "lane-mask1", "clip": "lane-clip-path1", "border": 90, "duration": randTime(), "pos": 360},
      {"lane": "lane2", "mask": "lane-mask2", "clip": "lane-clip-path2", "border": 84, "duration": randTime(), "pos": 360},
      {"lane": "lane3", "mask": "lane-mask3", "clip": "lane-clip-path3", "border": 78, "duration": randTime(), "pos": 360},
      {"lane": "lane4", "mask": "lane-mask4", "clip": "lane-clip-path4", "border": 72, "duration": randTime(), "pos": 360},
      {"lane": "lane5", "mask": "lane-mask5", "clip": "lane-clip-path5", "border": 66, "duration": randTime(), "pos": 360},
      {"lane": "lane6", "mask": "lane-mask6", "clip": "lane-clip-path6", "border": 60, "duration": randTime(), "pos": 360},
      {"lane": "lane7", "mask": "lane-mask7", "clip": "lane-clip-path7", "border": 54, "duration": randTime(), "pos": 360}
    ]
  ];
  let selectedDemo = 0;
  let timers = demos[selectedDemo];
  let numTimers = timers.length;

  $: timers = JSON.parse(JSON.stringify(demos[selectedDemo]));
  $: numTimers = timers.length;

  function nextDemo() {
    if (selectedDemo === (demos.length - 1)) {
      selectedDemo = 0;
    } else {
      selectedDemo++;
    };
  };

  function previousDemo() {
    if (selectedDemo === 0) {
      selectedDemo = demos.length - 1;
    } else {
      selectedDemo--;
    };
  };

  function randTime() {
    const time = Math.floor(Math.random() * 10);
    return time;
  };

</script>

<main>
	<h1>{name}</h1>
	<Clock {timers}/>
  <h2>Demos</h2>
  <button on:click={previousDemo}>
    Prev
  </button>
  <button on:click={nextDemo}>
    Next 
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
  h2 {
		color: #ff3e00;
		font-weight: 150;
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
    width: 3em;
    height: 2em;
  }
  p {
    color: whitesmoke;
  }
</style>