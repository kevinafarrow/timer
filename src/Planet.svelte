<script>
  import { fade, blur } from 'svelte/transition';
  export let timer;
</script>


{#if (timer.pos !== 0)}
  <g class='{timer.lane}' in:blur="{{ duration:1000 }}" out:fade="{{delay: 200, duration: 1000}}">
    <clipPath id="{timer.clip}">
      <circle id="theCircle" r='{timer.border}'/>
    </clipPath>
    <mask id="{timer.mask}">
      <rect width='100' height='100' transform='rotate({timer.pos - 180})' fill=#fff />
      {#if (timer.pos - 90) < 0}
        <rect width='102' height='102' transform='rotate(-180)' fill=#000 />
      {/if}
      {#if (timer.pos - 90) > 0}
        <rect width='102' height='102' transform='rotate(-90)' fill=#fff />
      {/if}
      {#if (timer.pos - 90) > 90}
        <rect width='102' height='102' fill=#fff />
      {/if}
      {#if (timer.pos - 90) > 180}
        <rect width='102' height='102' transform='rotate(90)' fill=#fff />
      {/if}
    </mask>
    <g class='lane' clip-path="url(#{timer.clip})" mask="url(#{timer.mask})">
      <circle class='lane-outer' r='{timer.border - 2}'/>
    </g>
    <circle class='lane-inner' r='{timer.border - 3}' rx='-10'/>
    <circle class='planet' r='2.5' cx='{timer.border - 2.5}' transform='rotate({timer.pos - 90})'/>
    <circle class='hole' r='1.5' cx='{timer.border - 2.5}' transform='rotate({timer.pos - 90})'/>
  </g>
{/if}

<style>
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