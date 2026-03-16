import { TEST_CONFIG } from '../data/test-config.js';

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Register a new user via the API (bypasses UI for faster test setup).
 */
export async function apiRegister(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${TEST_CONFIG.apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Register failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<AuthResponse>;
}

/**
 * Login via API.
 */
export async function apiLogin(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${TEST_CONFIG.apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<AuthResponse>;
}

/**
 * Register a user via API, then login through the UI to set the in-memory
 * Zustand token properly. Navigates to the target page afterwards.
 *
 * The frontend stores the JWT in Zustand memory (not localStorage),
 * so we must go through the login form to set it correctly.
 */
export async function registerAndLoginViaUI(
  email: string,
  password: string,
  navigateTo?: string,
): Promise<void> {
  // 1. Pre-register via API (fast, no UI needed)
  await apiRegister(email, password);

  // 2. Login through the UI so Zustand picks up the token
  await browser.url(TEST_CONFIG.baseUrl + '/login');

  const shell = await $('.auth-shell');
  await shell.waitForDisplayed({ timeout: TEST_CONFIG.timeouts.pageLoad });

  const emailInput = await $('#auth-email');
  await emailInput.waitForDisplayed({ timeout: TEST_CONFIG.timeouts.element });
  await emailInput.clearValue();
  await emailInput.setValue(email);

  const passwordInput = await $('#auth-password');
  await passwordInput.clearValue();
  await passwordInput.setValue(password);

  // Dismiss keyboard before clicking submit (mobile)
  try {
    await browser.execute(() => {
      (document.activeElement as HTMLElement)?.blur();
    });
  } catch { /* non-fatal */ }

  const submitBtn = await $('.auth-submit');
  await submitBtn.waitForDisplayed({ timeout: TEST_CONFIG.timeouts.element });
  await submitBtn.click();

  // 3. Wait for redirect to lobby (confirms token is set)
  //    Use waitUntil to handle the async auth + redirect cycle.
  //    Some BrowserStack devices (Galaxy S23) are slower — allow 45s.
  await browser.waitUntil(
    async () => {
      const url = await browser.getUrl();
      return url.includes('/slots');
    },
    {
      timeout: 45000,
      timeoutMsg: 'Login did not redirect to lobby within 45s',
    },
  );

  const lobbyEl = await $('.lobby-page');
  await lobbyEl.waitForDisplayed({ timeout: 20000 });

  // 4. Navigate to target if different from lobby
  if (navigateTo && navigateTo !== TEST_CONFIG.paths.lobby) {
    await browser.url(TEST_CONFIG.baseUrl + navigateTo);
  }
}

// Backward-compatible alias
export const registerAndInjectToken = registerAndLoginViaUI;
