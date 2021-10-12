<script lang="ts">
  import { createEventDispatcher } from "svelte";

  import type { ObjectRow } from "./RenoterTypes";

  export let row: ObjectRow;

  const dispatch = createEventDispatcher();
</script>

<div class="row">
  <div class="line" />
  <div class="objectRow-text">
    {row.timeKey}
  </div>
  {#each row.objects as object, i}
    <div
      class="obj"
      style="transform: translateX({128 + (i + 10) * 32}px)"
      on:mouseenter={() => dispatch("notemouseenter", object)}
      on:mouseleave={() => dispatch("notemouseleave", object)}
    >
      {object.value}
    </div>
  {/each}
</div>

<style>
  .obj {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 32px;
    height: 16px;
    line-height: 16px;
    text-align: center;
    font-size: 12px;
    background: #444;
    box-shadow: inset 1px 1px 0 #fff3, inset -1px -1px 0 #0006;
  }
  .objectRow-text {
    position: absolute;
    bottom: 0;
    left: 48px;
    font-size: 12px;
  }
  .line {
    position: absolute;
    height: 1px;
    left: 0;
    bottom: 0;
    right: 0;
    background: #0f0;
    opacity: 0;
  }
  .row:hover .line {
    opacity: 1;
  }
</style>
