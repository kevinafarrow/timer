<script>
  import { onMount } from 'svelte';

  export let timers = [];
  let timer = timers[0];
  console.log(timer.lane);
  setInterval(() => {
    updatePosition();
  }, 10);

  function updatePosition() {
    const step = 360 / (timer.duration * 100);
    const newPos = timer.pos - step;
    if (newPos <= 0) {
      timer.pos = 0;
    } else {
      timer.pos = newPos;
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
  <g class='hand' transform='rotate({timer.pos - 90})'>
    <rect
      width='{98 + 12}'
      height='1'
      y='-.5'
      x='-12'
    />
    <circle class='hand-outer-circle' r=2 />
    <circle class='hand-inner-circle' r=1 />
  </g>
</svg>

<style>
  svg {
    width: 100%;
    height: 100%;
  }
  .marker {
    fill: whitesmoke;
  }
  .submarker{
    fill: #333;
  }
  .hand, .hand-outer-circle {
    fill: #ff3e00;
  }
  .hand-inner-circle {
    fill: black;
  }
</style>