<script lang="ts">
  import { onMount } from "svelte";
  import axios from "axios";
  import type { ServerFile, SongEntry } from "./ServerFile";
  import {
    getSelectedServerFile,
    setSelectedServerFile,
    unsetSelectedServerFile,
  } from "./ServerFileSelection";
  import type { Song } from "./SongFile";

  let state: "checking" | null | { serverFile: FileSystemFileHandle } =
    "checking";

  let data: ServerFile;

  async function chooseServerFile() {
    const file = await window.showOpenFilePicker({
      types: [
        {
          description: "Server index file (index.json)",
          accept: {
            "application/json": ".json",
          },
        },
      ],
    });
    await setSelectedServerFile(file[0]);
    await check();
  }

  async function newServerFile() {
    const file = await window.showSaveFilePicker({
      types: [
        {
          description: "Server index file (index.json)",
          accept: {
            "application/json": ".json",
          },
        },
      ],
      suggestedName: "index.json",
    });
    const writable = await file.createWritable();
    await writable.write(
      JSON.stringify({
        urls: [],
        songs: [],
      })
    );
    await writable.close();
    await setSelectedServerFile(file);
    await check();
  }

  async function closeServer() {
    await unsetSelectedServerFile();
    await check();
  }

  async function check() {
    state = "checking";
    const file = await getSelectedServerFile();
    if (!file) {
      state = null;
    } else {
      try {
        data = JSON.parse(await (await file.getFile()).text());
        state = { serverFile: file };
      } catch (error) {
        alert("Cannot load server file: " + error);
        console.error(error);
        state = null;
      }
    }
  }

  let newUrlField: HTMLInputElement | null = null;
  async function addUrls() {
    const urls = (newUrlField.value.match(/\S+/g) ?? []).flatMap((url) => {
      try {
        return [new URL(url.replace(/(\/|\/bemuse-song\.json|)$/, "/")).href];
      } catch (e) {
        return [];
      }
    });
    const newUrls = [...data.urls];
    for (const url of urls) {
      if (!newUrls.some((item) => item.url === url)) {
        newUrls.push({ url, added: new Date().toISOString().slice(0, 10) });
      }
    }
    data.urls = newUrls;
    await save();
  }

  async function save() {
    if (!state || typeof state !== "object") {
      return;
    }
    const writable = await state.serverFile.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    console.log("Saved...");
  }

  let scanStatus: Record<
    string,
    "scanning" | "error" | "completed" | "skipped"
  > = {};

  async function scanSongs() {
    scanStatus = {};
    const selectedUrls = Array.from(
      document.querySelectorAll("[data-entry-url]")
    ).flatMap((el: HTMLElement & { selected: boolean }) => {
      return el.selected ? [el.dataset.entryUrl] : [];
    });
    console.log({ selectedUrls });
    const shouldUpdate = (url: string): boolean => {
      if (selectedUrls.length > 0) {
        return selectedUrls.includes(url);
      } else {
        const alreadyScanned = data.songs.some((s) => s.path === url);
        return !alreadyScanned;
      }
    };
    for (const { url, added, title } of data.urls) {
      if (!shouldUpdate(url)) {
        scanStatus[url] = "skipped";
        continue;
      }
      try {
        scanStatus[url] = "scanning";
        const { data } = await axios.get<Song>(
          new URL("bemuse-song.json", url).href
        );
        updateSongData(url, {
          ...data,
          ...(added ? { added: added + "T00:00:00.000Z" } : {}),
          ...(title ? { title } : {}),
        });
        scanStatus[url] = "completed";
      } catch (error) {
        scanStatus[url] = "error";
      }
    }
    await save();
  }

  async function updateSongData(url: string, song: Song) {
    const index = data.songs.findIndex((s) => s.path === url);
    const entry = {
      ...song,
      id: url.replace(/\/$/, "").split("/").slice(-1)[0],
      path: url,
    };
    if (index > -1) {
      data.songs[index] = entry;
    } else {
      data.songs = [...data.songs, entry];
    }
  }

  function statusProps(status: typeof scanStatus[string]): {
    text?: string;
    status?: "Success" | "Warning" | "Information" | "Error" | "None";
  } {
    if (status === "scanning") {
      return {
        text: "Scanning...",
        status: "Information",
      };
    }
    if (status === "skipped") {
      return {
        text: "Skipped",
        status: "Success",
      };
    }
    if (status === "error") {
      return {
        text: "Error",
        status: "Error",
      };
    }
    if (status === "completed") {
      return {
        text: "Completed",
        status: "Success",
      };
    }
    return { text: "", status: "None" };
  }

  function sortSongs(songs: Song[]) {
    const sortKey = (song: Song): string => {
      if (song.initial) return "a";
      if (song.added) return "b" + song.added;
      return "c";
    };
    return (songs || [])
      .slice()
      .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  }

  onMount(() => {
    check();
  });
