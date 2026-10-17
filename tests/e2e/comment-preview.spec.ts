import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { wireComment, wireReview } from '../http-fixtures';

for (const [device, width] of [['desktop', 1280], ['mobile', 390]] as const) {
  test(`${device}: comentários inline e Ver mais navega por teclado ao comentário oculto`, async ({ page }) => {
    const comments = [81, 82, 83, 84].map((id, index) => ({ ...wireComment, id, text: `Comentário ${index + 1}: uma opinião sobre esta experiência.` }));
    await page.route('http://127.0.0.1:5090/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const body = path.endsWith('/most-commented') ? [{ review: wireReview, commentCount: 4, lastCommentAt: wireReview.createdAt }]
        : path.endsWith('/recent') ? [wireReview] : path.endsWith('/comments') ? comments : path.endsWith('/reviews/55') ? wireReview : [];
      await route.fulfill({ json: body, headers: { 'Access-Control-Expose-Headers': 'X-Catalog-Stale,X-Catalog-Fetched-At', 'X-Catalog-Stale': 'true', 'X-Catalog-Fetched-At': wireReview.createdAt } });
    });
    await page.setViewportSize({ width, height: 950 }); await page.goto('/comunidade');
    await page.getByRole('button', { name: 'Mais comentadas', exact: true }).click();
    const preview = page.getByRole('region', { name: 'Prévia dos comentários', exact: true });
    await expect(preview.getByText(comments[0].text, { exact: true })).toBeVisible(); await expect(preview.getByRole('listitem')).toHaveCount(2);
    await expect(page.getByText(comments[2].text, { exact: true })).toHaveCount(0); await expect(page.getByRole('complementary', { name: 'Atualização do catálogo' })).toHaveCount(0);
    const card = page.getByRole('article'); const c = (await card.boundingBox())!, p = (await preview.boundingBox())!;
    expect(p.x).toBeGreaterThanOrEqual(c.x); expect(p.x + p.width).toBeLessThanOrEqual(c.x + c.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await mkdir('docs/evidence', { recursive: true }); await card.screenshot({ path: `docs/evidence/community-comment-preview-${device}.png` });
    const more = preview.getByRole('link', { name: 'Ver mais', exact: true }); await more.focus(); await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/reviews\/55#comentario-83$/); await expect(page.locator('#comentario-83')).toBeFocused(); await expect(page.locator('#comentario-83')).toContainText(comments[2].text);
  });
}
