import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { wireGame, wireReview, wireComment } from '../http-fixtures';

for (const [device, width] of [['desktop', 1280], ['mobile', 390]] as const) {
  test(`${device}: contexto primeiro, nota do autor e comentário preservado durante resumo`, async ({ page }) => {
    const title = 'Uma aventura inesquecível através de mundos distantes e desconhecidos';
    const summary = 'Explore um mundo cheio de histórias, personagens e desafios. '.repeat(6).trim();
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    let gameReads = 0;
    await page.route('**/cover.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240"><rect width="160" height="240" fill="#275d54"/><circle cx="80" cy="100" r="48" fill="#80d8b2"/></svg>' }));
    await page.route('http://127.0.0.1:5095/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = [];
      if (path.endsWith('/reviews/55')) body = { ...wireReview, title: 'Minha experiência', rating: 4.25, game: { ...wireReview.game, title, coverUrl: device === 'desktop' ? '/cover.svg' : null } };
      else if (path.endsWith('/games/12')) { gameReads++; await gate; body = { ...wireGame, title, summary, averageRating: 1 }; }
      else if (path.endsWith('/comments')) body = [wireComment];
      else if (path.endsWith('/opinions')) body = { averageRating: 1, reviews: [] };
      await route.fulfill({ json: body, headers: { 'Access-Control-Expose-Headers': 'X-Catalog-Stale,X-Catalog-Fetched-At', 'X-Catalog-Stale': 'true', 'X-Catalog-Fetched-At': wireReview.createdAt } });
    });
    await page.setViewportSize({ width, height: 950 }); await page.goto('/reviews/55#comentario-81');
    const context = page.getByRole('region', { name: 'Contexto do jogo', exact: true });
    await expect(context.getByText('Carregando resumo…', { exact: true })).toBeVisible(); await expect(context.getByText('Nota desta review: 4.25 de 5', { exact: true })).toBeVisible();
    const comment = page.locator('#comentario-81'); await expect(comment).toBeFocused(); release();
    await expect(context.getByText(summary, { exact: true })).toBeVisible(); await expect(comment).toBeFocused(); expect(gameReads).toBe(1);
    await expect(page.getByText(/ID da review/)).toHaveCount(0); await expect(page.getByText('Nota: 4.25 de 5', { exact: true })).toHaveCount(0); await expect(page.getByText(/Nota.*1 de 5/)).toHaveCount(0);
    const geometry = await context.evaluate(element => {
      const heading = element.querySelector('h2')!.getBoundingClientRect(), cover = element.querySelector('[role="img"],img')!.getBoundingClientRect(), bounds = element.getBoundingClientRect();
      const notice = document.querySelector('.catalog-notice')!.getBoundingClientRect();
      return { heading, cover, bounds, notice, first: element.parentElement!.firstElementChild === element, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(geometry.first).toBe(true); expect(geometry.cover.right).toBeLessThan(geometry.heading.left); expect(geometry.heading.right).toBeLessThanOrEqual(geometry.bounds.right); expect(geometry.notice.top).toBeGreaterThanOrEqual(geometry.bounds.bottom); expect(geometry.overflow).toBe(false);
    expect(Math.abs(geometry.cover.width / geometry.cover.height - 2 / 3)).toBeLessThan(.02);
    await mkdir('docs/evidence', { recursive: true }); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `docs/evidence/S-PR-40-${device}.png`, fullPage: true });
    const link = context.getByRole('link', { name: title, exact: true }); await link.focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(/\/jogos\/12$/); await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  });
}
