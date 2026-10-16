import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { wireUser, wireGame } from '../http-fixtures';

let server: Server;
const calls: URLSearchParams[] = [];
const person = { id: 7, username: 'mario', displayName: 'Mario', avatarUrl: null };
const game = { id: 12, title: 'Mario World', coverUrl: null, summary: '', releaseDate: null };
const ready = (items: unknown[]) => ({ status: 'ready', items, page: 1, pageSize: 5, hasNextPage: false, error: null, metadata: null });
const skipped = { status: 'notRequested', items: [], page: null, pageSize: null, hasNextPage: null, error: null, metadata: null };
test.beforeAll(async () => {
  server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1:5091');
    let body: unknown = [];
    if (url.pathname === '/api/v1/search') {
      calls.push(url.searchParams);
      const scope = url.searchParams.get('scope');
      body = { query: url.searchParams.get('q'), people: scope === 'games' ? skipped : ready([person]), games: url.searchParams.get('q') === 'falha' && scope === 'all' ? { ...skipped, status: 'unavailable', error: { code: 'integration_timeout', message: 'Indisponível' } } : ready([game]), error: null };
    } else if (url.pathname === '/api/v1/users/7') body = { ...wireUser, ...person, bio: '' };
    else if (url.pathname === '/api/v1/games/12') body = wireGame;
    else if (url.pathname.endsWith('/opinions')) body = { averageRating: null, reviews: [] };
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175');
    response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(body));
  });
  server.listen(5091, '127.0.0.1'); await once(server, 'listening');
});
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

for (const mobile of [false, true]) {
  test(`menu público: teclado, destinos, retry parcial e responsividade ${mobile ? 'mobile' : 'desktop'}`, async ({ page }) => {
    await page.setViewportSize(mobile ? { width: 375, height: 812 } : { width: 1280, height: 900 });
    await page.goto('/login');
    let input = page.getByRole('combobox', { name: 'Buscar pessoas e jogos' });
    const start = calls.length;
    await input.fill('mario');
    await expect(page.getByRole('option')).toHaveCount(2);
    expect(calls).toHaveLength(start + 1);
    await expect(input).not.toHaveAttribute('aria-activedescendant');
    await input.press('ArrowDown'); await input.press('ArrowUp');
    await expect(page.getByRole('option', { name: /Mario World/ })).toHaveAttribute('aria-selected', 'true');
    await input.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(input).toBeFocused();
    await input.blur(); await input.focus();
    await expect(page.getByRole('option')).toHaveCount(2);
    await input.press('Tab');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(input).not.toBeFocused();
    await input.focus();
    await expect(page.getByRole('option')).toHaveCount(2);
    // No mobile o dropdown cobre o título; clicar na margem fora do painel.
    await page.mouse.click(4, page.viewportSize()!.height - 8);
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await input.focus();
    await expect(page.getByRole('option')).toHaveCount(2);
    await page.getByRole('option', { name: /Mario @mario/ }).click();
    await expect(page).toHaveURL(/\/perfil\/7$/);
    input = page.getByRole('combobox', { name: 'Buscar pessoas e jogos' });
    await input.fill('mario'); await expect(page.getByRole('option')).toHaveCount(2);
    await input.press('ArrowDown'); await input.press('ArrowDown'); await input.press('Enter');
    await expect(page).toHaveURL(/\/jogos\/12$/);
    input = page.getByRole('combobox', { name: 'Buscar pessoas e jogos' });
    await input.fill('falha');
    await expect(page.getByRole('option', { name: /Mario @mario/ })).toBeVisible();
    const beforeRetry = calls.length;
    await page.getByRole('button', { name: 'Tentar novamente Jogos' }).click();
    await expect(page.getByRole('option')).toHaveCount(2);
    expect(calls).toHaveLength(beforeRetry + 1);
    expect(calls.at(-1)?.get('scope')).toBe('games');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const panel = await page.locator('.menu-search-panel').boundingBox();
    expect(panel!.x).toBeGreaterThanOrEqual(0);
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await mkdir('docs/evidence', { recursive: true });
    await page.screenshot({ path: `docs/evidence/S-PR-27-menu-${mobile ? 'mobile' : 'desktop'}.png` });
  });
}
