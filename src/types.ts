export interface SoundAssetsMetadata {
  refs: {
    path: string;
    hash: string;
    size: number;
  }[];
  files: {
    name: string;
    ref: [string, string, string];
  }[];
}
