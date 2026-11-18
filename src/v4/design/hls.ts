/**
 * hls.js for .m3u8 sources, loaded on demand. Pinned to an exact release so a
 * new upstream version can never change customer pages without a release here.
 */
export const HLS_SRC = "https://cdn.jsdelivr.net/npm/hls.js@1.7.4/dist/hls.min.js";

let pending: Promise<void> | null = null;

export function loadHls(): Promise<void> {
  if (window.Hls) return Promise.resolve();
  if (!pending) {
    pending = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = HLS_SRC;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }
  return pending;
}

/** Test hook */
export function resetHls(): void {
  pending = null;
}
