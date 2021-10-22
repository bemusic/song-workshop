<script lang="ts">
  import { resolveFileFromPath } from "./resolveFile";

  export let directoryHandle: FileSystemDirectoryHandle;
  export let songOgg: string;
  export let videoPath: string | undefined;
  export let videoOffset: number;
  export let setVideoOffset: (offset: number) => void;

  $: videoUrlPromise = (async () => {
    if (!videoPath) return undefined;
    const fileHandle = await resolveFileFromPath(directoryHandle, videoPath);
    const file = await fileHandle.getFile();
    return URL.createObjectURL(file);
  })();

  let instance: { canceled: boolean };
  let video: HTMLVideoElement;
  let audio: HTMLAudioElement;
  let resetCount = 0;
  let previewing = false;
  function startPreview() {
    const current: typeof instance = { canceled: false };
    instance = current;
    video.currentTime = 0;
    audio.currentTime = 0;
    audio.play();
    setTimeout(() => {
      if (!current.canceled) video.play();
    }, videoOffset * 1000);
    previewing = true;
  }
  function resetPreview() {
    if (instance) instance.canceled = true;
    resetCount++;
    previewing = false;
  }
  async function setOffset() {
    const offset = prompt("New offset", `${videoOffset}`);
    if (offset == null) {
      return;
    }
    const offsetNumber = parseFloat(offset);
    if (isNaN(offsetNumber)) {
      alert("Please enter a number");
      return;
    }
    if (offsetNumber < 0) {
      alert("Please enter a positive number");
      return;
    }
    setVideoOffset(offsetNumber);
  }
</script>

{#await videoUrlPromise}
  Loading vide
{:then url}
  {#if url}
    {#key resetCount}
      <video src={url} preload="auto" muted bind:this={video} />
      <audio src={songOgg} preload="auto" bind:this={audio} />
      {#if previewing}
        <ui5-button design="Emphasized" on:click={resetPreview}>
          Stop
        </ui5-button>
      {:else}
        <ui5-button on:click={setOffset}>
          Set video offset ({videoOffset.toFixed(2)}s)
        </ui5-button>
        <ui5-button design="Emphasized" on:click={startPreview}>
          Test synchronization
        </ui5-button>
      {/if}
    {/key}
  {:else}
    Not specified
  {/if}
{:catch e}
  Unable to load {videoPath}: {e}
{/await}

<style>
  video {
    width: 100%;
  }
</style>
