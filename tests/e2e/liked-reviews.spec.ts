import { test, expect } from '@playwright/test';
import { wireReview } from '../http-fixtures';

for (const width of [1280, 390]) {
  test(`reviews mais curtidas públicas em ${width}px`, async ({ page }) => {
    const paths: string[] = [];
    await page.route('http://127.0.0.1:5096/**', async route => {
      const url = new URL(route.request().url()); paths.push(url.pathname);
      if (url.pathname.endsWith('/reviews/most-liked')) {
        await route.fulfill({ json: { items: [{ review: { ...wireReview, title: 'Review popular', likeCount: 2 }, periodLikeCount: 2, lastLikeAt: '2026-10-17T12:00:00Z' }], page: Number(url.searchParams.get('page')), pageSize: Number(url.searchParams.get('pageSize')), hasNextPage: false } });
      } else await route.fulfill({ json: [] });
    });
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/comunidade');
    await page.getByRole('button', { name: 'Mais curtidas', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Reviews mais curtidas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Review popular' })).toBeVisible();
    await expect(page.getByText('2 curtidas no período', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Jogo HTTP', exact: true })).toHaveAttribute('href', '/jogos/12');
    expect(paths.some(path => path.endsWith('/comments/most-liked'))).toBe(false);
    await page.getByLabel('Período dos rankings').selectOption('24h');
    await expect(page.getByText('Review popular')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
