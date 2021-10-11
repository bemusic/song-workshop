<script lang="ts">
  import { Song, validateSong } from "./SongFile";
  export let onSave: (updater: (song: Song) => Song) => void;
  export let songJson: any;

  const valueOf = (id: string) => (document.getElementById(id) as any).value;

  function save() {
    onSave((newJson) => {
      newJson.title = valueOf("song_title");
      newJson.artist = valueOf("song_artist");
      newJson.genre = valueOf("song_genre");
      newJson.song_url = valueOf("song_url") || undefined;
      newJson.bms_url = valueOf("bms_url") || undefined;
      newJson.youtube_url = valueOf("youtube_url") || undefined;
      newJson.long_url = valueOf("long_url") || undefined;
      newJson.bmssearch_id = valueOf("bmssearch_id") || undefined;
      newJson.artist_url = valueOf("artist_url") || undefined;
      newJson.added = valueOf("added_date") || undefined;
      return newJson;
    });
  }

  $: songGenre = songJson.genre;
  $: songTitle = songJson.title;
  $: songUrl = songJson.song_url || "";
  $: bmsUrl = songJson.bms_url || "";
  $: youtubeUrl = songJson.youtube_url || "";
  $: longUrl = songJson.long_url || "";
  $: songArtist = songJson.artist;
  $: songArtistUrl = songJson.artist_url || "";
  $: addedDate = songJson.added || "";
  $: bmssearchId = songJson.bmssearch_id || "";

  $: warnings = validateSong(songJson);
</script>

<div style="display: flex; gap: 2rem">
  <div style="flex: 50% 1 1">
    <ui5-card>
      <ui5-card-header slot="header" title-text="Edit song metadata" />
      <div style="padding: 1rem;">
        <form>
          <p>
            <ui5-label for="song_genre">Song genre</ui5-label><br />
            <ui5-input id="song_genre" value={songGenre} />
          </p>
          <p>
            <ui5-label for="song_title">Song title</ui5-label><br />
            <ui5-input id="song_title" value={songTitle} />
          </p>
          <p class="indent">
            <ui5-label for="song_url">Song URL</ui5-label><br />
            <ui5-input
              id="song_url"
              style="width: 32em"
              value={songUrl}
              placeholder="e.g. SoundCloud"
            />
          </p>
          <p class="indent">
            <ui5-label for="bms_url">BMS download URL</ui5-label><br />
            <ui5-input
              id="bms_url"
              style="width: 32em"
              value={bmsUrl}
              placeholder="e.g. event venue entry page"
            />
          </p>
          <p class="indent">
            <ui5-label for="youtube_url">YouTube URL</ui5-label><br />
            <ui5-input
              id="youtube_url"
              style="width: 32em"
              value={youtubeUrl}
              placeholder=""
            />
          </p>
          <p class="indent">
            <ui5-label for="long_url">Long version URL</ui5-label><br />
            <ui5-input
              id="long_url"
              style="width: 32em"
              value={longUrl}
              placeholder="e.g. SoundCloud for extended version of this song"
            />
          </p>
          <p class="indent">
            <ui5-label for="bmssearch_id">BMS Search ID</ui5-label><br />
            <ui5-input
              id="bmssearch_id"
              style="width: 8em"
              value={bmssearchId}
            />
          </p>
          <p>
            <ui5-label for="song_artist">Song artist</ui5-label><br />
            <ui5-input id="song_artist" value={songArtist} />
          </p>
          <p class="indent">
            <ui5-label for="artist_url">Artist URL</ui5-label><br />
            <ui5-input
              id="artist_url"
              style="width: 32em"
              value={songArtistUrl}
              placeholder="e.g. website, SoundCloud, Twitter"
            />
          </p>
          <p>
            <ui5-label for="added_date">Released</ui5-label><br />
            <ui5-date-picker
              id="added_date"
              format-pattern="yyyy-MM-dd"
              value={addedDate}
            />
          </p>
          <p>
            <ui5-label for="song_description">Song description</ui5-label><br />
            <ui5-textarea
              id="song_description"
              placeholder="Description"
              growing
              growing-max-lines="10"
            />
          </p>
        </form>
        <div style="text-align:right">
          <ui5-button on:click={save}> Save song metadata </ui5-button>
        </div>
      </div>
    </ui5-card>
  </div>
  <div style="flex: 50% 1 1">
    <ui5-card>
      <ui5-card-header slot="header" title-text="Metadata checklist" />
      <div style="padding: 1rem;">
        {#if warnings.length > 0}
          <ul>
            {#each warnings as warning}
              <li>{warning.message}</li>
            {/each}
          </ul>
        {:else}
          No warnings
        {/if}
      </div>
    </ui5-card>
  </div>
</div>

<style>
  .indent {
    margin-left: 2rem;
  }
</style>
