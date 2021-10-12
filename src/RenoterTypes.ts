import type { BMSObject } from "bms";

export type ObjectRow = { y: number; objects: BMSObject[]; timeKey: string };

export type RenoteData = {
  overrides: {
    /** timeKey — '<measure>:<offset>' where 1 quarter note = 240 */
    [timeKey: string]: {
      [key: string]: string;
    };
  };
};
