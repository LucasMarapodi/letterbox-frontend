import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { wireGame } from '../http-fixtures';
import type { GamePageResponse } from '../../src/services/http/dtos';

let server: Server;
const calls: URLSearchParams[] = [];
test.beforeAll(async () => {
  // Contrato sintético exclusivo do teste, sem backend/IGDB live.
  server = createServer((request, response) => {
    const query = new URL(request.url ?? '/', 'http://127.0.0.1:5091').searchParams;
    calls.push(query);
    const page = Number(query.get('page') ?? 1);
    const pageSize = Number(query.get('pageSize') ?? 20);
    const count = page === 3 ? Math.min(13, pageSize) : pageSize;
    const body: GamePageResponse = { items: Array.from({ length: count }, (_, index) => ({ ...wireGame, id: index + 1, title: `Jogo ${index + 1}` })), page, pageSize, hasNextPage: page < 3 };
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175');
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(body));
  });
  server.listen(5091, '127.0.0.1'); await once(server, 'listening');
});
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

test('quantidade usa HTTP, volta à primeira página e mostra página parcial em desktop/mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/');
  await expect(page.getByText('Exibindo 20 jogos · até 20 por página')).toBeVisible();
  expect(calls[0].get('pageSize')).toBe('20');
  await page.getByLabel('Buscar jogos').fill('a & b');
  await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  await page.getByLabel('Ordenar por').selectOption('name-desc');
  for (const number of [2, 3]) {
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    await expect(page.getByText(`Página ${number}`, { exact: true })).toBeVisible();
  }
  await expect(page.getByText('Exibindo 13 jogos · até 20 por página')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled();
  await page.getByLabel('Itens por página').selectOption('50');
  await expect(page.getByText('Página 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(50);
  expect(Object.fromEntries(calls.at(-1)!)).toEqual({ term: 'a & b', sort: 'name-desc', page: '1', pageSize: '50' });
  await page.getByLabel('Itens por página').selectOption('10');
  await expect(page.getByText('Exibindo 10 jogos · até 10 por página')).toBeVisible();
  await mkdir('docs/evidence', { recursive: true });
  await page.getByLabel('Itens por página').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/evidence/S-PR-04-catalog-desktop.png' });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByLabel('Itens por página').scrollIntoViewIfNeeded();
  await expect(page.getByLabel('Itens por página')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/evidence/S-PR-04-catalog-mobile.png' });
});
