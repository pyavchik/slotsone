import allure from '@wdio/allure-reporter';

export function addStep(name: string): void {
  allure.addStep(name);
}

export async function addScreenshot(name: string): Promise<void> {
  try {
    const screenshot = await browser.takeScreenshot();
    allure.addAttachment(name, Buffer.from(screenshot, 'base64'), 'image/png');
  } catch {
    // Screenshot capture may fail in some contexts — non-fatal
  }
}

export function addFeature(feature: string): void {
  allure.addFeature(feature);
}

export function addSeverity(severity: 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial'): void {
  allure.addSeverity(severity);
}

export function addStory(story: string): void {
  allure.addStory(story);
}

export function addTag(tag: string): void {
  allure.addLabel('tag', tag);
}

export function addSuite(suite: string): void {
  allure.addLabel('suite', suite);
}

export function addTestType(type: 'smoke' | 'regression' | 'sanity' | 'e2e' | 'functional'): void {
  allure.addLabel('testType', type);
}
