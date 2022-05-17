<script>
  import { count } from './stores.js'
  import { onMount } from 'svelte';

  onMount(() => {
    const interval = setInterval(() => {
      decrement();
    }, 10);

    return () => {clearInterval(interval)};
  });

  function decrement() {
    count.update(n => n - 10);
  }
</script>


<button on:click={decrement}>
  -
</button>