<script lang="ts">
  import { entries } from "lodash";
  import { createEventDispatcher } from "svelte";
  import type { RenoterLayout } from "./RenoterLayout";

  import type { ObjectRow, RenoteData } from "./RenoterTypes";

  export let row: ObjectRow;
  export let layout: RenoterLayout;
  export let selected: boolean;
  export let selectedColumnIndex: number;
  export let newNotes: RenoteData["newNotes"][string];

  const dispatch = createEventDispatcher();
  $: notedObjects = Object.entries(newNotes || []).flatMap(
    ([channel, info]) => {
      const matchingObject = row.objects.find((o) => o.value === info.value);
      if (!matchingObject) {
        return [];
      }
      return [
        {
          channel,
          object: matchingObject,
        },
      ];
    }
  );
</script>

<div class="row" class:is-selected={selected}>
  <div class="line" />
  <div class="objectRow-text">
    {row.timeKey.split(":")[1]}
  </div>
  {#each notedObjects as { object, channel } (channel)}
    <div
      class="obj"
      data-channel={channel}
      style="transform: translateX({layout.getNoteX(
        channel
      )}px);  --group-color: {layout.getGroupColor(
        layout.getGroupIndex(object)
      )}"
      on:mouseenter={() => dispatch("notemouseenter", object)}
      on:mouseleave={() => dispatch("notemouseleave", object)}
    >
      {object.value}
    </div>
  {/each}
  {#each row.objects as object, i}
    <div
      class="obj"
      class:is-selectable={layout.getGroupIndex(object) === selectedColumnIndex}
      style="transform: translateX({layout.getX(
        row,
        object
      )}px); --group-color: {layout.getGroupColor(
        layout.getGroupIndex(object)
      )}"
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
    color: var(--group-color);
  }
  .obj[data-channel="K1"],
  .obj[data-channel="K3"],
  .obj[data-channel="K5"],
  .obj[data-channel="K7"] {
    background: #666;
  }
  .obj[data-channel="K2"],
  .obj[data-channel="K6"] {
    background: #448;
  }
  .obj[data-channel="SC"] {
    background: #844;
  }
  .obj[data-channel="K4"] {
    background: #484;
  }
  .objectRow-text {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 64px;
    text-align: right;
    font-size: 12px;
    color: #555;
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
  .row.is-selected .line {
    opacity: 1;
  }
</style>
