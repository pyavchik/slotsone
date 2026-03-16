export function uniqueEmail(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `appium_${ts}_${rand}@test.slotsone.dev`;
}

export const DEFAULT_PASSWORD = 'Test1234!';

export function testUser() {
  return {
    email: process.env.TEST_EMAIL || uniqueEmail(),
    password: process.env.TEST_PASSWORD || DEFAULT_PASSWORD,
  };
}
