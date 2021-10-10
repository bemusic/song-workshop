import { fetchFile } from "@ffmpeg/ffmpeg";
import parseArgs from "@ffmpeg/ffmpeg/src/utils/parseArgs";
import { BemusePackage } from "./BemusePackage";
import { hashBlob } from "./BlobHashing";
import type { SoundAssetsMetadata } from "./types";

declare const createFFmpegCore: any;

const createFfmpegInstance = async () => {
  const wasmUrl = await fetch("/ffmpeg-core-st/ffmpeg-core.wasm")
    .then((r) => r.blob())
    .then((b) => URL.createObjectURL(b));
  const core = await createFFmpegCore({
    mainScriptUrlOrBlob: "/ffmpeg-core-st/ffmpeg-core.js",
    printErr: (message) => {},
    print: (message) => {},
    locateFile: (path, prefix) => {
      if (path.endsWith("ffmpeg-core.wasm")) {
        return wasmUrl;
      }
      return prefix + path;
    },
  });
  return core;
};

Object.assign(window, { createFfmpegInstance });

type ConvertIO = {
  setStatus: (status: string) => void;
  writeWarning: (text: string) => void;
};

export async function convertAudioFilesInDirectory(
  dir: FileSystemDirectoryHandle,
  io: ConvertIO
) {
  let i = 1;
  io.setStatus("Loading ffmpeg core (~16 MB, please wait)…");
  let ffmpeg = await createFfmpegInstance();
  io.setStatus("Getting ready to convert files.");
  const soundAssets: SoundAsset[] = [];
  for await (const [name, handle] of dir) {
    if (handle.kind === "file" && /\.(?:mp3|wav|ogg)$/i.test(name)) {
      const num = i++;
      try {
        const file = await handle.getFile();
        if (file.size === 0) {
          io.writeWarning(`Skipping empty file ${name}`);
          continue;
        }
        const inBuffer = await fetchFile(file);
        const inFileName = "in_" + num + "." + name.substring(-3);
        const outFileName = "out_" + num + ".ogg";
        ffmpeg.FS.writeFile(inFileName, inBuffer);
        try {
          try {
            const args = [
              "-i",
              inFileName,
              "-ac",
              "2",
              "-ar",
              "44100",
              "-acodec",
              "libvorbis",
              "-threads",
              "1",
              outFileName,
            ];
            ffmpeg.ccall(
              "main",
              "number",
              ["number", "number"],
              parseArgs(ffmpeg, ["ffmpeg", "-hide_banner", "-nostdin", ...args])
            );
          } catch (e) {
            console.log(e);
          }
          const outBuffer = ffmpeg.FS.readFile(outFileName);
          ffmpeg.FS.unlink(outFileName);
          console.log(name, inBuffer.length, "=>", outBuffer.length);
          soundAssets.push({
            name: name.substring(0, name.length - 4) + ".ogg",
            size: outBuffer.length,
            buffer: outBuffer,
          });
          io.setStatus(`Converted sound asset #${num}: ${name}`);
        } finally {
          ffmpeg.FS.unlink(inFileName);
        }
      } catch (error) {
        io.writeWarning(`Error converting ${name}: ${error}`);
        console.error(error);
      }
      await new Promise(requestAnimationFrame);
    }
  }
  soundAssets.sort((a, b) => {
    if (a.size !== b.size) {
      return b.size - a.size;
    }
    return a.name.localeCompare(b.name);
  });
  const packer = new SoundAssetPacker();
  for (const asset of soundAssets) {
    packer.add(asset);
  }
  io.setStatus("Writing asset files.");
  await packer.writeToDirectory(dir, io);
  io.setStatus(
    `Converted. Assets: ${soundAssets.length}, Packs: ${packer.getNumPacks()}`
  );
}

class SoundAssetPacker {
  private max = 1474560;
  private cur: BemusePackage | null = null;
  private packs: BemusePackage[] = [];
  private files: {
    name: string;
    ref: readonly [number, number, number];
  }[] = [];
  add(asset: SoundAsset) {
    if (
      this.cur === null ||
      (this.cur.size > 0 && this.cur.size + asset.size > this.max)
    ) {
      this.cur = new BemusePackage();
      this.packs.push(this.cur);
    }
    const range = this.cur.addBlob(new Blob([asset.buffer]));
    const ref = [this.packs.length - 1, ...range] as const;
    this.files.push({ name: asset.name, ref });
  }
  getNumPacks() {
    return this.packs.length;
  }
  async writeToDirectory(
    directoryHandle: FileSystemDirectoryHandle,
    io: ConvertIO
  ) {
    const dir = await directoryHandle
      .getDirectoryHandle("bemuse-data", { create: true })
      .then((h) => h.getDirectoryHandle("sound", { create: true }));
    const refs: SoundAssetsMetadata["refs"] = [];
    for (const [i, pack] of this.packs.entries()) {
      const blob = pack.toBlob();
      const hash = await hashBlob(blob);
      const fileName = "oggs." + i + "." + hash.substring(0, 8) + ".bemuse";
      const file = await dir.getFileHandle(fileName, { create: true });
      const writable = await file.createWritable();
      await writable.write(blob);
      await writable.close();
      refs.push({ path: fileName, hash, size: blob.size });
      io.setStatus(`Wrote pack #${i + 1}: ${fileName}`);
    }

    // Write metadata file
    {
      const metadata = JSON.stringify({
        files: this.files,
        refs,
      });
      const file = await dir.getFileHandle("metadata.json", { create: true });
      const writable = await file.createWritable();
      await writable.write(new TextEncoder().encode(metadata));
      await writable.close();
    }
  }
}

type SoundAsset = {
  name: string;
  size: number;
  buffer: Uint8Array;
};
