import { expect, test, type Page } from '@playwright/test';

async function openSample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Open sample decision/i }).click();
  await expect(page.getByRole('heading', { name: /How should we deploy generative AI-assisted inspection/i })).toBeVisible();
}

test.describe('production decision workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('runs, versions, challenges, records and restores a decision', async ({ page }) => {
    await openSample(page);
    await expect(page).toHaveURL(/\/decisions\/.+\/versions\/.+/);
    await page.getByRole('button', { name: /Run scenario/i }).click();
    await expect(page.getByText(/MODEL-RULE LEADER/i)).toBeVisible();

    await page.getByRole('button', { name: /Freeze new version/i }).click();
    await expect(page).toHaveURL(/\/versions\/.+/);
    await expect(page.getByText('V2')).toBeVisible();

    await page.getByRole('button', { name: /Challenge/i }).click();
    await expect(page.getByRole('heading', { name: /Challenge the model/i })).toBeVisible();
    await expect(page.getByText(/FALSIFICATION TEST/i)).toBeVisible();
    await page.getByRole('button', { name: /Close skeptic/i }).click();

    await page.getByRole('button', { name: /Record decision/i }).click();
    await page.getByPlaceholder(/Why is this the right decision/i).fill('Proceed with the staged option while preserving the integration guardrail.');
    await page.getByRole('dialog', { name: /Record the commitment/i }).getByRole('button', { name: /^Record decision$/i }).click();

    const url = page.url();
    await page.reload();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole('heading', { name: /How should we deploy generative AI-assisted inspection/i })).toBeVisible();
  });

  test('exports markdown and exposes a read-only share', async ({ page }) => {
    await openSample(page);
    await page.getByRole('button', { name: /^Export/i }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Memo · Markdown/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('manufacturing-ai-deployment-memo.md');

    await page.getByRole('button', { name: /Create read-only share/i }).click();
    await expect(page.getByText(/Read-only link copied|http:\/\/127\.0\.0\.1:3102\/share\//i)).toBeVisible();
    const token = await page.evaluate(() => {
      const entries = JSON.parse(localStorage.getItem('scenario-prism:shares:v2') || '[]') as Array<{ token: string }>;
      return entries[0]?.token;
    });
    expect(token).toBeTruthy();
    await page.goto(`/share/${token}`);
    await expect(page.getByText('READ-ONLY SHARE')).toBeVisible();
    await expect(page.getByRole('button', { name: /Run scenario/i })).toHaveCount(0);
  });

  test('keeps a visible 2D path when WebGL is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function patched(type: string, ...args: unknown[]) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
        return original.call(this, type as never, ...(args as never[]));
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await openSample(page);
    await expect(page.getByLabel(/WebGL unavailable; 2D fallback active/i)).toBeVisible();
  });

  test('supports keyboard navigation and reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openSample(page);
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedTag).toBe('BUTTON');
  });
});

test.describe('visual regression', () => {
  test('desktop prism remains identifiable', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'desktop baseline only');
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await openSample(page);
    await expect(page.locator('.decision-stage')).toHaveScreenshot('decision-stage-desktop.png', { animations: 'disabled' });
  });

  test('mobile layout avoids skeptic/title overlap', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile', 'mobile baseline only');
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await openSample(page);
    await page.getByRole('button', { name: /Challenge/i }).click();
    const sheet = page.locator('.skeptic-sheet');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    expect(box?.x).toBe(0);
    expect(box?.y).toBe(0);
    expect(Math.round(box?.width ?? 0)).toBe(390);
    await expect(sheet).toHaveScreenshot('skeptic-mobile.png', { animations: 'disabled' });
  });
});
