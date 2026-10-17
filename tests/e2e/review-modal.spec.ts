import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { wireGame, wirePage, wireReview, wireUser } from '../http-fixtures';

for (const [device, width] of [['desktop', 1280], ['mobile', 390]] as const) {
  test(`${device}: cabeçalho, largura completa e modal de estrelas`, async ({ page }) => {
    const game = { ...wireGame, title: 'Uma longa aventura através dos mundos e das estrelas', summary: 'Um resumo que ocupa a área textual completa ao lado da capa.' };
    let review: typeof wireReview | null = null;
    let fail = true;
    const writes: { rating: number; title: string | null; text: string }[] = [];
    await page.route('http://127.0.0.1:5092/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      let body: unknown = [];
      if (path.endsWith('/auth/login')) body = { user: wireUser, token: 'test-only', expiresAt: '2080-01-01T00:00:00Z' };
      else if (path.endsWith('/auth/me')) body = wireUser;
      else if (path.endsWith('/games/filters')) body = { genres: [], platforms: [] };
      else if (path.endsWith('/games')) body = wirePage([game]);
      else if (path.endsWith('/games/12')) body = { ...game, averageRating: review?.rating ?? null };
      else if (path.endsWith('/reviews/me')) body = { review };
      else if (path.endsWith('/opinions')) body = { averageRating: review?.rating ?? null, reviews: review ? [review] : [] };
      else if (path.endsWith('/favorites')) body = { games: [], reviews: [] };
      else if (path.endsWith('/like/me')) body = { likedByMe: false };
      else if (path.endsWith('/games/12/reviews') || request.method() === 'PATCH') {
        const input = request.postDataJSON() as typeof writes[number]; writes.push(input);
        if (fail) { fail = false; await route.fulfill({ status: 503, json: { code: 'storage_unavailable', message: 'Falha' } }); return; }
        review = { ...wireReview, ...input, game: { ...wireReview.game, title: game.title } }; body = review;
      }
      await route.fulfill({ json: body, headers: path.endsWith('/games/12') ? { 'Access-Control-Expose-Headers': 'X-Catalog-Stale,X-Catalog-Fetched-At', 'X-Catalog-Stale': 'true', 'X-Catalog-Fetched-At': '2026-10-16T12:00:00Z' } : {} });
    });
    await page.setViewportSize({ width, height: 950 }); await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill('modal@example.test'); await page.getByLabel('Senha', { exact: true }).fill('test-only'); await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('link', { name: game.title, exact: true }).click(); await expect(page.getByRole('heading', { name: 'Detalhes do jogo', exact: true })).toBeVisible();
    const create = page.getByRole('button', { name: 'Criar review', exact: true }); await expect(create).toBeVisible();
    const geometry = await page.locator('.game-overview').evaluate(overview => {
      const heading = overview.querySelector('h2')!.getBoundingClientRect(), star = overview.querySelector('.game-favorite-star')!.getBoundingClientRect(), action = [...document.querySelectorAll('button')].find(button => button.textContent === 'Criar review')!.getBoundingClientRect();
      const text = overview.getBoundingClientRect(), divider = overview.querySelector('dl')!.getBoundingClientRect(), grid = overview.closest('.game-information')!.getBoundingClientRect();
      return { heading, star, action, text, divider, grid, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(Math.abs(geometry.text.right - geometry.grid.right)).toBeLessThan(2);
    expect(Math.abs(geometry.divider.left - geometry.text.left)).toBeLessThan(2); expect(Math.abs(geometry.divider.right - geometry.text.right)).toBeLessThan(2);
    if (width > 560) expect(geometry.heading.right).toBeLessThanOrEqual(geometry.star.left);
    else expect(geometry.heading.bottom).toBeLessThanOrEqual(geometry.star.top);
    expect(geometry.star.right).toBeLessThanOrEqual(geometry.action.left);
    expect(Math.abs(geometry.star.top + geometry.star.height / 2 - geometry.action.top - geometry.action.height / 2)).toBeLessThan(2);
    expect(geometry.overflow).toBe(false); expect(await page.locator('.catalog-notice').evaluate(notice => notice.closest('.game-information') === null)).toBe(true);
    await mkdir('docs/evidence', { recursive: true }); await page.screenshot({ path: `docs/evidence/S-PR-38-${device}-game.png`, fullPage: true });
    await create.click(); const dialog = page.getByRole('dialog', { name: 'Criar review', exact: true }); await expect(dialog).toBeVisible();
    const close = dialog.getByRole('button', { name: 'Fechar review', exact: true }); await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused(); await page.keyboard.press('Tab'); await expect(close).toBeFocused();
    await expect(page.locator('#root')).toHaveAttribute('inert', ''); await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(create).toBeFocused(); await create.click();
    await expect(dialog.getByRole('spinbutton')).toHaveCount(0); await expect(dialog.locator('input:checked')).toHaveCount(0);
    await dialog.getByRole('radio', { name: '0 estrelas', exact: true }).focus(); await page.keyboard.press('ArrowRight'); await expect(dialog.getByRole('radio', { name: '1 estrela', exact: true })).toBeChecked();
    await dialog.getByRole('radio', { name: '0 estrelas', exact: true }).check(); await dialog.getByLabel('Título', { exact: true }).fill('Uma nova jornada');
    await dialog.getByLabel('Descrição (opcional)', { exact: true }).fill('Minha experiência com este jogo.');
    const submit = dialog.getByRole('button', { name: 'Publicar review', exact: true }), cancel = dialog.getByRole('button', { name: 'Cancelar', exact: true });
    const a = (await submit.boundingBox())!, b = (await cancel.boundingBox())!; expect(Math.abs(a.y - b.y)).toBeLessThan(2); expect(Math.abs(a.height - b.height)).toBeLessThan(2); expect(a.x + a.width).toBeLessThan(b.x);
    const modal = (await dialog.boundingBox())!; expect(modal.x).toBeGreaterThanOrEqual(0); expect(modal.x + modal.width).toBeLessThanOrEqual(width);
    await dialog.screenshot({ path: `docs/evidence/S-PR-38-${device}-modal.png` });
    await submit.click(); await expect(dialog.getByRole('alert')).toContainText('Não foi possível publicar'); await expect(dialog.getByLabel('Título', { exact: true })).toHaveValue('Uma nova jornada');
    await submit.click(); await expect(dialog).toHaveCount(0); await expect(page.getByText('Review publicada.', { exact: true })).toBeVisible();
    expect(writes).toEqual([{ rating: 0, title: 'Uma nova jornada', text: 'Minha experiência com este jogo.' }, { rating: 0, title: 'Uma nova jornada', text: 'Minha experiência com este jogo.' }]);
    const edit = page.getByRole('button', { name: 'Editar minha review', exact: true }); await expect(edit).toBeFocused(); await edit.click();
    const editor = page.getByRole('dialog', { name: 'Editar minha review', exact: true }); await expect(editor.getByRole('radio', { name: '0 estrelas', exact: true })).toBeChecked(); await expect(editor.getByLabel('Título', { exact: true })).toHaveValue('Uma nova jornada'); await editor.getByRole('button', { name: 'Cancelar', exact: true }).click(); expect(writes).toHaveLength(2);
  });
}
