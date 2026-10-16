import { test, expect } from '@playwright/test';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { wireGame } from '../http-fixtures';

let server: Server;
let failOptions = true;
let hold = false;
const queries: URLSearchParams[] = [];
const pending: { response: ServerResponse; query: URLSearchParams }[] = [];
let optionCalls = 0;
function respond(response: ServerResponse, query: URLSearchParams) {
  const page = Number(query.get('page') ?? 1); const pageSize = Number(query.get('pageSize') ?? 20);
  response.end(JSON.stringify({ items: Array.from({ length: pageSize }, (_, index) => ({ ...wireGame, id: index + 1, title: `Resultado ${index + 1}` })), page, pageSize, hasNextPage: page < 2 }));
}
function release() { hold = false; for (const item of pending.splice(0)) respond(item.response, item.query); }
test.beforeAll(async () => {
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175');
    response.setHeader('Content-Type', 'application/json');
    const url = new URL(request.url ?? '/', 'http://127.0.0.1:5091');
    if (url.pathname === '/api/v1/games/filters') {
      optionCalls++;
      response.statusCode = failOptions ? 503 : 200;
      response.end(JSON.stringify(failOptions ? { code: 'integration_timeout', message: 'Falha sintética' } : { genres: [{ id: 31, name: 'Aventura da API' }], platforms: [{ id: 42, name: 'Plataforma da API' }] }));
    } else if (url.pathname === '/api/v1/games') {
      queries.push(url.searchParams);
      if (hold) pending.push({ response, query: url.searchParams }); else respond(response, url.searchParams);
    } else { response.statusCode = 404; response.end(); }
  });
  server.listen(5091, '127.0.0.1'); await once(server, 'listening');
});
test.afterEach(() => release());
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

for (const mobile of [false, true]) {
  test(`filtros HTTP, rascunho, últimos lançados e reset com tamanho preservado ${mobile ? 'mobile' : 'desktop'}`, async ({ page }) => {
    failOptions = true;
    await page.setViewportSize(mobile ? { width: 375, height: 812 } : { width: 1280, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('article')).toHaveCount(20);
    await expect(page.getByText('Não foi possível carregar as opções de filtro.')).toBeVisible();
    const count = queries.length; const beforeOptions = optionCalls;
    failOptions = false;
    await page.getByRole('button', { name: 'Tentar novamente opções', exact: true }).click();
    await expect(page.getByRole('option', { name: 'Aventura da API' })).toHaveCount(1);
    expect(optionCalls).toBe(beforeOptions + 1); expect(queries).toHaveLength(count);
    await page.getByLabel('Itens por página').selectOption('50');
    await expect(page.getByText('Exibindo 50 jogos · até 50 por página')).toBeVisible();
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    await expect(page.getByText('Página 2', { exact: true })).toBeVisible();
    const beforeDraft = queries.length;
    await page.getByLabel('Buscar jogos', { exact: true }).fill('a & b');
    await page.getByLabel('Gênero', { exact: true }).selectOption('31');
    await page.getByLabel('Plataforma', { exact: true }).selectOption('42');
    await page.getByLabel('Ordenar por').selectOption('name-desc');
    await page.getByLabel('Ordenar por').selectOption('release-desc');
    expect(queries).toHaveLength(beforeDraft);
    await expect(page.getByText(/primeira data de lançamento/)).toBeVisible();
    const apply = page.getByRole('button', { name: 'Aplicar filtros', exact: true });
    await apply.focus();
    const offset = await page.evaluate(() => window.scrollY);
    hold = true; await apply.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Carregando jogos' })).toBeVisible();
    await expect.poll(() => pending.length).toBe(1);
    expect(await page.locator('.game-card').count()).toBe(50);
    expect(Math.abs(await page.evaluate(() => window.scrollY) - offset)).toBeLessThanOrEqual(2);
    release();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Página 1', { exact: true })).toBeVisible();
    expect(Object.fromEntries(queries.at(-1)!)).toEqual({ term: 'a & b', sort: 'release-desc', genreId: '31', platformId: '42', page: '1', pageSize: '50' });
    await expect(page.getByLabel('Gênero', { exact: true })).toHaveValue('31');
    await expect(page.getByLabel('Filtros aplicados')).toHaveCount(0);
    await expect(page.getByRole('article').first().locator('time')).toHaveText('29/02/2024');
    await page.locator('.catalog-toolbar').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await mkdir('docs/evidence', { recursive: true });
    await page.screenshot({ path: `docs/evidence/S-PR-06-filters-${mobile ? 'mobile' : 'desktop'}.png` });
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    await expect(page.getByText('Página 2', { exact: true })).toBeVisible();
    expect(queries.at(-1)?.get('genreId')).toBe('31'); expect(queries.at(-1)?.get('platformId')).toBe('42');
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
    await expect(page.getByText('Página 1', { exact: true })).toBeVisible();
    expect(Object.fromEntries(queries.at(-1)!)).toEqual({ term: '', sort: 'release-desc', page: '1', pageSize: '50' });
    await expect(page.getByLabel('Gênero', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Plataforma', { exact: true })).toHaveValue('');
    const finalCount = queries.length;
    await page.getByLabel('Gênero', { exact: true }).selectOption('31');
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
    expect(queries).toHaveLength(finalCount);
  });
}
