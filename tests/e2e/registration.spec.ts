import { test, expect } from '@playwright/test';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { wireUser, wirePage } from '../http-fixtures';

let server: Server;
const pending = new Set<ServerResponse>();
const writes: string[] = [];
function release(status: number, body: unknown) {
  for (const response of pending) { response.statusCode = status; response.end(JSON.stringify(body)); }
  pending.clear();
}
test.beforeAll(async () => {
  // Servidor de contrato sintético; não cria contas na API habitual.
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5175');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'OPTIONS') { response.statusCode = 204; response.end(); return; }
    const path = new URL(request.url ?? '/', 'http://127.0.0.1:5091').pathname;
    if (request.method === 'POST') writes.push(path);
    if (path.endsWith('/auth/register')) { pending.add(response); return; }
    response.end(JSON.stringify(wirePage()));
  });
  server.listen(5091, '127.0.0.1'); await once(server, 'listening');
});
test.afterAll(async () => {
  release(503, {});
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('409 conserva formulário; retry 201 abre login como visitante e replace remove cadastro do histórico', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Nova Pessoa');
  await page.getByLabel('E-mail', { exact: true }).fill('nova@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('test-only');
  await page.getByLabel('Senha', { exact: true }).press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Criando conta…' })).toBeDisabled();
  await expect.poll(() => writes.length).toBe(1);
  release(409, { code: 'conflict', message: 'Duplicado.' });
  await expect(page.getByRole('alert')).toHaveText('Este e-mail já está cadastrado.');
  await expect(page).toHaveURL('http://127.0.0.1:5175/cadastro');
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('test-only');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect.poll(() => writes.length).toBe(2);
  release(201, wireUser);
  await expect(page).toHaveURL('http://127.0.0.1:5175/login');
  await expect(page.getByRole('status')).toHaveText('Conta criada. Entre para continuar.');
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Usuário conectado')).toHaveCount(0);
  expect(writes).toEqual(['/api/v1/auth/register', '/api/v1/auth/register']);
  await mkdir('docs/evidence', { recursive: true });
  await page.screenshot({ path: 'docs/evidence/S-PR-14-registration-login.png' });
  await page.goBack();
  await expect(page).toHaveURL('http://127.0.0.1:5175/');
  await expect(page.getByRole('form', { name: 'Cadastro' })).toHaveCount(0);
});
