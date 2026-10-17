import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { wireGame, wirePage, wireUser } from '../http-fixtures';

for (const [name, width] of [['desktop', 1280], ['mobile', 390]] as const) {
  test(`${name}: estrela à direita da primeira linha, teclado e navegação independente`, async ({ page }) => {
    const game = { ...wireGame, title: 'Uma aventura extraordinária com um nome muito longo e inesquecível ' + 'x'.repeat(65) };
    let selected = true;
    const commands: string[] = [];
    let perTargetReads = 0;
    await page.route('http://127.0.0.1:5093/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      let body: unknown = [];
      if (path.endsWith('/auth/login')) body = { user: wireUser, token: 'test-only', expiresAt: '2080-01-01T00:00:00Z' };
      else if (path.endsWith('/auth/me') || path.endsWith('/users/1')) body = wireUser;
      else if (path.endsWith('/favorites')) body = { games: selected ? [game] : [], reviews: [] };
      else if (path.endsWith('/favorites/game/12')) {
        if (request.method() === 'GET') perTargetReads++;
        else { commands.push(request.method()); selected = request.method() === 'PUT'; }
        if (!selected) { await route.fulfill({ status: 204 }); return; }
        body = { id: 90, userId: 1, targetType: 'game', targetId: 12 };
      }
      else if (path.endsWith('/games/filters')) body = { genres: [], platforms: [] };
      else if (path.endsWith('/games')) body = wirePage([game]);
      else if (path.endsWith('/games/12')) body = game;
      else if (path.endsWith('/reviews/me')) body = { review: null };
      else if (path.endsWith('/opinions')) body = { averageRating: null, reviews: [] };
      else if (path.endsWith('/in-discussion')) body = [{ game, commentCount: 1, lastCommentAt: '2026-10-13T12:30:00Z' }];
      await route.fulfill({ json: body });
    });
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill('favorite@example.test');
    await page.getByLabel('Senha', { exact: true }).fill('test-only');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByLabel('Usuário conectado')).toHaveText('Ana');
    for (const context of ['catalogo', 'detalhe', 'perfil', 'discussao'] as const) {
      if (context === 'detalhe') { await page.getByRole('link', { name: game.title, exact: true }).click(); await expect(page.getByRole('heading', { name: 'Detalhes do jogo', exact: true })).toBeVisible(); }
      if (context === 'perfil') { await page.getByRole('link', { name: 'Meu perfil', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Perfil público', exact: true })).toBeVisible(); }
      if (context === 'discussao') { await page.getByRole('link', { name: 'Comunidade', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Comunidade', exact: true })).toBeVisible(); }
      if (context === 'discussao') await page.getByRole('button', { name: 'Jogos em discussão', exact: true }).click();
      const star = page.getByRole('button', { name: `Remover jogo ${game.title} dos favoritos`, exact: true });
      await expect(star).toHaveAttribute('aria-pressed', 'true');
      const geometry = await star.evaluate(button => {
        const row = button.parentElement!, heading = row.querySelector('h2,h3')!;
        const text = heading.querySelector('a')?.firstChild ?? heading.firstChild!;
        const range = document.createRange(); range.setStart(text, 0); range.setEnd(text, 1);
        const first = range.getBoundingClientRect(), action = button.getBoundingClientRect(), container = row.getBoundingClientRect();
        const style = getComputedStyle(row);
        return { rightGap: container.right - parseFloat(style.paddingRight) - action.right, firstCenter: first.top + first.height / 2, starCenter: action.top + action.height / 2, headingRight: heading.getBoundingClientRect().right, starLeft: action.left, width: action.width, height: action.height, position: getComputedStyle(button).position, overflow: document.documentElement.scrollWidth > window.innerWidth };
      });
      expect(Math.abs(geometry.rightGap)).toBeLessThan(2);
      expect(Math.abs(geometry.firstCenter - geometry.starCenter)).toBeLessThan(12);
      expect(geometry.headingRight).toBeLessThan(geometry.starLeft);
      expect(geometry.width).toBeGreaterThanOrEqual(44); expect(geometry.height).toBeGreaterThanOrEqual(44);
      expect(['fixed', 'absolute']).not.toContain(geometry.position); expect(geometry.overflow).toBe(false);
      await mkdir('docs/evidence', { recursive: true });
      await page.screenshot({ path: `docs/evidence/S-PR-24-${name}-${context}.png`, fullPage: true });
    }
    const star = page.getByRole('button', { name: `Remover jogo ${game.title} dos favoritos`, exact: true });
    await star.focus(); await expect(star).toBeFocused(); await page.keyboard.press('Enter');
    const empty = page.getByRole('button', { name: `Favoritar jogo ${game.title}`, exact: true }); await expect(empty).toHaveAttribute('aria-pressed', 'false');
    await expect(page).toHaveURL(/\/comunidade$/); await empty.focus(); await page.keyboard.press('Space');
    await expect(star).toHaveAttribute('aria-pressed', 'true'); expect(commands).toEqual(['DELETE', 'PUT']); expect(perTargetReads).toBe(0);
    await page.getByRole('link', { name: game.title, exact: true }).click(); await expect(page).toHaveURL(/\/jogos\/12$/);
    await expect(star).toHaveAttribute('aria-pressed', 'true');
  });
}
