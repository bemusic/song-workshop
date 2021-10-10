import _ from "lodash";
import pMemoize from "p-memoize";
import { createFfmpegInstance, getFfmpegInstance } from "./ffmpegCore";
import { SongWorkshopLibs } from "./SongWorkshopLibs";
import type { SoundAssetsMetadata } from "./types";
import parseArgs from "@ffmpeg/ffmpeg/src/utils/parseArgs";

export type RenderOptions = {
  soundAssetsMetadata: SoundAssetsMetadata;
  chartData: ArrayBuffer;
  chartFilename: string;
  loadBemusepack: (path: string) => Promise<ArrayBuffer>;
  log?: (text: string) => void;
};

export async function renderSong(options: RenderOptions) {
  const {
    soundAssetsMetadata,
    chartData,
    chartFilename,
    log = console.log,
  } = options;

  const keysounds: Record<string, AudioBuffer> = {};
  const loadRef = pMemoize(async (refId: number) => {
    const path = soundAssetsMetadata.refs[refId].path;
    log(`Loading ${path}`);
    return options.loadBemusepack(path);
  });
  const loadCtx = new OfflineAudioContext(2, 1, 44100);
  for (const file of soundAssetsMetadata.files) {
    try {
      const pack = await loadRef(file.ref[0]);
      const audioBuffer = await loadCtx.decodeAudioData(
        pack.slice(file.ref[1] + 14, file.ref[2] + 14)
      );
      log(`Decoded ${file.name}`);
      keysounds[file.name.toLowerCase()] = audioBuffer;
    } catch (error) {
      log(`Failed to decode ${file.name}: ${error}`);
      console.error(error);
    }
  }
  const getAudioBuffer = (path: string) => keysounds[path.toLowerCase()];

  log("Getting notes...");
  const song = await getNotes(chartData, chartFilename, {
    exists: (path) => !!getAudioBuffer(path),
  });
  const validNotes = song.data.flatMap((note) => {
    const buffer = getAudioBuffer(note.src);
    return buffer ? [{ ...note, buffer }] : [];
  });
  log(`Number of valid notes: ${validNotes.length}`);
  let totalDuration = 0;
  for (const note of validNotes) {
    const end = note.cutTime || note.time + note.buffer.duration;
    totalDuration = Math.max(totalDuration, end);
  }
  log(`Total duration: ${totalDuration}`);

  const renderingCtx = new OfflineAudioContext(
    2,
    Math.ceil(totalDuration * 44100),
    44100
  );
  for (const note of validNotes) {
    const source = renderingCtx.createBufferSource();
    source.buffer = note.buffer;
    source.loopStart = 0.1;
    source.connect(renderingCtx.destination);
    source.start(note.time);
    if (note.cutTime != undefined) {
      source.stop(note.cutTime);
    }
  }

  log(`Rendering audio...`);
  const buf = await renderingCtx.startRendering();

  log(`Getting ReplayGain...`);
  const replayGain = await getReplayGain(buf);
  log(`ReplayGain: ${replayGain}`);

  log("Converting to OGG file...");
  const ogg = await convertToOgg(buf, replayGain);

  return {
    ogg,
    replayGain,
  };
}

async function getReplayGain(buf: AudioBuffer) {
  const ffmpeg = await prepareFfmpeg(buf);
  try {
    let replayGain: number | undefined;
    {
      const args = [
        ...["-f", "f32le", "-ar", "44100", "-i", "ch0.f32"],
        ...["-f", "f32le", "-ar", "44100", "-i", "ch1.f32"],
        ...[
          "-f",
          "null",
          "-filter_complex",
          "[0:a][1:a]join=inputs=2:channel_layout=stereo[a],[a]replaygain[b]",
          "-map",
          "[b]",
          "nothing",
        ],
      ];
      const untap = ffmpeg.onStderr((text) => {
        const m = text.match(/track_gain = (\S+) dB/);
        console.debug("=>", text);
        if (m) {
          replayGain = parseFloat(m[1]);
        }
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
        // untap();
      }
    }
    if (!replayGain) {
      throw new Error("Failed to get ReplayGain");
    }
    return replayGain;
  } finally {
    ffmpeg.FS.unlink("ch0.f32");
    ffmpeg.FS.unlink("ch1.f32");
  }
}

async function convertToOgg(buf: AudioBuffer, replayGain: number) {
  const ffmpeg = await prepareFfmpeg(buf);
  try {
    const args = [
      ...["-f", "f32le", "-ar", "44100", "-i", "ch0.f32"],
      ...["-f", "f32le", "-ar", "44100", "-i", "ch1.f32"],
      ...[
        "-f",
        "ogg",
        "-acodec",
        "libvorbis",
        "-q:a",
        "6",
        "-filter_complex",
        `[0:a][1:a]join=inputs=2:channel_layout=stereo[a],[a]volume=volume=${
          replayGain + 4
        }dB[b]`,
        "-map",
        "[b]",
        "song.ogg",
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

    const ogg = await ffmpeg.FS.readFile("song.ogg");
    return ogg;
  } finally {
    ffmpeg.FS.unlink("ch0.f32");
    ffmpeg.FS.unlink("ch1.f32");
    ffmpeg.FS.unlink("song.ogg");
  }
}

async function prepareFfmpeg(buf: AudioBuffer) {
  const ffmpeg = await createFfmpegInstance();
  for (let i = 0; i < 2; i++) {
    const channel = buf.getChannelData(i);
    ffmpeg.FS.writeFile(
      `ch${i}.f32`,
      new Uint8Array(channel.buffer, channel.byteOffset, channel.byteLength)
    );
  }
  return ffmpeg;
}

async function getNotes(
  buffer: ArrayBuffer,
  name: string,
  io: {
    exists: (path: string) => boolean;
  }
) {
  const loader = new SongWorkshopLibs.notechartLoader.NotechartLoader();
  const notechart = await loader.load(buffer, { name }, { scratch: "left" });
  const notes = [...notechart.notes, ...notechart.autos];
  const info = notechart.songInfo;

  const keys = {};
  const times = _(notes)
    .filter((note) => !note.keysoundStart)
    .map((note) => ({
      time: note.time,
      src: lookup(note.keysound),
      keysound: note.keysound,
    }))
    .sortBy("time")
    .thru(cut)
    .value();

  return {
    path: name,
    info: info,
    data: times,
    keysounds: _(keys).values().map("result").compact().value(),
  };

  function lookup(k: string) {
    var result = keys[k] || (keys[k] = { result: find(k) });
    return result.result;
  }

  function find(k: string) {
    var wav = notechart.keysounds[k.toLowerCase()];
    if (!wav) return null;
    if (io.exists(wav)) return wav;
    wav = wav.replace(/\.\w\w\w$/, ".wav");
    if (io.exists(wav)) return wav;
    wav = wav.replace(/\.\w\w\w$/, ".ogg");
    if (io.exists(wav)) return wav;
    wav = wav.replace(/\.\w\w\w$/, ".mp3");
    if (io.exists(wav)) return wav;
    return null;
  }
}

function cut(
  sortedTimes: {
    keysound: string;
    time: number;
    cutTime?: number;
    src?: string;
  }[]
) {
  const last = {};
  sortedTimes = _.cloneDeep(sortedTimes);

  sortedTimes.forEach(function (note) {
    try {
      if (last[note.keysound]) {
        last[note.keysound].cutTime = note.time;
      }
    } finally {
      last[note.keysound] = note;
    }
  });

  return _.reject(sortedTimes, function (note) {
    return note.cutTime === note.time;
  });
}
