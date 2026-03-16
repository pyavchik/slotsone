/**
 * PixiJS canvas bridge — uses the existing `window.render_game_to_text()` function
 * exposed by SlotCanvas.tsx in the frontend.
 */

interface ReelDebugState {
  reel_debug?: unknown;
  [key: string]: unknown;
}

/**
 * Call the frontend's render_game_to_text() to get the current reel state.
 * Returns null if the bridge is not available (game not loaded yet).
 */
export async function getReelState(): Promise<ReelDebugState | null> {
  const result = await browser.execute(() => {
    const fn = (window as Window & { render_game_to_text?: () => string })
      .render_game_to_text;
    if (typeof fn !== 'function') return null;
    try {
      return fn();
    } catch {
      return null;
    }
  });

  if (!result) return null;
  return typeof result === 'string' ? JSON.parse(result) : result;
}

/**
 * Check whether the canvas element exists and has non-zero dimensions.
 */
export async function isCanvasRendered(): Promise<boolean> {
  return browser.execute(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    return canvas.width > 0 && canvas.height > 0;
  });
}

/**
 * Wait for the render_game_to_text bridge to become available.
 */
export async function waitForCanvasBridge(timeoutMs = 15000): Promise<void> {
  await browser.waitUntil(
    async () => {
      const state = await getReelState();
      return state !== null;
    },
    { timeout: timeoutMs, timeoutMsg: 'Canvas bridge (render_game_to_text) not available' },
  );
}
