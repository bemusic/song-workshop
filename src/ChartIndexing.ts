import type { IndexingInputFile } from "bemuse-indexer/lib/types";
import { getSongFileHandleFromDirectory } from "./SongFile";
import { SongWorkshopLibs } from "./SongWorkshopLibs";

export type IndexIO = {
  setStatus: (status: string) => void;
};

export async function indexChartFilesFromDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  io: IndexIO
) {
  const inputs: IndexingInputFile[] = [];
  for await (let [name, handle] of directoryHandle) {
    try {
      if (handle.kind === "file" && /\.(bms|bme|bml|bmson)$/i.test(name)) {
        io.setStatus(`Reading ${name}...`);
        const fileHandle = handle;
        const file = await fileHandle.getFile();
        const fileContents = await file.arrayBuffer();
        const buffer = SongWorkshopLibs.buffer.Buffer.from(fileContents);
        inputs.push({
          name,
          data: buffer,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }
  io.setStatus("Indexing charts...");
  const result = await SongWorkshopLibs.indexer.getSongInfo(inputs, {
    onProgress: (processed, total, name) => {
      io.setStatus(`Indexed (${processed}/${total}) ${name}...`);
    },
  });
  const data = await getSongFileHandleFromDirectory(directoryHandle, {
    create: false,
  })
    .then((handle) => handle.getFile())
    .then(async (file) => JSON.parse(await file.text()))
    .catch((e) => {
      console.warn("Failed to read initial data", e);
      return {};
    });

  Object.assign(data, {
    charts: result.charts,
    title: data.title || result.title,
    artist: data.artist || result.artist,
    genre: data.genre || result.genre,
    bpm: data.bpm || result.bpm,
  });

  const fileHandle = await getSongFileHandleFromDirectory(directoryHandle, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

// SongWorkshopLibs.indexer.getSongInfo(files, { onProgress })
