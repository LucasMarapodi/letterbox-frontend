import { test, expect } from '@playwright/test';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { wireUser, wirePage } from '../http-fixtures';

// Transporte HTTP sintético de teste; não inicia nem modifica o backend habitual.
let server: Server;
let loginCalls = 0;
let logoutCalls = 0;
const logins = new Set<ServerResponse>();
const logouts = new Set<ServerResponse>();
function release(responses: Set<ServerResponse>, status: number, body?: unknown) {
  for (const response of responses) { response.statusCode = status; response.end(body === undefined ? undefined : JSON.stringify(body)); }
  responses.clear();
}
test.beforeAll(async () => {
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'OPTIONS') { response.statusCode = 204; response.end(); return; }
    const path = new URL(request.url ?? '/', 'http://127.0.0.1:5091').pathname;
    if (path.endsWith('/auth/login')) { loginCalls++; logins.add(response); return; }
    if (path.endsWith('/auth/logout')) { logoutCalls++; logouts.add(response); return; }
    response.end(JSON.stringify(path.endsWith('/auth/me') ? wireUser : path.endsWith('/games') ? wirePage() : { favorites: { games: [], reviews: [] }, feed: [] }));
  });
  server.listen(5091, '127.0.0.1');
  await once(server, 'listening');
});
test.afterAll(async () => {
  release(logins, 503, {}); release(logouts, 204);
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('Enter repetido não duplica login; falha mantém campos e libera retry; logout mantém navegação livre', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill('test@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('test-only');
  await page.getByLabel('Senha', { exact: true }).press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Entrando…' })).toBeDisabled();
  await expect.poll(() => loginCalls).toBe(1);
  release(logins, 500, { code: 'internal_error', message: 'Falha de teste.' });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('test-only');
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
  await page.getByLabel('Senha', { exact: true }).press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Entrando…' })).toBeDisabled();
  await expect.poll(() => loginCalls).toBe(2);
  release(logins, 200, { user: wireUser, token: 'test-only', expiresAt: '2080-01-01T00:00:00Z' });
  await expect(page.getByLabel('Usuário conectado')).toHaveText('Ana');
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:5175/');
  await expect(page.getByText('Encerrando sessão…')).toBeVisible();
  await expect.poll(() => logoutCalls).toBe(1);
  await expect(page.getByRole('link', { name: 'Entrar', exact: true })).toBeEnabled();
  release(logouts, 204);
  await expect(page.getByText('Encerrando sessão…')).toHaveCount(0);
  expect(loginCalls).toBe(2);
  expect(logoutCalls).toBe(1);
});
