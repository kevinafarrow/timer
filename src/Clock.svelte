<script>
  import { onMount, onDestroy } from 'svelte';
  import Planet from './Planet.svelte';
  import Hand from './Hand.svelte'

  export let timers = [];

  onMount(() => {
    const interval = setInterval(() => {
      updatePositions();
    }, 10);

    return () => {clearInterval(interval)};
  });

  onDestroy(() => {
    timers = [];
  });

  function updatePositions() {
    for (var i = 0; i < timers.length; i++) {
      const step = 360 / (timers[i].duration * 100);
      const newPos = timers[i].pos - step;
      if (newPos <= 0) {
        timers[i].pos = 0;
      } else {
        timers[i].pos = newPos;
      };
    };
  };
  
</script>

<svg viewBox='-100 -100 200 200'>
  {#each [...Array(12).keys()].map((i) => {return i * 5}) as marker}
    <rect class='marker'
      width='7'
      height='1'
      y='-.5'
      x='91'
      transform='rotate({30 * marker})'
    />
    {#each [1, 2, 3, 4] as submarker}
      <rect class='submarker'
        width='5'
        height='1'
        y='-.5'
        x='93'
        transform='rotate({6 * (marker + submarker)})'
      />
      {#each [1, 2, 3, 4, 5] as subsubmarker}
        <rect class='submarker'
          width='3'
          height='1'
          y='-.5'
          x='95'
          transform='rotate({6 * (marker + submarker) + subsubmarker})'
        />
        <rect class='submarker'
          width='3'
          height='1'
          y='-.5'
          x='95'
          transform='rotate({6 * (marker + submarker) - subsubmarker})'
        />
      {/each}
    {/each}
  {/each}

  {#if timers.length === 1}
    <Hand timer={timers[0]}/>
    <p>{timers.length}</p>
  {:else if timers.length > 1}
    {#each timers as timer}
      <Planet {timer}/>
    {/each}
  {:else}
    <Hand timer={{"pos": 0}}/>
  {/if}
</svg>

<style>
  svg {
    width: 100%;
    height: 100%;
  }
  .marker {
    fill: whitesmoke;
  }
  .submarker {
    fill: #333;
  }
  
</style>