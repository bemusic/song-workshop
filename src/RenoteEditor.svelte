<script lang="ts">
  import type { BMSChart, BMSObject } from "bms";
  import { groupBy, memoize } from "lodash";
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import RenoteRow from "./RenoteRow.svelte";
  import type { ObjectRow } from "./RenoterTypes";
  import { SongWorkshopLibs } from "./SongWorkshopLibs";

  const dispatch = createEventDispatcher();

  const keyboardShortcuts = [
    ["Up", "Go to next row"],
    ["Down", "Go to previous row"],
    ["Left", "Select previous sound group"],
    ["Right", "Select next sound group"],
    ["Shift+Up", "Increase note length"],
    ["Shift+Down", "Decrease note length"],
    ["AZSXDCFV", "Toggle note"],
  ];

  const PX_PER_BEAT = 64;
  const VIEWPORT_PADDING_PX = 192;
  const BOTTOM_PX = 32;
  export let chart: BMSChart;

  let scroller: HTMLDivElement;

  const toBeat = memoize(
    (measure: number, fraction: number) => {
      return chart.timeSignatures.measureToBeat(measure, fraction);
    },
    (measure: number, fraction: number) => `${measure}-${fraction}`
  );

  $: maxMeasure =
    chart.objects.all().reduce((a, o) => Math.max(a, o.measure), 0) + 1;
  $: maxTime = chart.objects
    .all()
    .reduce((a, o) => Math.max(a, toBeat(o.measure, o.fraction)), 0);
  $: canvasHeight = maxTime * PX_PER_BEAT + VIEWPORT_PADDING_PX;
  $: keysounds = SongWorkshopLibs.bms.Keysounds.fromBMSChart(chart);
  $: console.log(keysounds);

  let viewport: [number, number] = [0, 0];
  function onScroll() {
    viewport = [scroller.scrollTop, scroller.scrollTop + scroller.clientHeight];
  }
  onMount(() => {
    scroller.scrollTop = canvasHeight;
    onScroll();
    window.addEventListener("resize", onScroll);
  });
  onDestroy(() => {
    window.removeEventListener("resize", onScroll);
  });

  function getY(beat: number) {
    return canvasHeight - BOTTOM_PX - beat * PX_PER_BEAT;
  }
  function groupObjectsByY(objects: BMSObject[]) {
    let rows: ObjectRow[] = [];
    const map: Record<number, ObjectRow> = {};
    for (let o of objects) {
      if (o.channel !== "01" && !("11" <= o.channel && o.channel <= "59")) {
        continue;
      }
      let y = getY(toBeat(o.measure, o.fraction));
      let row = map[y];
      if (!row) {
        row = { y, objects: [] };
        rows.push(row);
        map[y] = row;
      }
      row.objects.push(o);
    }
    rows.sort((a, b) => a.y - b.y);
    return rows;
  }
  function filterVisible<T extends { y: number }>(
    range: typeof viewport,
    things: T[]
  ): T[] {
    return things.filter((t) => t.y >= range[0] && t.y <= range[1]);
  }

  $: measureLines = new Array(maxMeasure)
    .fill(0)
    .map((_, i) => ({ number: i, y: getY(toBeat(i, 0)) }));
  $: objectRows = groupObjectsByY(chart.objects.allSorted());
  $: visibleObjectRows = filterVisible(viewport, objectRows);

  function onNoteHover(e: { detail: BMSObject }) {
    dispatch("previewSound", keysounds.get(e.detail.value));
  }
</script>

<div
  style="padding: 1rem; display: flex; gap: 1rem; height: calc(100vh - 100px)"
>
  <div style="flex: 1; position: relative">
    <div
      style="position: absolute; inset: 0; overflow: auto;"
      bind:this={scroller}
      on:scroll={onScroll}
      tabindex="0"
    >
      <div
        style="background: #000; color: #0f0; height: {canvasHeight}px; position: relative;"
      >
        {#each measureLines as measure (measure.number)}
          <div class="measure" style="top: {measure.y}px">
            <div class="measure-text">
              #{measure.number.toString().padStart(3, "0")}
            </div>
          </div>
        {/each}
        {#each visibleObjectRows as row (row.y)}
          <div class="objectRow" style="top: {row.y}px">
            <RenoteRow {row} on:notemouseenter={onNoteHover} />
          </div>
        {/each}
      </div>
    </div>
  </div>
  <div style="flex: none; width: 256px;">
    <ui5-messagestrip design="Negative">Unimplemented</ui5-messagestrip>
    {viewport}
  </div>
</div>

<style>
  .measure {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    margin-top: -1px;
    background: #333;
  }
  .measure-text {
    position: absolute;
    bottom: 0;
    left: 0;
    color: #666;
  }
  .objectRow {
    position: absolute;
    left: 0;
    right: 0;
    height: 0px;
  }
  .objectRow-text {
    position: absolute;
    bottom: 0;
    left: 100px;
  }
  .objectRow-line {
    position: absolute;
    height: 1px;
    left: 0;
    bottom: 0;
    right: 0;
    background: #0f0;
    opacity: 0;
  }
  .objectRow:hover .objectRow-line {
    opacity: 1;
  }
</style>
