import { test, expect, type Page } from '@playwright/test';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { wireGame } from '../http-fixtures';

let server: Server;
let hold = false;
const calls: URLSearchParams[] = [];
const pending: { response: ServerResponse; query: URLSearchParams }[] = [];
function respond(response: ServerResponse, query: URLSearchParams, outcome: 'success' | 'short' | 'error' = 'success') {
  const pageSize = Number(query.get('pageSize') ?? 20);
  response.statusCode = outcome === 'error' ? 500 : 200;
  response.end(JSON.stringify(outcome === 'error' ? { code: 'internal_error', message: 'Falha sintética' } : {
    items: Array.from({ length: outcome === 'short' ? 1 : pageSize }, (_, index) => ({ ...wireGame, id: index + 1, title: `${query.get('term') || 'Inicial'} ${index + 1}` })),
    page: Number(query.get('page') ?? 1), pageSize, hasNextPage: true,
  }));
}
function release(outcome: 'success' | 'short' | 'error' = 'success') {
  hold = false;
  for (const item of pending.splice(0)) respond(item.response, item.query, outcome);
}
test.beforeAll(async () => {
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175');
    response.setHeader('Content-Type', 'application/json');
    const query = new URL(request.url ?? '/', 'http://127.0.0.1:5091').searchParams;
    calls.push(query);
    if (hold) pending.push({ response, query }); else respond(response, query);
  });
  server.listen(5091, '127.0.0.1'); await once(server, 'listening');
});
test.afterEach(() => release());
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

async function position(page: Page) {
  await page.evaluate(() => {
    const toolbar = document.querySelector('.catalog-toolbar')!;
    window.scrollTo(0, window.scrollY + toolbar.getBoundingClientRect().top - 80);
  });
  const offset = await page.evaluate(() => window.scrollY);
  expect(offset).toBeGreaterThan(100);
  return offset;
}
async function assertPosition(page: Page, before: number) {
  const { actual, maximum } = await page.evaluate(() => ({ actual: window.scrollY, maximum: document.documentElement.scrollHeight - window.innerHeight }));
  expect(Math.abs(actual - Math.min(before, Math.max(0, maximum)))).toBeLessThanOrEqual(2);
}
async function assertBlocked(page: Page, before: number) {
  const overlay = page.getByRole('dialog', { name: 'Carregando jogos' });
  await expect(overlay).toBeVisible();
  await expect(overlay).toBeFocused();
  const box = await overlay.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).toMatchObject({ x: 0, y: 0, width: viewport.width, height: viewport.height });
  expect(await page.locator('#root').getAttribute('inert')).toBe('');
  expect(await page.locator('.game-card').count()).toBeGreaterThan(0);
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await expect(overlay).toBeFocused();
  const count = calls.length;
  await page.mouse.click(80, 100); await page.keyboard.press('Enter');
  await page.mouse.wheel(0, 600);
  await assertPosition(page, before);
  expect(calls).toHaveLength(count);
}

for (const mobile of [false, true]) {
  test.describe(mobile ? 'mobile' : 'desktop', () => {
    test.use({ viewport: mobile ? { width: 375, height: 812 } : { width: 1280, height: 900 }, hasTouch: mobile });
    test('busca/tamanho preservam rolagem e foco; erro/retry e resultado menor liberam o bloqueio', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('article')).toHaveCount(20);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByLabel('Buscar jogos').fill('aventura');
      const before = await position(page);
      hold = true;
      const count = calls.length;
      await page.getByRole('button', { name: 'Buscar', exact: true }).click();
      await expect.poll(() => pending.length).toBe(1);
      await assertBlocked(page, before);
      if (mobile) { await page.touchscreen.tap(80, 100); await assertPosition(page, before); }
      await mkdir('docs/evidence', { recursive: true });
      await page.screenshot({ path: `docs/evidence/S-PR-25-loading-${mobile ? 'mobile' : 'desktop'}.png` });
      release();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'aventura 1', exact: true })).toBeVisible();
      await assertPosition(page, before);
      await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toBeFocused();
      expect(calls).toHaveLength(count + 1);

      const size = page.getByLabel('Itens por página');
      await size.focus();
      const sizeBefore = await position(page);
      hold = true;
      await size.selectOption('50');
      await expect.poll(() => pending.length).toBe(1);
      await assertBlocked(page, sizeBefore);
      release('error');
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await assertPosition(page, sizeBefore);
      await expect(size).toBeFocused();
      await expect(size).toHaveValue('50');
      await expect(page.getByLabel('Buscar jogos')).toHaveValue('aventura');
      expect(await page.locator('.game-card').count()).toBe(20);

      hold = true;
      await page.getByRole('button', { name: 'Tentar novamente' }).click();
      const retryBefore = await page.evaluate(() => window.scrollY);
      await expect.poll(() => pending.length).toBe(1);
      await assertBlocked(page, retryBefore);
      release('short');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByRole('article')).toHaveCount(1);
      await expect(page.getByLabel('Buscar jogos')).toBeFocused();
      await assertPosition(page, retryBefore);
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');

      const finalCount = calls.length;
      await size.selectOption('50');
      await page.getByRole('button', { name: 'Buscar', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(calls).toHaveLength(finalCount);
      await page.screenshot({ path: `docs/evidence/S-PR-25-result-${mobile ? 'mobile' : 'desktop'}.png` });
    });
  });
}
