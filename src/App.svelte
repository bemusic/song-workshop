<script lang="ts">
  import * as kv from "idb-keyval";
  import { onMount } from "svelte";
  import { convertAudioFilesInDirectory } from "./audio";
  import type { SoundAssetsMetadata } from "./types";

  let convertStatus = "";
  let state:
    | "checking"
    | null
    | { directoryHandle: FileSystemDirectoryHandle } = "checking";
  let permissionDialog: any;
  let permissionDialogAllowButton: any;

  type SelectedDirectory = {
    directoryHandle: FileSystemDirectoryHandle;
    id: string;
  };

  async function chooseDirectory() {
    const dir = await window.showDirectoryPicker();
    await kv.set("selectedDirectory", {
      directoryHandle: dir,
      id: "dir" + Date.now(),
    });
    await check();
  }

  async function closeDirectory() {
    await kv.del("selectedDirectory");
    await check();
  }

  function restoreDirectoryHandle(
    data: SelectedDirectory | undefined
  ): FileSystemDirectoryHandle | undefined {
    if (!data) {
      return undefined;
    }
    const anyWindow = window as any;
    if (
      anyWindow.savedSelectedDirectory &&
      anyWindow.savedSelectedDirectory.id === data.id
    ) {
      return anyWindow.savedSelectedDirectory.directoryHandle;
    }
    anyWindow.savedSelectedDirectory = data;
    return data.directoryHandle;
  }

  async function check() {
    state = "checking";
    const data: SelectedDirectory | undefined = await kv.get(
      "selectedDirectory"
    );
    const dir = restoreDirectoryHandle(data);
    if (!dir) {
      state = null;
      return;
    }
    let permission = await dir.queryPermission({ mode: "readwrite" });
    if (permission === "prompt") {
      try {
        permission = await dir.requestPermission({ mode: "readwrite" });
      } catch (error) {
        await new Promise<void>((resolve, reject) => {
          permissionDialog.show();
          permissionDialog.addEventListener("before-close", () => {
            reject(new Error("Dialog closed"));
          });
          permissionDialogAllowButton.addEventListener("click", () => {
            resolve();
            permissionDialog.close();
          });
        });
        permission = await dir.requestPermission({ mode: "readwrite" });
      }
    }
    if (permission !== "granted") {
      throw new Error("Folder access permission denied");
    }
    state = { directoryHandle: dir };
    await recheck();
  }

  let convertingAudioFiles = false;
  async function convertAudioFiles() {
    convertingAudioFiles = true;
    try {
      if (typeof state !== "object") {
        throw new Error("No directory selected");
      }
      await convertAudioFilesInDirectory(state.directoryHandle, {
        setStatus: (status: string) => {
          convertStatus = status;
        },
        writeWarning: (warning: string) => {
          console.warn(warning);
        },
      });
    } finally {
      convertingAudioFiles = false;
      recheck();
    }
  }

  let checkingSong = false;
  let soundAssets: SoundAssetsMetadata | null = null;
  let charts: any[] = [];

  async function recheck() {
    checkingSong = true;
    try {
      if (typeof state !== "object") {
        throw new Error("No directory selected");
      }
      const bemuseDataDirPromise =
        state.directoryHandle.getDirectoryHandle("bemuse-data");
      try {
        const bemuseDataDir = await bemuseDataDirPromise;
        const metadata = await bemuseDataDir
          .getDirectoryHandle("sound")
          .then((d) => d.getFileHandle("metadata.json"));
        const metadataFile = await metadata.getFile();
        const metadataJson = JSON.parse(await metadataFile.text());
        soundAssets = metadataJson;
      } catch (error) {
        soundAssets = null;
      }
    } finally {
      checkingSong = false;
    }
  }

  $: checkItems = [
    {
      label: "Optimize sound assets",
      ok: !!soundAssets,
      infoText: soundAssets ? "Already optimized" : "No sound assets found",
      description:
        "Sound assets should be optimized for smaller size and faster delivery.",
    },
    {
      label: "Scan chart files",
      description: "Scan the chart files to make its presence visible.",
    },
    {
      label: "Song preview",
      description: "Create a 30-second preview of the song.",
    },
    {
      label: "Song metadata",
      description: "Set up song metadata.",
    },
  ];

  onMount(() => {
    check();
  });
</script>

