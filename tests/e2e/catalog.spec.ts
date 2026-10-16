import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import type { GamePageResponse } from '../../src/services/http/dtos';
// Teste determinístico: servidor de contrato sintético, não Back nem IGDB live.
let server: Server;
let fresh = false;
let unavailable = false;
const calls: { method: string; path: string; status: number }[] = [];
test.beforeAll(async () => {
  server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1:5091');
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175');
    response.setHeader('Access-Control-Expose-Headers', 'X-Catalog-Stale,X-Catalog-Fetched-At');
    response.setHeader('Content-Type', 'application/json');
    const status = unavailable ? 503 : 200;
    calls.push({ method: request.method ?? 'GET', path: url.pathname + url.search, status });
    response.statusCode = status;
    if (unavailable) { response.end(JSON.stringify({ code: 'integration_unavailable', message: 'Integração indisponível.' })); return; }
    const number = Number(url.searchParams.get('page') ?? 1);
    response.setHeader('X-Catalog-Stale', number === 2 && !fresh ? 'true' : 'false');
    response.setHeader('X-Catalog-Fetched-At', '2026-10-14T10:00:00Z');
    const page: GamePageResponse = { items: [{ id: `igdb-${number}`, title: `Jogo de teste ${number}`, summary: 'Contrato sintético para verificar a interface.', coverUrl: null, genres: [], platforms: ['PC'], releaseDate: '2026-10-01', averageRating: null }], page: number, pageSize: 20, hasNextPage: number === 1 };
    response.end(JSON.stringify(page));
  });
  server.listen(5091, '127.0.0.1');
  await once(server, 'listening');
});
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
test('contrato simulado: paginação, CORS dos headers, stale, retry e erro sem fallback', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => { const hostname = new URL(request.url()).hostname; if (!['127.0.0.1', 'localhost'].includes(hostname)) external.push(hostname); });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Jogo de teste 1', exact: true })).toBeVisible();
  await expect(page.getByLabel('Ordenar por')).toHaveValue('release-desc');
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByText('Página 2', { exact: true })).toBeVisible();
  await expect(page.getByText(/Dados do catálogo desatualizados/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Próxima', exact: true })).toBeDisabled();
  await mkdir('docs/evidence', { recursive: true });
  await page.getByRole('heading', { name: 'Jogos', exact: true }).click();
  await page.screenshot({ path: 'docs/evidence/G-PR-05-catalog-contract.png', fullPage: true });
  fresh = true;
  await page.getByRole('button', { name: 'Consultar novamente', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Jogo de teste 2', exact: true })).toBeVisible();
  await expect(page.getByText(/Dados do catálogo desatualizados/)).toHaveCount(0);
  unavailable = true;
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByText('O catálogo está temporariamente indisponível. Tente novamente.', { exact: true })).toBeVisible();
  await expect(page.locator('.game-grid')).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Jogo de teste 1', exact: true })).toBeVisible();
  expect(external).toEqual([]);
  await writeFile('docs/evidence/G-PR-05-contract-calls.json', JSON.stringify({ mode: 'deterministic-contract-server-not-live', calls }, null, 2));
});
