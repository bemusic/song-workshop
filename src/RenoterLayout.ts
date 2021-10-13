import type { BMSObject } from "bms";
import { memoize } from "lodash";
import type { ObjectRow, RenoteData } from "./RenoterTypes";

export interface RenoterLayout {
  getX(row: ObjectRow, object: BMSObject): number;
}

export function calculateLayout(
  objectRows: ObjectRow[],
  groups: RenoteData["groups"]
): RenoterLayout {
  const initializeGroup = () => ({ width: 1 });
  const output = [groups.map(() => initializeGroup()), initializeGroup()];

  for (const row of objectRows) {
    const byGroupIndex = memoize(() => ({ width: 0 }));
  }

  return {
    getX: (row, object) => 96 + (10 + row.objects.indexOf(object)) * 32,
  };
}
