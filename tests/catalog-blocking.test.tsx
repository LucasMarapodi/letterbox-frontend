import { withFilterOptions } from './http-fixtures';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { deferred } from './fixtures';
import { wireGame, wirePage } from './http-fixtures';

const result = (title = 'Jogo anterior', size = 20) => Response.json({ ...wirePage([{ ...wireGame, title }]), pageSize: size, hasNextPage: true });
async function open(respond: (query: URLSearchParams) => Promise<Response>, initial = result()) {
  let first = true;
  const transport = vi.fn<FetchTransport>().mockImplementation(async url => {
    const parsed = new URL(url);
    if (parsed.pathname !== '/api/v1/games') return Response.json([]);
    if (first) { first = false; return initial; }
    return respond(parsed.searchParams);
  });
  const view = render(<MemoryRouter><AppRoutes adapters={createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: withFilterOptions(transport)})} /></MemoryRouter>);
  await screen.findByRole('link', { name: 'Jogo anterior' });
  return { ...view, interaction: userEvent.setup(), queries: () => transport.mock.calls.filter(([url]) => new URL(url).pathname === '/api/v1/games') };
}

test.each(['busca', 'tamanho'])('%s mantém o catálogo montado, isola a página e restaura foco após sucesso', async action => {
  const pending = deferred<Response>();
  const { interaction, container, queries } = await open(() => pending.promise);
  const previous = screen.getByRole('link', { name: 'Jogo anterior' });
  const control = action === 'busca' ? screen.getByRole('button', { name: 'Aplicar filtros' }) : screen.getByLabelText('Itens por página');
  if (action === 'busca') {
    await interaction.type(screen.getByLabelText('Buscar jogos'), 'aventura');
    await interaction.click(control);
  } else { control.focus(); await interaction.selectOptions(control, '50'); }
  const overlay = screen.getByRole('dialog', { name: 'Carregando jogos' });
  expect(overlay).toHaveFocus();
  expect(container).toHaveAttribute('inert');
  expect(document.documentElement.style.overflow).toBe('hidden');
  expect(previous).toBeInTheDocument();
  expect(previous.closest('[aria-hidden="true"]')).not.toBeNull();
  fireEvent.submit(screen.getByRole('form', { name: 'Busca de jogos' }));
  fireEvent.change(screen.getByLabelText('Itens por página'), { target: { value: '10' } });
  expect(queries()).toHaveLength(2);
  await act(async () => { pending.resolve(result('Jogo atualizado', action === 'busca' ? 20 : 50)); await pending.promise; });
  expect(await screen.findByRole('link', { name: 'Jogo atualizado' })).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(container).not.toHaveAttribute('inert');
  expect(document.documentElement.style.overflow).toBe('');
  expect(control).toHaveFocus();
});

test.each(['falha', 'cancelamento'])('%s libera bloqueio, conserva contexto anterior e retry volta a bloquear', async outcome => {
  const pending = deferred<Response>(); const retry = deferred<Response>(); let count = 0;
  const { interaction, queries } = await open(() => ++count === 1 ? pending.promise.then(response => {
    if (outcome === 'cancelamento') throw new DOMException('Cancelado', 'AbortError');
    return response;
  }) : retry.promise);
  await interaction.type(screen.getByLabelText('Buscar jogos'), 'aventura{Enter}');
  expect(screen.getByRole('dialog', { name: 'Carregando jogos' })).toBeInTheDocument();
  await act(async () => { pending.resolve(Response.json({ code: 'internal_error', message: 'Falha de teste' }, { status: 500 })); await pending.promise; });
  await screen.findByRole('alert');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.documentElement.style.overflow).toBe('');
  expect(screen.getByLabelText('Buscar jogos')).toHaveValue('aventura');
  expect(screen.getByText('Jogo anterior')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Jogo anterior' })).not.toBeInTheDocument();
  await interaction.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(screen.getByRole('dialog', { name: 'Carregando jogos' })).toBeInTheDocument();
  await act(async () => { retry.resolve(result('Recuperado')); await retry.promise; });
  expect(await screen.findByRole('link', { name: 'Recuperado' })).toBeVisible();
  expect(screen.getByLabelText('Buscar jogos')).toHaveFocus();
  expect(queries()).toHaveLength(3);
});

test('limpeza vazia/rascunho, mesmo tamanho e busca idêntica não consultam nem bloqueiam', async () => {
  const { interaction, queries } = await open(async () => result('Jogo anterior'));
  await interaction.click(screen.getByRole('button', { name: 'Limpar busca' }));
  await interaction.type(screen.getByLabelText('Buscar jogos'), 'rascunho');
  await interaction.click(screen.getByRole('button', { name: 'Limpar busca' }));
  fireEvent.change(screen.getByLabelText('Itens por página'), { target: { value: '20' } });
  await interaction.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  expect(queries()).toHaveLength(1);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('limpar busca aplicada bloqueia; ordenação fica em rascunho e paginação mantém loading regional', async () => {
  const pending = deferred<Response>(); let hold = false;
  const { interaction } = await open(async () => hold ? pending.promise : result());
  await interaction.type(screen.getByLabelText('Buscar jogos'), 'aventura{Enter}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  hold = true;
  await interaction.click(screen.getByRole('button', { name: 'Limpar busca' }));
  expect(screen.getByRole('dialog', { name: 'Carregando jogos' })).toBeInTheDocument();
  await act(async () => { pending.resolve(result()); await pending.promise; });
  await screen.findByRole('link', { name: 'Jogo anterior' });
  hold = false;
  await interaction.selectOptions(screen.getByLabelText('Ordenar por'), 'name-desc');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await screen.findByRole('link', { name: 'Jogo anterior' });
  await interaction.click(screen.getByRole('button', { name: 'Próxima' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('resposta inicial obsoleta não remove overlay nem substitui a busca atual', async () => {
  const old = deferred<Response>(); const latest = deferred<Response>(); let count = 0;
  const transport: FetchTransport = async () => ++count === 1 ? old.promise : latest.promise;
  render(<MemoryRouter><AppRoutes adapters={createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport: withFilterOptions(transport)})} /></MemoryRouter>);
  await userEvent.setup().type(screen.getByLabelText('Buscar jogos'), 'nova{Enter}');
  expect(screen.getByRole('dialog', { name: 'Carregando jogos' })).toBeInTheDocument();
  await act(async () => { old.resolve(result('Obsoleto')); await old.promise; });
  expect(screen.getByRole('dialog', { name: 'Carregando jogos' })).toBeInTheDocument();
  expect(screen.queryByText('Obsoleto')).not.toBeInTheDocument();
  await act(async () => { latest.resolve(result('Atual')); await latest.promise; });
  expect(await screen.findByRole('link', { name: 'Atual' })).toBeVisible();
});

test('desmontar libera documento e ignora retorno tardio', async () => {
  const pending = deferred<Response>();
  const { interaction, unmount, container } = await open(() => pending.promise);
  await interaction.type(screen.getByLabelText('Buscar jogos'), 'nova{Enter}');
  expect(screen.getByRole('dialog', { name: 'Carregando jogos' })).toBeInTheDocument();
  unmount();
  expect(container).not.toHaveAttribute('inert');
  expect(document.documentElement.style.overflow).toBe('');
  await act(async () => { pending.resolve(result('Tardio')); await pending.promise; });
  expect(screen.queryByText('Tardio')).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