<main>
  <ui5-shellbar id="shellbar" primary-title="Bemuse Custom Song Workshop" />
  {#if state === "checking"}
    <div style="text-align: center; padding: 1rem;">
      <ui5-busy-indicator active size="Large" />
    </div>
  {:else if !state}
    <ui5-illustrated-message
      name="NoData"
      title-text="No active project"
      subtitle-text="Please choose a song folder to get started"
    >
      <ui5-button design="Emphasized" on:click={chooseDirectory}>
        Choose a song folder
      </ui5-button>
    </ui5-illustrated-message>
  {:else}
    <ui5-bar design="Subheader">
      <ui5-label>{state.directoryHandle.name}</ui5-label>
      <ui5-button
        icon="synchronize"
        title="Refresh"
        slot="endContent"
        on:click={recheck}
      />
    </ui5-bar>
    <ui5-tabcontainer class="full-width" show-overflow>
      <ui5-tab text="Overview" selected icon="activities">
        <ui5-list class="full-width">
          {#each checkItems as item}
            <ui5-li
              icon={item.ok ? "message-success" : "alert"}
              description={item.description || "…"}
              additional-text={item.infoText || ""}
              additional-text-state={item.ok ? "Success" : "Error"}
            >
              {item.label}
            </ui5-li>
          {/each}
        </ui5-list>
      </ui5-tab>

      <ui5-tab
        text="Sound assets"
        icon="attachment-audio"
        style="padding: 1rem"
      >
        {#if soundAssets}
          <ui5-card>
            <ui5-card-header slot="header" title-text="Sound assets" />
            <div style="padding: 1rem">
              Sound assets found. To regenerate, delete the “bemuse-data/sound”
              folder.
            </div>
            <ui5-table>
              <ui5-table-column slot="columns"> Name </ui5-table-column>
              <ui5-table-column slot="columns"> Size </ui5-table-column>
              {#each soundAssets.refs as ref}
                <ui5-table-row>
                  <ui5-table-cell>{ref.path}</ui5-table-cell>
                  <ui5-table-cell>
                    {(ref.size / 1048576).toFixed(2)} MB
                  </ui5-table-cell>
                </ui5-table-row>
              {/each}
            </ui5-table>
          </ui5-card>
        {:else}
          <ui5-card>
            <ui5-card-header slot="header" title-text="Optimize sound assets" />
            <div style="padding: 1rem">
              <ui5-button
                on:click={convertAudioFiles}
                disabled={convertingAudioFiles}
              >
                Optimize sound assets
              </ui5-button>
              <div>
                <ui5-label>{convertStatus}</ui5-label>
              </div>
            </div>
          </ui5-card>
        {/if}
      </ui5-tab>

      <ui5-tab
        text="Charts"
        icon="full-stacked-column-chart"
        style="padding: 1rem"
      >
        <ui5-card>
          <ui5-card-header slot="header" title-text="Charts">
            <ui5-button slot="action">Scan charts</ui5-button>
          </ui5-card-header>

          <ui5-table no-data-text="No Data">
            <ui5-table-column slot="columns">Filename</ui5-table-column>
            <ui5-table-column slot="columns">Title</ui5-table-column>
            <ui5-table-column slot="columns">Artist</ui5-table-column>
            <ui5-table-column slot="columns">Genre</ui5-table-column>
            <ui5-table-column slot="columns">Level</ui5-table-column>
            <ui5-table-column slot="columns">Difficulty</ui5-table-column>
            {#each charts as chart}
              <ui5-table-row>
                <ui5-table-cell>{chart.file}</ui5-table-cell>
              </ui5-table-row>
            {/each}
          </ui5-table>
        </ui5-card>
      </ui5-tab>
    </ui5-tabcontainer>
    <ui5-bar design="Footer">
      <ui5-label slot="startContent">
        Current folder: {state.directoryHandle.name}
      </ui5-label>
      <ui5-button design="Negative" slot="endContent" on:click={closeDirectory}>
        Close folder
      </ui5-button>
    </ui5-bar>
  {/if}

  <ui5-dialog bind:this={permissionDialog} header-text="Permission required">
    <ui5-label>Please allow access to file system</ui5-label>

    <div slot="footer" style="padding: 0.5rem">
      <ui5-button design="Emphasized" bind:this={permissionDialogAllowButton}>
        Allow
      </ui5-button>
      <ui5-button design="Negative" on:click={permissionDialog.close()}>
        Deny
      </ui5-button>
    </div>
  </ui5-dialog>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
