import { prepareFfmpeg } from "./SongRender";
import parseArgs from "@ffmpeg/ffmpeg/src/utils/parseArgs";
import { updateSongFile } from "./SongFile";

export async function createPreviewForDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  startTime: number,
  log: (text: string) => void
) {
  const renderContext = new OfflineAudioContext(2, 44100 * 30, 44100);
  const songBuffer = await directoryHandle
    .getDirectoryHandle("bemuse-data")
    .then((dir) => dir.getFileHandle("song.ogg"))
    .then((f) => f.getFile())
    .then((f) => f.arrayBuffer())
    .then((ab) => renderContext.decodeAudioData(ab));

  log("Rendering preview...");
  const songSource = renderContext.createBufferSource();
  songSource.buffer = songBuffer;
  const gain = renderContext.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(1, 0.5);
  gain.gain.linearRampToValueAtTime(1, 27);
  gain.gain.linearRampToValueAtTime(0, 30);
  gain.connect(renderContext.destination);
  songSource.connect(gain);
  songSource.start(0, startTime);

  const result = await renderContext.startRendering();

  log("Encoding MP3...");
  const mp3 = await convertToMp3(result);

  const writable = await directoryHandle
    .getDirectoryHandle("bemuse-data")
    .then((d) => d.getFileHandle("preview.mp3", { create: true }))
    .then((h) => h.createWritable());
  await writable.write(mp3);
  await writable.close();
  log("Song preview created");

  await updateSongFile(directoryHandle, (song) => {
    return {
      ...song,
      preview_offset: startTime,
      preview_url: "bemuse-data/preview.mp3",
    };
  });
}

async function convertToMp3(buf: AudioBuffer) {
  const ffmpeg = await prepareFfmpeg(buf);
  try {
    const args = [
      ...["-f", "f32le", "-ar", "44100", "-i", "ch0.f32"],
      ...["-f", "f32le", "-ar", "44100", "-i", "ch1.f32"],
      ...[
        "-f",
        "mp3",
        "-acodec",
        "libmp3lame",
        "-b",
        "128",
        "-filter_complex",
        `[0:a][1:a]join=inputs=2:channel_layout=stereo[a]`,
        "-map",
        "[a]",
        "preview.mp3",
      ],
    ];
    console.debug("=>", args);
    const untap = ffmpeg.onStderr((text) => {
      console.debug("=>", text);
    });
    try {
      ffmpeg.ccall(
        "main",
        "number",
        ["number", "number"],
        parseArgs(ffmpeg, ["ffmpeg", "-hide_banner", "-nostdin", ...args])
      );
    } catch (e) {
      console.error(e);
    } finally {
      untap();
    }

    const mp3 = await ffmpeg.FS.readFile("preview.mp3");
    return mp3 as Uint8Array;
  } finally {
    ffmpeg.FS.unlink("ch0.f32");
    ffmpeg.FS.unlink("ch1.f32");
    ffmpeg.FS.unlink("preview.mp3");
  }
}
