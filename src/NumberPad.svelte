<script>
	import { createEventDispatcher } from 'svelte';

	let timerTime = '000000';
  $: timerHours = timerTime.substring(0, 2) 
  $: timerMinutes = timerTime.substring(2, 4) 
  $: timerSeconds = timerTime.substring(4, 6)
  $: displayHours = timerTime.substring(0, 2) + 'h' 
  $: displayMinutes = timerTime.substring(2, 4) + 'm' 
  $: displaySeconds = timerTime.substring(4, 6) + 's'

	const dispatch = createEventDispatcher();

  function createTimer() {
    const newTimerDuration = (timerHours * 60 * 60) + (timerMinutes * 60) + timerSeconds
    dispatch('newTimer', {
      time: newTimerDuration
    });
    clear();
  }
  function select(n) {
    console.log('you pressed: ' + n);
    timerTime = timerTime.substring(1) + n;
    console.log('timerTime is now: ' + timerTime);
  }
  function clear() {
    timerTime = '000000';
  }
</script>

<div class="keypad">
  <h1>{displayHours}</h1>
  <h1>{displayMinutes}</h1>
  <h1>{displaySeconds}</h1>
  {#each [...Array(9).keys()].map((i) => {return i + 1}) as number}
	  <button on:click={() => select(number)}>{number}</button>
  {/each}

	<button on:click={clear}>clear</button>
	<button on:click={() => select(0)}>0</button>
	<button on:click={createTimer(timerTime)}>submit</button>
</div>

<style>
	.keypad {
		display: grid;
		grid-template-columns: repeat(3, 4em);
		grid-template-rows: repeat(5, 4em);
		grid-column-gap: 0.8em;
		grid-row-gap: 0.5em;
    width: 100%;
    justify-content: center;
	}

  button {
		margin: 0;
    background-color: black;
    border: 2px solid #ff3e00;
    color: black;
    border-radius: 50%;
    color: #ff3e00;
  }
  h1 {
    color: #ff3e00;
    font-weight: 150;
  }
</style>