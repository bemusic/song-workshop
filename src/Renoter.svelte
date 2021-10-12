<script lang="ts">
  import type { BMSChart } from "bms";

  import { onMount } from "svelte";
  import { getSelectedDirectory } from "./DirectorySelection";
  import RenoteEditor from "./RenoteEditor.svelte";
  import { SongWorkshopLibs } from "./SongWorkshopLibs";

  export let renoteSource: string;
  let state:
    | "checking"
    | { message: string }
    | {
        directoryHandle: FileSystemDirectoryHandle;
        fileHandle: FileSystemFileHandle;
        chart: BMSChart;
      } = "checking";

  async function check() {
    state = "checking";
    if (!renoteSource.endsWith(".renoter")) {
      state = { message: "File extension must be .renoter" };
      return;
    }
    const dir = await getSelectedDirectory();
    if (!dir) {
      state = { message: "No directory selected." };
      return;
    }
    try {
      const chartHandle = await dir.getFileHandle(renoteSource);
      const chartFile = await chartHandle.getFile();
      const chartData = await chartFile.arrayBuffer();
      const chartText = await new Promise<string>((resolve, reject) => {
        SongWorkshopLibs.bms.Reader.readAsync(
          SongWorkshopLibs.buffer.Buffer.from(chartData),
          (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          }
        );
      });
      const { chart } = SongWorkshopLibs.bms.Compiler.compile(chartText);
      console.log(chart);
      state = {
        directoryHandle: dir,
        fileHandle: chartHandle,
        chart,
      };
    } catch (error) {
      state = { message: error.message };
    }
  }

  onMount(() => {
    check();
  });
</script>

<main>
  <ui5-shellbar id="shellbar" primary-title="Bemuse Renoter" />
  {#if state === "checking"}
    <div style="padding: 1rem;">
      <ui5-messagestrip design="Information">Checking...</ui5-messagestrip>
    </div>
  {:else if "message" in state}
    <div style="padding: 1rem;">
      <ui5-messagestrip design="Negative">{state.message}</ui5-messagestrip>
    </div>
  {:else}
    <RenoteEditor chart={state.chart} />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
