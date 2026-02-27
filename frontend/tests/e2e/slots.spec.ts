import { expect, test } from '@playwright/test';

const MOCK_CONFIG = {
  reels: 5,
  rows: 3,
  paylines: 20,
  currencies: ['USD'],
  min_bet: 0.1,
  max_bet: 100,
  min_lines: 1,
  max_lines: 20,
  default_lines: 20,
  line_defs: [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2],
    [1, 0, 0, 0, 1],
    [1, 2, 2, 2, 1],
  ],
  bet_levels: [0.1, 0.2, 0.5, 1, 2, 5, 10],
  paytable_url: '',
  paytable: {
    line_wins: [
      { symbol: 'Star', x3: 0.5, x4: 2, x5: 10 },
      { symbol: 'A', x3: 0.5, x4: 1.5, x5: 5 },
    ],
    scatter: {
      symbol: 'Scatter',
      awards: [
        { count: 3, free_spins: 5 },
        { count: 4, free_spins: 10 },
      ],
    },
    wild: {
      symbol: 'Wild',
      substitutes_for: ['10', 'J', 'Q', 'K', 'A', 'Star'],
    },
  },
  rules_url: '',
  rtp: 96.5,
  volatility: 'high',
  features: ['free_spins', 'multipliers', 'scatter'],
};

test.describe('Slots app', () => {
  test('opens from CV page and performs a spin', async ({ page }) => {
    let spinRequests = 0;
    let balance = 1000;

    await page.context().route('**/api/v1/game/init', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session_id: 'sess_e2e_1',
          game_id: 'slot_mega_fortune_001',
          config: MOCK_CONFIG,
          balance: { amount: balance, currency: 'USD' },
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }),
      });
    });

    await page.context().route('**/api/v1/spin', async (route) => {
      spinRequests += 1;
      const requestBody = route.request().postDataJSON() as {
        bet?: { amount?: number; currency?: string; lines?: number };
      };
      const betAmount = requestBody.bet?.amount ?? 1;
      const lines = requestBody.bet?.lines ?? 20;
      const currency = requestBody.bet?.currency ?? 'USD';
      const winAmount = 0.2;
      balance = Math.round((balance - betAmount + winAmount) * 100) / 100;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          spin_id: `spin_e2e_${spinRequests}`,
          session_id: 'sess_e2e_1',
          game_id: 'slot_mega_fortune_001',
          balance: { amount: balance, currency },
          bet: { amount: betAmount, currency, lines },
          outcome: {
            reel_matrix: [
              ['A', 'Q', '10'],
              ['A', 'K', 'J'],
              ['A', 'Wild', 'Q'],
              ['10', 'K', 'J'],
              ['Q', 'J', '10'],
            ],
            win: {
              amount: winAmount,
              currency,
              breakdown: [
                { type: 'line', line_index: 0, symbol: 'A', count: 3, payout: winAmount },
              ],
            },
            bonus_triggered: null,
          },
          next_state: 'base_game',
          timestamp: Date.now(),
        }),
      });
    });

    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Oleksander Pyavchik/i })).toBeVisible();

    const [slotsPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page
        .getByRole('button', { name: /^slots$/i })
        .first()
        .click(),
    ]);
    await slotsPage.waitForLoadState();

    await expect(slotsPage.getByRole('button', { name: /spin/i })).toBeVisible();
    await slotsPage.getByRole('button', { name: /spin/i }).click();

    await expect.poll(() => spinRequests).toBe(1);
    await expect(slotsPage.getByText('WIN')).toBeVisible();
    await expect(slotsPage.getByText('+0.20')).toBeVisible();
  });
});
