import { expect, test } from '@playwright/test';

// Poster images come from IMDb's CDN; the app works without them.
test.beforeEach(({ page }) => page.route('https://m.media-amazon.com/**', (r) => r.abort()));

test('lists titles and opens one', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.cell').first()).toBeVisible();
  await page.locator('.frame').first().click();
  const detail = page.getByRole('dialog');
  await expect(detail).toBeVisible();
  await expect(detail.getByRole('link', { name: /IMDb/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(detail).toBeHidden();
});

test('Close leaves the title even after opening similar ones; Back steps one at a time', async ({ page }) => {
  await page.goto('/');
  await page.locator('.frame').first().click();
  const detail = page.getByRole('dialog');
  const first = await detail.locator('h2').innerText();
  await detail.getByRole('region', { name: 'More like this' }).getByRole('button').first().click();
  await expect(detail.locator('h2')).not.toHaveText(first);
  await page.goBack();
  await expect(detail.locator('h2')).toHaveText(first);
  await detail.getByRole('region', { name: 'More like this' }).getByRole('button').first().click();
  await detail.getByRole('button', { name: 'Close' }).click();
  await expect(detail).toBeHidden();
});

test('search forgives a typo and shares through the URL', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Search' }).fill('breking bad');
  await expect(page.locator('.cell')).toHaveCount(1);
  await expect(page.locator('.tt')).toHaveText('Breaking Bad');
  await expect.poll(() => page.url()).toContain('q=breking+bad');
});

test('language filter narrows the list and clears', async ({ page }) => {
  await page.goto('/');
  const total = page.locator('.total');
  await expect(total).toHaveText(/^\d{3,} titles$/);
  const all = (await total.textContent())!;
  await page.getByRole('button', { name: /^Language/ }).click();
  await page.getByRole('option', { name: /^Japanese \d/ }).click();
  await expect(total).not.toHaveText(all!);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(total).toHaveText(all!);
});

test('marks survive a reload', async ({ page }) => {
  await page.goto('/');
  await page.locator('.frame').first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Watchlist' }).click();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByRole('button', { name: /^Watchlist 1/ })).toBeVisible();
});

test('default settings are remembered and start a fresh visit', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /settings/i }).click();
  await page.locator('.settings .chips').getByRole('button', { name: 'Series', exact: true }).click();
  await page.reload();
  await expect(page.locator('.total')).not.toHaveText(/^\d{4,} titles$/);
  await page.getByRole('button', { name: /settings/i }).click();
  await expect(page.locator('.settings .chips').getByRole('button', { name: 'Series', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('pages of 500, and search reaches titles on every page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.cell')).toHaveCount(500);
  const pages = page.getByRole('navigation', { name: 'Pages' });
  await pages.getByRole('button', { name: 'Next' }).click();
  await expect(pages).toContainText('501–');
  const far = await page.locator('.tt').first().innerText();
  await page.getByRole('searchbox', { name: 'Search' }).fill(far);
  await expect(page.locator('.tt', { hasText: far }).first()).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Pages' })).toBeHidden();
});

test('clicking cast, keyword, or country in detail view filters titles and closes modal', async ({ page }) => {
  await page.goto('/');
  await page.locator('.frame').first().click();
  const detail = page.getByRole('dialog');
  await expect(detail).toBeVisible();

  const castBtn = detail.locator('.role button').first();
  const castName = (await castBtn.textContent())!.trim();
  await castBtn.click();

  await expect(detail).toBeHidden();
  await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue(castName);
  await expect(page.locator('.cell').first()).toBeVisible();
});
