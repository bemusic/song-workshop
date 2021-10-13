import type { BMSObject } from "bms";

export type ObjectRow = { y: number; objects: BMSObject[]; timeKey: string };

export type RenoteData = {
  source: string;
  replace?: Record<string, string>;
  addSubartist?: string;
  newNotes?: {
    /** timeKey — '<measure>:<offset>' where 1 quarter note = 240 */
    [timeKey: string]: {
      /** Key is 'K1..K7' or 'SC' */
      [key: string]: {
        /** Keysound ID to use */
        value: string;
        /** Length of the note, where 1 quarter note = 240 */
        length?: number;
      };
    };
  };
  groups?: {
    patterns: string[];
  }[];
};