</script>

<main>
  <ui5-shellbar id="shellbar" primary-title="Bemuse Custom Server Manager" />
  {#if state === "checking"}
    <div style="text-align: center; padding: 1rem;">
      <ui5-busy-indicator active size="Large" />
    </div>
  {:else if !state}
    <ui5-illustrated-message
      name="NoData"
      title-text="No server file selected"
      subtitle-text="Open or create a server file"
    >
      <ui5-button design="Emphasized" on:click={chooseServerFile}>
        Open a server file
      </ui5-button>
      <ui5-button design="Emphasized" on:click={newServerFile}>
        Create a new server file
      </ui5-button>
    </ui5-illustrated-message>
  {:else}
    <ui5-bar design="Subheader">
      <ui5-label>{state.serverFile.name}</ui5-label>
    </ui5-bar>

    <div style="padding: 1rem" class="ui5-content-density-compact">
      <ui5-card>
        <ui5-card-header slot="header" title-text="URLs">
          <ui5-button slot="action" on:click={scanSongs}>
            Update data
          </ui5-button>
        </ui5-card-header>
        <div style="overflow: auto; max-height: 64vh">
          <ui5-table
            mode="MultiSelect"
            no-data-text="No URLs."
            sticky-column-header="true"
          >
            <ui5-table-column slot="columns">URL</ui5-table-column>
            <ui5-table-column slot="columns">Added</ui5-table-column>
            <ui5-table-column slot="columns" style="width: 12rem"
              >Status</ui5-table-column
            >
            {#each data.urls as entry (entry.url)}
              <ui5-table-row data-entry-url={entry.url}>
                <ui5-table-cell>{entry.url}</ui5-table-cell>
                <ui5-table-cell>
                  {#if entry.added}
                    {entry.added}
                  {:else}
                    (from metadata)
                  {/if}
                </ui5-table-cell>
                <ui5-table-cell>
                  <span
                    data-status={statusProps(scanStatus[entry.url]).status}
                    class="url-status-text"
                  >
                    {statusProps(scanStatus[entry.url]).text}
                  </span>
                </ui5-table-cell>
              </ui5-table-row>
            {/each}
          </ui5-table>
        </div>
        <form on:submit|preventDefault={() => {}} style="padding: 1rem">
          <strong>Add URL</strong>
          <div>
            <ui5-textarea
              placeholder="Enter URLs (one per line)"
              bind:this={newUrlField}
            />
          </div>
          <div style="text-align: right">
            <ui5-button design="Emphasized" on:click={addUrls}>
              Add
            </ui5-button>
          </div>
        </form>
      </ui5-card>
    </div>

    <div style="padding: 0 1rem 1rem">
      <ui5-card>
        <ui5-card-header slot="header" title-text="Songs" />
        <ui5-table class="demo-table" id="table">
          <ui5-table-column slot="columns"> Added </ui5-table-column>
          <ui5-table-column slot="columns"> Genre </ui5-table-column>
          <ui5-table-column slot="columns"> Title </ui5-table-column>
          <ui5-table-column slot="columns"> Artist </ui5-table-column>
          {#each sortSongs(data.songs) as song (song.id)}
            <ui5-table-row>
              <ui5-table-cell>
                {#if song.initial}
                  (initial)
                {:else}
                  {(song.added && song.added.slice(0, 10)) ||
                    "MISSING ADDED DATE"}
                {/if}
              </ui5-table-cell>
              <ui5-table-cell>{song.genre}</ui5-table-cell>
              <ui5-table-cell>{song.title}</ui5-table-cell>
              <ui5-table-cell>{song.artist}</ui5-table-cell>
            </ui5-table-row>
          {/each}
        </ui5-table>
      </ui5-card>
    </div>

    <ui5-bar design="Footer">
      <ui5-label slot="startContent">
        Current file: {state.serverFile.name}
      </ui5-label>
      <ui5-button design="Negative" slot="endContent" on:click={closeServer}>
        Close folder
      </ui5-button>
    </ui5-bar>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
  .url-status-text[data-status="Information"] {
    color: var(--sapInformationColor);
  }
  .url-status-text[data-status="Error"] {
    color: var(--sapErrorColor);
  }
  .url-status-text[data-status="Warning"] {
    color: var(--sapWarningColor);
  }
  .url-status-text[data-status="Success"] {
    color: var(--sapSuccessColor);
  }
</style>
