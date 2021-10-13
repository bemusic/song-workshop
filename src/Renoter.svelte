<script lang="ts">
  import type { BMSChart } from "bms";
  import { once } from "lodash";
  import pMemoize from "p-memoize";

  import { onMount } from "svelte";
  import { getSelectedDirectory } from "./DirectorySelection";
  import RenoteEditor from "./RenoteEditor.svelte";
  import { SoundPlayer } from "./RenoterSound";
  import type { RenoteData } from "./RenoterTypes";
  import { SongWorkshopLibs } from "./SongWorkshopLibs";

  export let renoteSource: string;
  let state:
    | "checking"
    | { message: string }
    | {
        data: RenoteData;
        directoryHandle: FileSystemDirectoryHandle;
        fileHandle: FileSystemFileHandle;
        chart: BMSChart;
      } = "checking";

  async function check() {
    state = "checking";
    const dir = await getSelectedDirectory();
    if (!dir) {
      state = { message: "No directory selected." };
      return;
    }
    try {
      const renoteHandle = await dir.getFileHandle(
        renoteSource + ".renote.json"
      );
      const renoteFile = await renoteHandle.getFile();
      const renoteData: RenoteData = JSON.parse(await renoteFile.text());
      const chartHandle = await dir.getFileHandle(renoteData.source);
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
        data: renoteData,
        chart,
      };
    } catch (error) {
      state = { message: error.message };
    }
  }

  onMount(() => {
    check();
  });

  const getSample = pMemoize(async (soundFileSrc: string) => {
    if (!soundFileSrc) {
      return null;
    }
    if (typeof state !== "object" || !("directoryHandle" in state)) {
      throw new Error("Not loaded");
    }
    const soundFilesToTry = [
      soundFileSrc,
      soundFileSrc.replace(/\.\w\w\w$/, ".wav"),
      soundFileSrc.replace(/\.\w\w\w$/, ".ogg"),
      soundFileSrc.replace(/\.\w\w\w$/, ".mp3"),
    ];
    for (const file of soundFilesToTry) {
      try {
        const soundFileHandle = await state.directoryHandle.getFileHandle(file);
        const soundFile = await soundFileHandle.getFile();
        const soundData = await soundFile.arrayBuffer();
        const ctx = SoundPlayer.getInstance().context;
        const buffer = await ctx.decodeAudioData(soundData);
        return buffer;
      } catch (error) {
        console.log(error);
      }
    }
    throw new Error("No file");
  });

  async function onPreviewSound(e: { detail: string }) {
    const soundFile = e.detail;
    SoundPlayer.getInstance().play(getSample(soundFile));
  }
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
    <RenoteEditor chart={state.chart} on:previewSound={onPreviewSound} />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
