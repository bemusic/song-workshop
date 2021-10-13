import type { BMSObject } from "bms";

export type ObjectRow = { y: number; objects: BMSObject[]; timeKey: string };

export type RenoteData = {
  source: string;
  overrides?: {
    /** timeKey — '<measure>:<offset>' where 1 quarter note = 240 */
    [timeKey: string]: {
      [key: string]: {
        /** Keysound ID to use */
        value: string;
        /** Length of the note, where 1 quarter note = 240 */
        length?: number;
      };
    };
  };
  groupPatterns?: string[];
};
