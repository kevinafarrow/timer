<script>
  export let timer;
</script>

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

<style>
  .hand, .hand-outer-circle {
    fill: #ff3e00;
  }
  .hand-inner-circle {
    fill: black;
  }
</style>