<script>
  import { onMount } from 'svelte';

  export let timers = [];

  setInterval(() => {
    updatePositions();
  }, 10);

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

  {#each timers as timer}
    <g class='{timer.lane}'>
      <clipPath id="lane-clip-path">
        <circle id="theCircle" r='{timer.border}'/>
      </clipPath>
      <mask id="{timer.mask}">
        <rect width='100' height='100' transform='rotate({timer.pos - 180})' fill=#fff />
        {#if (timer.pos - 90) < 0}
          <rect width='100' height='100' transform='rotate(-180)' fill=#000 />
        {/if}
        {#if (timer.pos - 90) > 0}
          <rect width='100' height='100' transform='rotate(-90)' fill=#fff />
        {/if}
        {#if (timer.pos - 90) > 90}
          <rect width='100' height='100' fill=#fff />
        {/if}
        {#if (timer.pos - 90) > 180}
          <rect width='100' height='100' transform='rotate(90)' fill=#fff />
        {/if}
      </mask>
      <g class='lane' clip-path="url(#lane-clip-path)" mask="url(#{timer.mask})">
        <circle class='lane-outer' r='{timer.border - 2}'/>
        <circle class='lane-inner' r='{timer.border - 3}' rx='-10'/>
      </g>
      <circle class='planet' r='2.5' cx='{timer.border - 2.5}' transform='rotate({timer.pos - 90})'/>
      <circle class='hole' r='1.5' cx='{timer.border - 2.5}' transform='rotate({timer.pos - 90})'/>
    </g>
  {/each}
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
  .lane1 {
    fill: #ff3e00;
  }
  .lane2 {
    fill: #00ffa2;
  }
  .lane3 {
    fill: #ff9900;
  }
  .lane4 {
    fill: #005eff;
  }
  .lane5 {
    fill: #fff200;
  }
  .lane6 {
    fill: #8000ff;
  }
  .lane7 {
    fill: #ffffff;
  }
  .lane-outer {
    position: absolute;
    fill: inherit;
    overflow: hidden;
  }
  .lane-inner {
    fill: black;
  }
  .planet {
    fill: inherit;
  }
  .hole {
    fill: black;
  }
</style>