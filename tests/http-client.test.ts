import { expect, test, vi } from 'vitest';
import { createHttpClient, type FetchTransport } from '../src/services/http/client';
function fake(response: Response): ReturnType<typeof vi.fn<FetchTransport>> { return vi.fn<FetchTransport>().mockImplementation(async () => response.clone()); }
test('URL base, segmentos opacos e query são codificados independentemente', async () => {
  const fetch = fake(Response.json([]));
  const client = createHttpClient('http://localhost:5000/', fetch);
  await client.request({ path: ['games', 'game%2F42 /?#~'], query: { search: 'a & b', sort: 'title-desc', absent: undefined } });
  expect(fetch.mock.calls[0][0]).toBe('http://localhost:5000/api/v1/games/game%252F42%20%2F%3F%23~?search=a+%26+b&sort=title-desc');
  await client.request({ path: ['health'], root: true });
  expect(fetch.mock.calls[1][0]).toBe('http://localhost:5000/health');
  expect(fetch.mock.calls[0][1].headers).toEqual({ Accept: 'application/json' });
});
test('JSON e Bearer são opt-in e escrita não é repetida', async () => {
  const fetch = fake(Response.json({ id: 'created' }, { status: 201 }));
  const client = createHttpClient('http://localhost:5000', fetch);
  await client.request({ method: 'POST', path: ['reviews', 'r', 'comments'], token: 'test-only', body: { text: 'Olá' } });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer test-only' }, body: '{"text":"Olá"}' });
});
test('204 não tenta ler JSON', async () => {
  const response = new Response(null, { status: 204 }); const json = vi.spyOn(response, 'json');
  await expect(createHttpClient('http://localhost:5000', vi.fn<FetchTransport>().mockResolvedValue(response)).request({ method: 'DELETE', path: ['favorites','game','g'] })).resolves.toBeUndefined();
  expect(json).not.toHaveBeenCalled();
});
test.each([[400,'validation_failed'],[401,'unauthorized'],[403,'forbidden'],[404,'not_found'],[409,'conflict'],[500,'internal_error']] as const)('HTTP %s preserva status/código sem expor mensagem externa', async (status, code) => {
  const fetch = fake(Response.json({ code, message: 'valor sensível não deve ser copiado' }, { status }));
  const error = await createHttpClient('http://localhost:5000', fetch).request({ path: ['games'] }).catch((value: unknown) => value);
  expect(error).toMatchObject({ kind: 'http', status, code });
  expect(String(error)).not.toContain('sensível'); expect(fetch).toHaveBeenCalledTimes(1);
});
test('falha de rede, JSON inválido e erro incompatível são distintos', async () => {
  const fetch = vi.fn<FetchTransport>().mockRejectedValue(new TypeError('segredo'));
  await expect(createHttpClient('http://localhost:5000', fetch).request({ path: ['games'] })).rejects.toMatchObject({ kind: 'network' });
  for (const response of [new Response('not json', { status: 200 }), Response.json({ password: 'secret' }, { status: 400 })]) {
    await expect(createHttpClient('http://localhost:5000', fake(response)).request({ path: ['games'] })).rejects.toMatchObject({ kind: 'contract' });
  }
});
test('AbortSignal é encaminhado e cancelamento classificado para não virar erro de UI', async () => {
  const controller = new AbortController(); const fetch = vi.fn<FetchTransport>().mockRejectedValue(new DOMException('Cancelado', 'AbortError'));
  await expect(createHttpClient('http://localhost:5000', fetch).request({ path: ['games'], signal: controller.signal })).rejects.toMatchObject({ kind: 'cancelled' });
  expect(fetch.mock.calls[0][1].signal).toBe(controller.signal);
  controller.abort(); fetch.mockClear();
  await expect(createHttpClient('http://localhost:5000', fetch).request({ path: ['games'], signal: controller.signal })).rejects.toMatchObject({ kind: 'cancelled' });
  expect(fetch).not.toHaveBeenCalled();
});
test.each(['', '/relative', 'ftp://localhost', 'https://user:pass@example.com', 'http://localhost:5000?token=secret'])('configuração inválida %s falha sem tráfego', (url) => {
  expect(() => createHttpClient(url)).toThrow();
});
test('segmentos de navegação são rejeitados sem consultar recurso diferente', async () => {
  const fetch = fake(Response.json({})); const client = createHttpClient('http://localhost:5000', fetch);
  for (const id of ['.', '..', '']) await expect(client.request({ path: ['games', id] })).rejects.toMatchObject({ kind: 'configuration' });
  expect(fetch).not.toHaveBeenCalled();
});
