import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { wireGame } from '../http-fixtures';

let server: Server;
const queries: Record<string, string>[] = [];
test.beforeAll(async () => {
  // Contrato sintético, exclusivo do teste; não altera o backend habitual.
  server = createServer((request, response) => {
    const query = Object.fromEntries(new URL(request.url ?? '/', 'http://127.0.0.1:5091').searchParams);
    queries.push(query);
    const page = Number(query.page ?? 1);
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175');
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ items: [wireGame], page, pageSize: Number(query.pageSize ?? 20), hasNextPage: page < 3 }));
  });
  server.listen(5091, '127.0.0.1'); await once(server, 'listening');
});
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

test('limpeza vazia e de rascunho preserva página 3; busca aplicada gera uma única consulta sem termo', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/');
  await expect(page.getByText('Página 1', { exact: true })).toBeVisible();
  await page.getByLabel('Itens por página').selectOption('50');
  await expect(page.getByText('Exibindo 1 jogo · até 50 por página')).toBeVisible();
  await page.getByLabel('Ordenar por').selectOption('name-desc');
  for (const number of [2, 3]) {
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    await expect(page.getByText(`Página ${number}`, { exact: true })).toBeVisible();
  }
  const before = queries.length;
  await page.getByRole('button', { name: 'Limpar busca', exact: true }).dblclick();
  await expect(page.getByText('Página 3', { exact: true })).toBeVisible();
  await page.getByLabel('Buscar jogos').fill('rascunho');
  await page.getByRole('button', { name: 'Limpar busca', exact: true }).click();
  await expect(page.getByLabel('Buscar jogos')).toHaveValue('');
  await expect(page.getByText('Página 3', { exact: true })).toBeVisible();
  expect(queries).toHaveLength(before);
  await mkdir('docs/evidence', { recursive: true });
  await page.getByText('Página 3', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/evidence/S-PR-15-clear-search-page3.png' });

  await page.getByLabel('Buscar jogos').fill('RPG');
  await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  await expect(page.getByText('Página 1', { exact: true })).toBeVisible();
  expect(queries.at(-1)?.term).toBe('RPG');
  await page.getByLabel('Buscar jogos').fill('');
  const applied = queries.length;
  await page.getByRole('button', { name: 'Limpar busca', exact: true }).dblclick();
  await expect(page.getByText('Página 1', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Ordenar por')).toHaveValue('name-desc');
  expect(queries).toHaveLength(applied + 1);
  expect(queries.at(-1)).toEqual({ term: '', sort: 'name-desc', page: '1', pageSize: '50' });
});
