<script lang="ts">
  import memoizeOne from "memoize-one";
  import { onMount } from "svelte";
  import { convertAudioFilesInDirectory } from "./audio";
  import { indexChartFilesFromDirectory } from "./ChartIndexing";
  import {
    getSelectedDirectory,
    SelectedDirectory,
    setSelectedDirectory,
    unsetSelectedDirectory,
  } from "./DirectorySelection";
  import ImagePreview from "./ImagePreview.svelte";
  import MetadataEditor from "./MetadataEditor.svelte";
  import {
    getSongFileHandleFromDirectory,
    getMetadataStatus,
    Song,
    updateSongFile,
  } from "./SongFile";
  import { createPreviewForDirectory } from "./SongPreview";
  import { renderChart, renderSongInDirectory } from "./SongRender";
  import type { SoundAssetsMetadata } from "./types";
  import VideoSynchronizer from "./VideoSynchronizer.svelte";

  let state:
    | "checking"
    | null
    | { directoryHandle: FileSystemDirectoryHandle } = "checking";

  async function chooseDirectory() {
    const dir = await window.showDirectoryPicker();
    await setSelectedDirectory(dir);
    await check();
  }

  async function closeDirectory() {
    try {
      await unsetSelectedDirectory();
    } finally {
      location.reload();
    }
  }

  async function check() {
    state = "checking";
    const dir = await getSelectedDirectory();
    if (!dir) {
      state = null;
    } else {
      state = { directoryHandle: dir };
    }
    await recheck();
  }

  let convertingAudioFiles = false;
  let convertStatus = "";
  async function convertAudioFiles() {
    convertingAudioFiles = true;
    convertStatus = "Indexing...";
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

  let indexingCharts = false;
  let indexStatus = "";
  async function indexCharts() {
    indexingCharts = true;
    try {
      if (typeof state !== "object") {
        throw new Error("No directory selected");
      }
      await indexChartFilesFromDirectory(state.directoryHandle, {
        setStatus: (status: string) => {
          indexStatus = status;
        },
      });
      indexStatus = "Finished indexing charts.";
    } finally {
      indexingCharts = false;
      recheck();
    }
  }

  let renderingSong = false;
  let chartSelector: any;
  let renderStatus = "";
  async function renderSong() {
    renderingSong = true;
    try {
      if (typeof state !== "object") {
        throw new Error("No directory selected");
      }
      const chartFilename: string = chartSelector.selectedOption.dataset.chart;
      const directoryHandle = state.directoryHandle;
      await renderSongInDirectory(
        state.directoryHandle,
        chartFilename,
        soundAssets,
        (message: string) => {
          renderStatus = message;
        }
      );
    } finally {
      renderingSong = false;
      recheck();
    }
  }

  let previewStartTimeInput: any;
  let creatingPreview = false;
  let createPreviewStatus = "";
  async function createPreview() {
    creatingPreview = true;
    try {
      if (typeof state !== "object") {
        throw new Error("No directory selected");
      }
      createPreviewStatus = "Creating preview...";
      const startTime = parseFloat(previewStartTimeInput.value) || 0;
      await createPreviewForDirectory(
        state.directoryHandle,
        startTime,
        (text) => {
          createPreviewStatus = text;
        }
      );
    } finally {
      creatingPreview = false;
      recheck();
    }
  }

  async function setVideoOffset(offset: number) {
    if (typeof state !== "object") {
      throw new Error("No directory selected");
    }
    await updateSongFile(state.directoryHandle, (song) => ({
      ...song,
      video_offset: offset,
    }));
    recheck();
  }

  let scanningVisualFiles = false;
  async function scanVisualFiles() {
    scanningVisualFiles = true;
    try {
      if (typeof state !== "object") {
        throw new Error("No directory selected");
      }

      const dir = state.directoryHandle;
      const bemuseDataDir = await state.directoryHandle.getDirectoryHandle(
        "bemuse-data"
      );
      const scan = async (paths: string[]): Promise<string | undefined> => {
        // Return the first file that exists.
        for (const path of paths) {
          try {
            const handle = await bemuseDataDir.getFileHandle(path);
            if (handle) {
              return path;
            }
          } catch (e) {}
        }
      };

      const backImageFile = await scan(["back_image.jpg", "back_image.png"]);
      const eyecatchImageFile = await scan([
        "eyecatch_image.jpg",
        "eyecatch_image.png",
      ]);
      const bgaFile = await scan(["bga.webm", "bga.mp4"]);
      console.log({
        backImageFile,
        eyecatchImageFile,
        bgaFile,
      });
      await updateSongFile(state.directoryHandle, (song) => {
        const toUrl = (file: string | undefined) =>
          file ? `bemuse-data/${file}` : undefined;
        return {
          ...song,
          back_image_url: toUrl(backImageFile),
          eyecatch_image_url: toUrl(eyecatchImageFile),
          video_url: toUrl(bgaFile),
        };
      });
    } finally {
      scanningVisualFiles = false;
      recheck();
    }
  }

  async function saveMetadata(
    update: (song: Song) => Song,
    readmeContents: string
  ) {
    try {
      if (typeof state !== "object") {
        throw new Error("No directory selected");
      }
      const { directoryHandle } = state;
      await updateSongFile(directoryHandle, update);
      const readmeHandle = await directoryHandle.getFileHandle("README.md", {
        create: true,
      });
      const writable = await readmeHandle.createWritable();
      await writable.write(readmeContents);
      await writable.close();
    } finally {
      recheck();
    }
  }

  Object.assign(window, { convertAudioFiles, indexCharts });

  let checkingSong = false;
  let readme = "";
  let soundAssets: SoundAssetsMetadata | null = null;
  let songMeta: any = null;
  let charts: any[] = [];
  let replayGain: string | undefined;
  let songOgg: string | undefined;
  let previewMp3: string | undefined;
  let previewCreated = false;

  const getSongOgg = memoizeOne(
    (file: File) => URL.createObjectURL(file),
    (next: [File], prev: [File]) =>
      next[0]?.lastModified === prev[0]?.lastModified
  );
  const getPreviewMp3 = memoizeOne(
    (file: File) => URL.createObjectURL(file),
    (next: [File], prev: [File]) =>
      next[0]?.lastModified === prev[0]?.lastModified
  );

  async function recheck() {
    checkingSong = true;
    try {
      if (typeof state !== "object") {
        throw new Error("No directory selected");
      }
      const { directoryHandle } = state;
      const bemuseDataDirPromise =
        directoryHandle.getDirectoryHandle("bemuse-data");
      const songJsonPromise = getSongFileHandleFromDirectory(directoryHandle, {
        create: false,
      })
        .then((f) => f.getFile())
        .then((f) => f.text())
        .then((text) => JSON.parse(text));

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

      try {
        const songJson = await songJsonPromise;
        songMeta = songJson;
        charts = songJson.charts;
      } catch (error) {
        songMeta = null;
        charts = [];
      }

      try {
        const readmeHandle = await directoryHandle.getFileHandle("README.md");
        readme = await readmeHandle.getFile().then((f) => f.text());
        console.log(readme);
      } catch (error) {
        console.error(error);
        readme = "";
      }

      try {
        const songJson = await songJsonPromise;
        replayGain = songJson.replaygain;
      } catch (error) {
        replayGain = undefined;
      }

      try {
        const bemuseDataDir = await bemuseDataDirPromise;
        const songFile = await bemuseDataDir
          .getFileHandle("song.ogg")
          .then((f) => f.getFile());
        songOgg = getSongOgg(songFile);
      } catch (error) {
        songOgg = undefined;
      }

      try {
        const bemuseDataDir = await bemuseDataDirPromise;
        const songFile = await bemuseDataDir
          .getFileHandle("preview.mp3")
          .then((f) => f.getFile());
        previewMp3 = getPreviewMp3(songFile);
      } catch (error) {
        previewMp3 = undefined;
      }

      try {
        const songJson = await songJsonPromise;
        previewCreated = !!songJson.preview_url;
      } catch (error) {
        previewCreated = false;
      }
    } finally {
      checkingSong = false;
    }
  }

  function formatSize(bytes: number) {
    return (bytes / 1048576).toFixed(2) + " MB";
  }

  function totalSize(soundAssets: SoundAssetsMetadata) {
    return soundAssets.refs.reduce((acc, ref) => {
      return acc + ref.size;
    }, 0);
  }

  $: metadataStatus = getMetadataStatus(songMeta);

  $: checkItems = [
    {
      label: "Optimize sound assets",
      description:
        "Sound assets should be optimized for smaller size and faster delivery.",
      ok: !!soundAssets,
      infoText: soundAssets
        ? `Already optimized — ${formatSize(totalSize(soundAssets))}`
        : "No sound assets found",
    },
    {
      label: "Scan chart files",
      description:
        "Scan the chart files to update the available charts in the song.",
      ok: charts.length > 0,
      infoText: charts.length + " chart files found",
    },
    {
      label: "Song preview",
      description: "Create a 30-second preview of the song.",
      ok: previewCreated,
      infoText: previewCreated
        ? "Preview already created"
        : "No preview file found",
    },
    {
      label: "Song metadata",
      description: "Set up song metadata.",
      ok: metadataStatus.ok,
      infoText: metadataStatus.infoText,
    },
  ];

  function formatChartExtra(chart: any) {
    const parts: string[] = [
      chart.keys + (chart.scratch ? "+" : ""),
      formatDuration(chart.duration),
      chart.noteCount + " notes",
      formatBpm(chart.bpm),
    ];

    return parts.join(" / ");
  }

  function formatDuration(seconds: number) {
    seconds = Math.ceil(seconds);
    return Math.floor(seconds / 60) + "m" + (seconds % 60) + "s";
  }

  function formatBpm(bpm: {
    init: number;
    min: number;
    median: number;
    max: number;
  }) {
    const f = (n: number) => n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    const soflan =
      bpm.min != bpm.max
        ? ` [${f(bpm.min)}/${f(bpm.median)}/${f(bpm.max)}]`
        : "";
    return `BPM: ${f(bpm.init)}${soflan}`;
  }

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
    <ui5-tabcontainer class="full-width" show-overflow fixed>
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
          <ui5-card-header
            slot="header"
            title-text="Charts"
            subtitle-text={indexStatus}
          >
            <ui5-button
              slot="action"
              on:click={indexCharts}
              disabled={indexingCharts}
            >
              Scan charts
            </ui5-button>
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
                <ui5-table-cell>
                  {chart.file}
                  <small style="display: block">
                    {formatChartExtra(chart)}
                  </small>
                </ui5-table-cell>
                <ui5-table-cell>
                  {chart.info.title}
                  {#each chart.info.subtitles as t}
                    <small style="display: block">{t}</small>
                  {/each}
                </ui5-table-cell>
                <ui5-table-cell>
                  {chart.info.artist}
                  {#each chart.info.subartists as t}
                    <small style="display: block">{t}</small>
                  {/each}
                </ui5-table-cell>
                <ui5-table-cell>{chart.info.genre}</ui5-table-cell>
                <ui5-table-cell>{chart.info.level}</ui5-table-cell>
                <ui5-table-cell>{chart.info.difficulty}</ui5-table-cell>
              </ui5-table-row>
            {/each}
          </ui5-table>
        </ui5-card>
      </ui5-tab>

      <ui5-tab text="Preview" icon="media-play" style="padding: 1rem">
        <ui5-card>
          <ui5-card-header slot="header" title-text="Render song" />
          <div
            style="padding: 1rem; display: flex; gap: 1rem; align-items: center"
          >
            {#if charts.length > 0 && soundAssets}
              <ui5-select bind:this={chartSelector}>
                {#each charts as chart}
                  <ui5-option data-chart={chart.file}>{chart.file}</ui5-option>
                {/each}
              </ui5-select>
              <ui5-button on:click={renderSong} disabled={renderingSong}>
                Render song
              </ui5-button>
              <ui5-label>{renderStatus}</ui5-label>
            {:else}
              <ui5-label>
                Please optimize sound assets and scan charts first.
              </ui5-label>
            {/if}
          </div>
          {#if replayGain && songOgg}
            <div
              style="padding: 0 1rem 1rem; display: flex; gap: 1rem; align-items: center"
            >
              <audio controls src={songOgg} />
              <ui5-label>
                ReplayGain: {replayGain}
              </ui5-label>
            </div>
          {/if}
        </ui5-card>

        {#if replayGain && songOgg}
          <ui5-card style="margin-top: 1rem">
            <ui5-card-header slot="header" title-text="Create song preview" />
            <div
              style="padding: 1rem; display: flex; gap: 1rem; align-items: center"
            >
              <ui5-input
                placeholder="Start time in seconds"
                bind:this={previewStartTimeInput}
                value={songMeta.preview_offset || ""}
              />
              <ui5-button on:click={createPreview} disabled={creatingPreview}>
                Create song preview
              </ui5-button>
              <ui5-label>{createPreviewStatus}</ui5-label>
            </div>
            {#if previewMp3}
              <div
                style="padding: 0 1rem 1rem; display: flex; gap: 1rem; align-items: center"
              >
                <audio controls src={previewMp3} />
              </div>
            {/if}
          </ui5-card>
        {/if}
      </ui5-tab>

      <ui5-tab text="Metadata" icon="information" style="padding: 1rem">
        {#if songMeta}
          <MetadataEditor songJson={songMeta} onSave={saveMetadata} {readme} />
        {:else}
          <ui5-label> Please scan charts first. </ui5-label>
        {/if}
      </ui5-tab>

      <ui5-tab text="Visuals" icon="attachment-video" style="padding: 1rem">
        <ui5-card>
          <ui5-card-header
            slot="header"
            title-text="Scan image and BGA files"
          />
          <div style="padding: 1rem">
            <ui5-button
              on:click={scanVisualFiles}
              disabled={scanningVisualFiles}
            >
              Scan
            </ui5-button>
          </div>
          <div style="padding: 0 1rem 1rem">
            Expecting files in these locations:
            <ul>
              <li>bemuse-data/back_image.(jpg/png)</li>
              <li>bemuse-data/eyecatch_image.(jpg/png)</li>
              <li>bemuse-data/bga.(webm/mp4)</li>
            </ul>
          </div>
        </ui5-card>

        {#if songMeta && state && typeof state === "object"}
          <div
            style="display: flex; margin-top: 1rem; gap: 1rem; align-items: flex-start"
          >
            <div style="width: 50%; flex: 1">
              <ui5-card>
                <ui5-card-header slot="header" title-text="Eyecatch image" />
                <ImagePreview
                  directoryHandle={state.directoryHandle}
                  path={songMeta.eyecatch_image_url}
                />
              </ui5-card>
              <ui5-card style="margin-top: 1rem">
                <ui5-card-header slot="header" title-text="Background image" />
                <ImagePreview
                  directoryHandle={state.directoryHandle}
                  path={songMeta.back_image_url}
                />
              </ui5-card>
            </div>
            <div style="width: 50%; flex: 1">
              <ui5-card>
                <ui5-card-header slot="header" title-text="BGA" />
                <div style="padding:1rem">
                  {#if songMeta.video_url}
                    {#if songOgg}
                      <VideoSynchronizer
                        directoryHandle={state.directoryHandle}
                        videoPath={songMeta.video_url}
                        videoOffset={+songMeta.video_offset || 0}
                        {setVideoOffset}
                        {songOgg}
                      />
                    {:else}
                      Please render the song in "Preview" tab first.
                    {/if}
                  {:else}
                    No BGA file. Please add a BGA file at the expected locations
                    and rescan.
                  {/if}
                </div>
              </ui5-card>
            </div>
          </div>
        {/if}
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
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
