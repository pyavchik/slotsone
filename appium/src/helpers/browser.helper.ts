/**
 * Mobile-specific browser helpers: gestures, keyboard, orientation.
 */

/**
 * Scroll an element into the visible viewport.
 */
export async function scrollIntoView(selector: string): Promise<void> {
  const el = await $(selector);
  await el.scrollIntoView();
}

/**
 * Dismiss the soft keyboard if it's open.
 * Uses `hideKeyboard` on Appium drivers; falls back to pressing Escape.
 */
export async function dismissKeyboard(): Promise<void> {
  try {
    if (browser.isAndroid) {
      await browser.hideKeyboard();
    } else if (browser.isIOS) {
      // iOS Safari: tap outside or use "Done" bar
      await browser.execute(() => {
        (document.activeElement as HTMLElement)?.blur();
      });
    }
  } catch {
    // Keyboard may not be open — non-fatal
  }
}

/**
 * Swipe gesture on the screen.
 */
export async function swipe(
  direction: 'up' | 'down' | 'left' | 'right',
  distance = 300,
): Promise<void> {
  const { width, height } = await browser.getWindowSize();
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  const vectors: Record<string, { endX: number; endY: number }> = {
    up: { endX: centerX, endY: centerY - distance },
    down: { endX: centerX, endY: centerY + distance },
    left: { endX: centerX - distance, endY: centerY },
    right: { endX: centerX + distance, endY: centerY },
  };

  const { endX, endY } = vectors[direction];

  await browser.action('pointer', {
    parameters: { pointerType: 'touch' },
  })
    .move({ x: centerX, y: centerY })
    .down()
    .pause(100)
    .move({ x: endX, y: endY, duration: 300 })
    .up()
    .perform();
}

/**
 * Set device orientation (portrait or landscape).
 */
export async function setOrientation(orientation: 'PORTRAIT' | 'LANDSCAPE'): Promise<void> {
  try {
    await browser.setOrientation(orientation);
  } catch {
    // Orientation control may not be available in all contexts
  }
}
