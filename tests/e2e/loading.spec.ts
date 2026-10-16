import { test, expect } from '@playwright/test';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import type { GamePageResponse } from '../../src/services/http/dtos';

// Servidor sintético exclusivo do teste; nenhuma alteração na API real.
let server: Server;
const pending = new Set<ServerResponse>();
let completed: { status: number; body: unknown } | null = null;
function release(status: number, body: unknown) {
  completed = { status, body };
  for (const response of pending) {
    response.statusCode = status;
    response.end(JSON.stringify(body));
  }
  pending.clear();
}
const empty: GamePageResponse = { items: [], page: 1, pageSize: 20, hasNextPage: false };

test.beforeAll(async () => {
  server = createServer((_request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175');
    response.setHeader('Content-Type', 'application/json');
    if (completed) {
      response.statusCode = completed.status;
      response.end(JSON.stringify(completed.body));
      return;
    }
    pending.add(response);
    response.on('close', () => pending.delete(response));
  });
  server.listen(5091, '127.0.0.1');
  await once(server, 'listening');
});
test.afterAll(async () => {
  release(503, {});
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('catálogo comunica pendência, vazio, erro e retry sem manter vazio antigo', async ({ page }) => {
  await page.goto('/');
  const catalog = page.getByRole('region', { name: 'Jogos', exact: true });
  await expect(catalog).toHaveAttribute('aria-busy', 'true');
  await expect(catalog.getByRole('status')).toBeVisible();
  await expect.poll(() => pending.size).toBeGreaterThan(0);
  await mkdir('docs/evidence', { recursive: true });
  await page.screenshot({ path: 'docs/evidence/S-PR-02-catalog-loading.png', fullPage: true });
  release(200, empty);
  await expect(catalog).toHaveAttribute('aria-busy', 'false');
  await expect(catalog.getByText(/Nenhum jogo/)).toBeVisible();

  completed = null;
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(catalog).toHaveAttribute('aria-busy', 'true');
  await expect(catalog.getByText(/Nenhum jogo/)).toHaveCount(0);
  await expect.poll(() => pending.size).toBeGreaterThan(0);
  release(503, { code: 'integration_unavailable', message: 'Integração indisponível.' });
  await expect(catalog).toHaveAttribute('aria-busy', 'false');
  await expect(catalog.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  completed = null;
  await catalog.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(catalog).toHaveAttribute('aria-busy', 'true');
  await expect.poll(() => pending.size).toBeGreaterThan(0);
  release(200, { ...empty, items: [{ id: 1, igdbId: 1001, title: 'Jogo de teste', summary: 'Contrato sintético.', coverUrl: null, genres: [], platforms: ['PC'], releaseDate: null, averageRating: null }] } satisfies GamePageResponse);
  await expect(catalog.getByRole('link', { name: 'Jogo de teste', exact: true })).toBeVisible();
  await expect(catalog).toHaveAttribute('aria-busy', 'false');
});
