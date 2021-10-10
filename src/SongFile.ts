export async function getSongFileHandleFromDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  opts: FileSystemGetFileOptions
) {
  return directoryHandle
    .getDirectoryHandle("bemuse-data", opts)
    .then((d) => d.getFileHandle("song.json", opts));
}

type Song = any;

export async function updateSongFile(
  directoryHandle: FileSystemDirectoryHandle,
  updater: (song: Song) => Song
) {
  const data = await getSongFileHandleFromDirectory(directoryHandle, {
    create: false,
  })
    .then((handle) => handle.getFile())
    .then(async (file) => JSON.parse(await file.text()))
    .catch((e) => {
      console.warn("Failed to read initial data", e);
      return {};
    });

  const newData = updater(data);

  const fileHandle = await getSongFileHandleFromDirectory(directoryHandle, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(newData, null, 2));
  await writable.close();
}
