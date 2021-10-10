export async function getSongFileHandleFromDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  opts: FileSystemGetFileOptions
) {
  return directoryHandle
    .getDirectoryHandle("bemuse-data", opts)
    .then((d) => d.getFileHandle("song.json", opts));
}
