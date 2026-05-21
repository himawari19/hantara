/**
 * Preload Monaco Editor chunk on demand.
 * Call this on hover/focus of elements that will need Monaco.
 * Uses requestIdleCallback to avoid blocking the main thread.
 */
let preloaded = false;

export function preloadMonaco() {
  if (preloaded) return;
  preloaded = true;

  const load = () => {
    import("@monaco-editor/react").catch(() => {
      // Silently fail — Monaco will load normally when needed
      preloaded = false;
    });
  };

  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(load, { timeout: 3000 });
  } else {
    setTimeout(load, 100);
  }
}
