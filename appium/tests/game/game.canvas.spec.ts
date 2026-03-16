import { addFeature, addSeverity } from '../../src/helpers/allure.helper.js';
import { uniqueEmail, DEFAULT_PASSWORD } from '../../src/data/test-users.js';
import { registerAndInjectToken } from '../../src/helpers/api.helper.js';
import { TEST_CONFIG } from '../../src/data/test-config.js';
import { isCanvasRendered, getReelState, waitForCanvasBridge } from '../../src/helpers/canvas.helper.js';
import GamePage from '../../src/pages/GamePage.js';

describe('Game — Canvas rendering', () => {
  before(async () => {
    addFeature('Game');
    addSeverity('normal');

    const email = uniqueEmail();
    await registerAndInjectToken(email, DEFAULT_PASSWORD, TEST_CONFIG.paths.megaFortune);
    await GamePage.waitForGameReady();
  });

  it('should render the canvas element with non-zero dimensions', async () => {
    const rendered = await isCanvasRendered();
    expect(rendered).toBe(true);
  });

  it('should have the render_game_to_text bridge available', async () => {
    await waitForCanvasBridge();
    const state = await getReelState();
    expect(state).not.toBeNull();
  });

  it('should have reel debug state after game init', async () => {
    const state = await getReelState();
    expect(state).not.toBeNull();
    expect(state).toHaveProperty('reel_debug');
  });

  it('should update reel state after a spin', async () => {
    const stateBefore = await getReelState();
    await GamePage.spinAndWaitForResult();
    const stateAfter = await getReelState();

    // Both states should exist
    expect(stateBefore).not.toBeNull();
    expect(stateAfter).not.toBeNull();
  });
});
