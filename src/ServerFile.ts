import type { Song } from "./SongFile";

export interface ServerFile {
  urls: UrlEntry[];
  songs: SongEntry[];
}

export interface UrlEntry {
  url: string;
  added?: string;
}

export interface SongEntry extends Song {
  id: string;
  path: string;
}
