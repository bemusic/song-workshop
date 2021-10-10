import pMemoize from "p-memoize";

declare const createFFmpegCore: any;

export const createFfmpegInstance = async () => {
  const wasmUrl = await fetch("/ffmpeg-core-st/ffmpeg-core.wasm")
    .then((r) => r.blob())
    .then((b) => URL.createObjectURL(b));
  const stderrTap = new Set<(text: string) => void>();
  const core = await createFFmpegCore({
    mainScriptUrlOrBlob: "/ffmpeg-core-st/ffmpeg-core.js",
    printErr: (message) => {
      stderrTap.forEach((t) => t(message));
    },
    print: (message) => {
      stderrTap.forEach((t) => t(message));
    },
    locateFile: (path, prefix) => {
      if (path.endsWith("ffmpeg-core.wasm")) {
        return wasmUrl;
      }
      return prefix + path;
    },
  });
  return Object.assign(core, {
    onStderr: (cb: (text: string) => void) => {
      stderrTap.add(cb);
      return () => stderrTap.delete(cb);
    },
  });
};

export const getFfmpegInstance = pMemoize(createFfmpegInstance);
Object.assign(window, { createFfmpegInstance, getFfmpegInstance });
