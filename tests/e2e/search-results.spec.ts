import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { wireUser, wireGame } from '../http-fixtures';

let server: Server;
const calls: URLSearchParams[] = [];
const skipped = { status: 'notRequested', items: [], page: null, pageSize: null, hasNextPage: null, error: null, metadata: null };
test.beforeAll(async () => {
  server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1:5091');
    let body: unknown = [];
    if (url.pathname === '/api/v1/search') {
      calls.push(url.searchParams);
      const q = url.searchParams.get('q'); const scope = url.searchParams.get('scope');
      const page = Number(url.searchParams.get('page') ?? 1); const pageSize = url.searchParams.get('mode') === 'results' ? 20 : 5;
      const ready = (items: unknown[]) => ({ status: 'ready', items, page, pageSize, hasNextPage: page < 2, error: null, metadata: null });
      body = { query: q, people: scope === 'games' ? skipped : ready(Array.from({ length: pageSize }, (_, index) => ({ id: 7 + index, username: `mario${index + 1}`, displayName: `Mario ${index + 1}`, avatarUrl: null }))),
        games: scope === 'people' ? skipped : q === 'falha' && scope === 'all' ? { ...skipped, status: 'unavailable', error: { code: 'integration_timeout', message: 'Falha sintética' } }
          : { ...ready(Array.from({ length: pageSize }, (_, index) => ({ id: 12 + index, title: `Jogo ${index + 1}`, summary: 'Uma aventura de teste.', coverUrl: null, releaseDate: null }))), metadata: { fetchedAt: '2026-10-15T12:00:00Z', isStale: true } }, error: null };
    } else if (url.pathname === '/api/v1/users/7') body = { ...wireUser, id: 7, username: 'mario1', displayName: 'Mario 1' };
    else if (url.pathname === '/api/v1/games/12') body = wireGame;
    else if (url.pathname.endsWith('/opinions')) body = { averageRating: null, reviews: [] };
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175');
    response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(body));
  });
  server.listen(5091, '127.0.0.1'); await once(server, 'listening');
});
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) await page.screenshot({ path: 'test-results/search-results-failure.png' });
});

for (const mobile of [false, true]) {
  test(`menu → resultados → perfil/jogo, histórico e retry parcial ${mobile ? 'mobile' : 'desktop'}`, async ({ page }) => {
    await page.setViewportSize(mobile ? { width: 375, height: 812 } : { width: 1280, height: 900 });
    await page.goto('/login');
    const before = calls.length;
    const input = page.getByRole('combobox', { name: 'Buscar pessoas e jogos' });
    await input.fill('mario & luigi'); await input.press('Enter');
    await expect(page.getByRole('heading', { name: 'Pesquisa', exact: true })).toBeVisible();
    await expect(page.getByRole('tabpanel').getByRole('link')).toHaveCount(20);
    expect(calls).toHaveLength(before + 1);
    expect(Object.fromEntries(calls.at(-1)!)).toEqual({ q: 'mario & luigi', mode: 'results', scope: 'all', page: '1' });
    await expect(page).toHaveURL(/q=mario\+%26\+luigi&aba=pessoas&page=1$/);
    await page.getByRole('tab', { name: 'Jogos', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Jogo 1', exact: true })).toBeVisible();
    expect(calls).toHaveLength(before + 1);
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    await expect(page.getByText('Página 2', { exact: true })).toBeVisible();
    expect(Object.fromEntries(calls.at(-1)!)).toEqual({ q: 'mario & luigi', mode: 'results', scope: 'games', page: '2' });
    await expect(page.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled();
    await page.getByRole('tab', { name: 'Pessoas', exact: true }).click();
    await expect(page).toHaveURL(/aba=pessoas&page=1$/);
    await page.goBack(); await expect(page).toHaveURL(/aba=jogos&page=2$/);
    await expect(page.getByText('Página 2', { exact: true })).toBeVisible();
    expect(calls).toHaveLength(before + 2);
    await page.goForward(); await expect(page).toHaveURL(/aba=pessoas&page=1$/);
    await page.reload(); await expect(page.getByRole('tabpanel').getByRole('link')).toHaveCount(20);
    await page.getByRole('tab', { name: 'Pessoas', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Jogos', exact: true })).toBeFocused();
    await expect(page.getByRole('tab', { name: 'Jogos', exact: true })).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await mkdir('docs/evidence', { recursive: true });
    await page.screenshot({ path: `docs/evidence/S-PR-28-results-${mobile ? 'mobile' : 'desktop'}.png` });
    await page.getByRole('link', { name: 'Jogo 1', exact: true }).click();
    await expect(page).toHaveURL(/\/jogos\/12$/);
    await page.goBack();
    await page.getByRole('tab', { name: 'Pessoas', exact: true }).click();
    await page.getByRole('link', { name: 'Mario 1 @mario1', exact: true }).click();
    await expect(page).toHaveURL(/\/perfil\/7$/);
    const next = page.getByRole('combobox', { name: 'Buscar pessoas e jogos' });
    await next.fill('falha'); await next.press('Enter');
    await expect(page).toHaveURL(/q=falha&aba=pessoas&page=1$/);
    await expect(page.getByRole('tabpanel').getByRole('link')).toHaveCount(20);
    await page.getByRole('tab', { name: 'Jogos', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Não foi possível carregar Jogos.');
    const beforeRetry = calls.length;
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await expect(page.getByRole('tabpanel').getByRole('link')).toHaveCount(20);
    expect(calls).toHaveLength(beforeRetry + 1);
    expect(calls.at(-1)?.get('scope')).toBe('games');
    await page.getByRole('tab', { name: 'Pessoas', exact: true }).click();
    await expect(page.getByRole('tabpanel').getByRole('link')).toHaveCount(20);
    expect(calls).toHaveLength(beforeRetry + 1);
  });
}
