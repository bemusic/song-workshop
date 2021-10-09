<script lang="ts">
  import * as kv from "idb-keyval";
  import { onMount } from "svelte";

  let state: "checking" | null | {} = "checking";
  let permissionDialog: any;
  let permissionDialogAllowButton: any;

  type SelectedDirectory = {
    directoryHandle: FileSystemDirectoryHandle;
    id: string;
  };

  async function chooseDirectory() {
    const dir = await window.showDirectoryPicker();
    await kv.set("selectedDirectory", {
      directoryHandle: dir,
      id: "dir" + Date.now(),
    });
    check();
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

  async function check() {
    state = "checking";
    const data: SelectedDirectory | undefined = await kv.get(
      "selectedDirectory"
    );
    const dir = (data && data.directoryHandle) as
      | FileSystemDirectoryHandle
      | undefined;
    if (!dir) {
      state = null;
      return;
    }
    let permission = await dir.queryPermission({ mode: "readwrite" });
    if (permission === "prompt") {
      try {
        permission = await dir.requestPermission({ mode: "readwrite" });
      } catch (error) {
        await new Promise<void>((resolve, reject) => {
          permissionDialog.show();
          permissionDialog.addEventListener("before-close", () => {
            reject(new Error("Dialog closed"));
          });
          permissionDialogAllowButton.addEventListener("click", () => {
            resolve();
            permissionDialog.close();
          });
        });
        permission = await dir.requestPermission({ mode: "readwrite" });
      }
    }
    if (permission !== "granted") {
      throw new Error("Folder access permission denied");
    }
    state = {};
  }

  onMount(() => {
    check();
  });
</script>

<main>
  <ui5-shellbar
    id="shellbar"
    primary-title="Bemuse"
    secondary-title="Custom Song Workshop"
  />
  {#if state === "checking"}
    <div style="text-align: center; padding: 1rem;">
      <ui5-busy-indicator active size="Large" />
    </div>
  {:else if !state}
    <ui5-illustrated-message
      name="NoData"
      title-text="No active project"
      subtitle-text="Please choose a song folder to get started"
    >
      <ui5-button design="Emphasized" on:click={chooseDirectory}>
        Choose a song folder
      </ui5-button>
    </ui5-illustrated-message>
  {:else}
    <ui5-tabcontainer class="full-width" show-overflow>
      <ui5-tab text="Overview" selected>
        <ui5-label>..!.</ui5-label>
      </ui5-tab>
      <ui5-tab text="Sound files">
        <ui5-label>...</ui5-label>
      </ui5-tab>
      <ui5-tab text="Charts">
        <ui5-label>...</ui5-label>
      </ui5-tab>
    </ui5-tabcontainer>
  {/if}

  <ui5-dialog bind:this={permissionDialog} header-text="Permission required">
    <ui5-label>Please allow access to file system</ui5-label>

    <div slot="footer" style="padding: 0.5rem">
      <ui5-button design="Emphasized" bind:this={permissionDialogAllowButton}>
        Allow
      </ui5-button>
      <ui5-button design="Negative" on:click={permissionDialog.close()}>
        Deny
      </ui5-button>
    </div>
  </ui5-dialog>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
