declare namespace SongWorkshopLibsNamespace {
  export const bms: typeof import("bms");
  export const indexer: typeof import("bemuse-indexer");
  export const buffer: typeof import("buffer");
}

export const SongWorkshopLibs: typeof SongWorkshopLibsNamespace = (
  window as any
).SongWorkshopLibs;
