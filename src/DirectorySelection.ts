import * as kv from "idb-keyval";

export type SelectedDirectory = {
  directoryHandle: FileSystemDirectoryHandle;
  id: string;
};

export async function setSelectedDirectory(
  directoryHandle: FileSystemDirectoryHandle
) {
  return await kv.set("selectedDirectory", {
    directoryHandle: directoryHandle,
    id: "dir" + Date.now(),
  });
}

export async function unsetSelectedDirectory() {
  await kv.del("selectedDirectory");
}

function restoreDirectoryHandle(
  data: SelectedDirectory | undefined
): FileSystemDirectoryHandle | undefined {
  if (!data) {
    return undefined;
  }
  const anyWindow = window as any;
  if (
    anyWindow.savedSelectedDirectory &&
    anyWindow.savedSelectedDirectory.id === data.id
  ) {
    return anyWindow.savedSelectedDirectory.directoryHandle;
  }
  anyWindow.savedSelectedDirectory = data;
  return data.directoryHandle;
}

export async function getSelectedDirectory() {
  const data: SelectedDirectory | undefined = await kv.get("selectedDirectory");
  const dir = restoreDirectoryHandle(data);
  if (!dir) {
    return null;
  }
  let permission = await dir.queryPermission({ mode: "readwrite" });
  if (permission === "prompt") {
    try {
      permission = await dir.requestPermission({ mode: "readwrite" });
    } catch (error) {
      await showDialog();
      permission = await dir.requestPermission({ mode: "readwrite" });
    }
  }
  if (permission !== "granted") {
    throw new Error("Folder access permission denied");
  }
  return dir;
}

async function showDialog() {
  const div = document.createElement("div");
  document.body.appendChild(div);
  try {
    return await new Promise<void>((resolve, reject) => {
      div.innerHTML = `<ui5-dialog data-id="dialog" header-text="Permission required">
        <ui5-label>Please allow access to file system</ui5-label>
        <div slot="footer" style="padding: 0.5rem">
          <ui5-button design="Emphasized" data-id="allow">
            Allow
          </ui5-button>
          <ui5-button design="Negative" data-id="deny">
            Deny
          </ui5-button>
        </div>
      </ui5-dialog>`;
      const permissionDialog = div.querySelector("[data-id=dialog]") as any;
      const allowButton = div.querySelector("[data-id=allow]");
      const denyButton = div.querySelector("[data-id=deny]");
      permissionDialog.addEventListener("before-close", () => {
        reject(new Error("Dialog closed"));
      });
      allowButton.addEventListener("click", () => {
        resolve();
        permissionDialog.close();
      });
      denyButton.addEventListener("click", () => {
        permissionDialog.close();
      });
      permissionDialog.show();
    });
  } finally {
    document.body.removeChild(div);
  }
}
