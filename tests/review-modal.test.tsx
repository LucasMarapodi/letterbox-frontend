import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { RatedReviewForm } from '../src/components/RatedReviewForm';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireGame, wireReview, wireUser } from './http-fixtures';
import { deferred } from './fixtures';

async function open(options: { own?: boolean; guest?: boolean; write?: () => Promise<Response> } = {}) {
  let own = options.own ? { ...wireReview, title: 'Título salvo', rating: 4.25, text: 'Texto salvo' } : null;
  const transport = vi.fn<FetchTransport>().mockImplementation(async (url, init) => {
    const path = new URL(url).pathname;
    if (path.endsWith('/auth/login')) return Response.json({ user: wireUser, token: 'test-only', expiresAt: '2080-01-01T00:00:00Z' });
    if (path.endsWith('/auth/me')) return Response.json(wireUser);
    if (path.endsWith('/games/12/reviews') || (path.endsWith('/reviews/55') && init.method === 'PATCH')) {
      const result = options.write ? await options.write() : Response.json({ ...wireReview, ...JSON.parse(String(init.body)) });
      if (result.ok) own = await result.clone().json();
      return result;
    }
    if (path.endsWith('/games/12/reviews/me')) return Response.json({ review: own });
    if (path.endsWith('/games/12/opinions')) return Response.json({ averageRating: own?.rating ?? null, reviews: own ? [own] : [] });
    if (path.endsWith('/games/12')) return Response.json({ ...wireGame, averageRating: own?.rating ?? null });
    if (path.endsWith('/favorites')) return Response.json({ games: [], reviews: [] });
    if (path.endsWith('/like/me')) return Response.json({ likedByMe: false });
    return Response.json([]);
  });
  const services = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  if (!options.guest) await services.auth.login({ email: 'modal@example.test', password: 'test-only' });
  render(<MemoryRouter initialEntries={['/jogos/12']}><AppRoutes adapters={services} /></MemoryRouter>);
  const interaction = userEvent.setup();
  const trigger = await screen.findByRole('button', { name: options.own ? 'Editar minha review' : 'Criar review' });
  const writes = () => transport.mock.calls.filter(([, init]) => init.method === 'POST' && String(init.body).includes('rating') || init.method === 'PATCH');
  return { interaction, trigger, transport, writes };
}

test('modal fechado inicialmente; foco, Tab, fundo inerte, Escape e retorno ao gatilho', async () => {
  const { interaction, trigger, writes } = await open();
  expect(screen.queryByRole('form', { name: 'Publicar review' })).not.toBeInTheDocument();
  await interaction.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Criar review' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  const close = within(dialog).getByRole('button', { name: 'Fechar review' });
  expect(close).toHaveFocus(); expect(trigger.closest('body > div')).toHaveAttribute('inert');
  await interaction.tab({ shift: true }); expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  await interaction.tab(); expect(close).toHaveFocus();
  await interaction.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(trigger).toHaveFocus(); expect(trigger.closest('body > div')).not.toHaveAttribute('inert'); expect(writes()).toHaveLength(0);
});

test.each(['Cancelar', 'Fechar review', 'Escape'])('%s descarta rascunho sem persistir', async action => {
  const { interaction, trigger, writes } = await open(); await interaction.click(trigger);
  const dialog = screen.getByRole('dialog'); await interaction.type(within(dialog).getByLabelText('Título'), 'Rascunho');
  if (action === 'Escape') await interaction.keyboard('{Escape}'); else await interaction.click(within(dialog).getByRole('button', { name: action }));
  await interaction.click(trigger); expect(screen.getByLabelText('Título')).toHaveValue(''); expect(screen.getAllByRole('radio').every(radio => !(radio as HTMLInputElement).checked)).toBe(true); expect(writes()).toHaveLength(0);
});

test('sem input numérico, estrelas distinguem ausência e zero; título condicional', async () => {
  const { interaction, trigger, writes } = await open(); await interaction.click(trigger);
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument(); expect(screen.queryByLabelText('Nota (0 a 5)')).not.toBeInTheDocument();
  await interaction.click(screen.getByRole('button', { name: 'Publicar review' })); expect(screen.getByText('Escolha uma nota de 0 a 5.')).toBeVisible(); expect(writes()).toHaveLength(0);
  await interaction.click(screen.getByRole('radio', { name: '0 estrelas' }));
  await interaction.type(screen.getByLabelText('Descrição (opcional)'), 'Texto'); await interaction.click(screen.getByRole('button', { name: 'Publicar review' })); expect(screen.getByText('Informe um título quando houver descrição.')).toBeVisible(); expect(writes()).toHaveLength(0);
  await interaction.clear(screen.getByLabelText('Descrição (opcional)')); await interaction.click(screen.getByRole('button', { name: 'Publicar review' }));
  await screen.findByText('Review publicada.'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(JSON.parse(String(writes()[0][1].body))).toEqual({ rating: 0, text: '', title: null });
  expect(await screen.findByRole('button', { name: 'Editar minha review' })).toHaveFocus();
});

test('edição preserva 4.25 e valores confirmados; sucesso revalida consultas e lista', async () => {
  const { interaction, trigger, transport, writes } = await open({ own: true }); await interaction.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Editar minha review' }); expect(within(dialog).getByLabelText('Título')).toHaveValue('Título salvo'); expect(within(dialog).getByText('Nota selecionada: 4.25 de 5')).toBeVisible();
  await interaction.clear(within(dialog).getByLabelText('Título')); await interaction.type(within(dialog).getByLabelText('Título'), 'Descartar'); await interaction.click(within(dialog).getByRole('button', { name: 'Cancelar' })); await interaction.click(trigger); expect(screen.getByLabelText('Título')).toHaveValue('Título salvo');
  await interaction.type(screen.getByLabelText('Descrição (opcional)'), ' atualizado'); await interaction.click(screen.getByRole('button', { name: 'Salvar review' }));
  await screen.findByText('Review atualizada.'); expect(JSON.parse(String(writes()[0][1].body))).toEqual({ rating: 4.25, title: 'Título salvo', text: 'Texto salvo atualizado' }); expect(writes()[0][1].method).toBe('PATCH');
  await waitFor(() => { for (const suffix of ['/games/12', '/reviews/me', '/opinions']) expect(transport.mock.calls.filter(([url]) => url.endsWith(suffix)).length).toBeGreaterThan(1); });
  expect(await screen.findByText('Texto salvo atualizado')).toBeVisible();
});

test('pendência bloqueia fechar/enviar; falha preserva rascunho e retry', async () => {
  const pending = deferred<Response>(); let fail = true;
  const { interaction, trigger, writes } = await open({ write: () => fail ? pending.promise : Promise.resolve(Response.json({ ...wireReview, rating: 5, title: 'Rascunho', text: '' })) }); await interaction.click(trigger);
  await interaction.click(screen.getByRole('radio', { name: '5 estrelas' })); await interaction.type(screen.getByLabelText('Título'), 'Rascunho');
  const form = screen.getByRole('form', { name: 'Publicar review' }); fireEvent.submit(form); fireEvent.submit(form); expect(writes()).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled(); await interaction.keyboard('{Escape}'); await interaction.click(screen.getByRole('button', { name: 'Fechar review' })); expect(screen.getByRole('dialog')).toBeVisible();
  await act(async () => pending.resolve(Response.json({ code: 'storage_unavailable', message: 'Erro' }, { status: 503 })));
  await screen.findByText('Não foi possível publicar a review. Tente novamente.'); expect(screen.getByLabelText('Título')).toHaveValue('Rascunho'); expect(screen.getByRole('radio', { name: '5 estrelas' })).toBeChecked();
  fail = false; await interaction.click(screen.getByRole('button', { name: 'Publicar review' })); await screen.findByText('Review publicada.'); expect(writes()).toHaveLength(2);
});

test('visitante vai ao login sem abrir modal ou consultar review privada', async () => {
  const { interaction, trigger, transport } = await open({ guest: true }); await interaction.click(trigger); expect(screen.getByRole('form', { name: 'Login' })).toBeVisible(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(transport.mock.calls.some(([url]) => url.endsWith('/reviews/me'))).toBe(false);
});

test('formulário compartilhado mantém fracionária e permite nova escolha pelas estrelas', async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined); const interaction = userEvent.setup();
  render(<RatedReviewForm initialRating={4.25} onSubmit={onSubmit} onCancel={() => {}} submitLabel="Salvar review" pendingLabel="Salvando…" failureMessage="Falha" />);
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument(); expect(screen.getByText('Nota selecionada: 4.25 de 5')).toBeVisible();
  await interaction.click(screen.getByRole('button', { name: 'Salvar review' })); expect(onSubmit).toHaveBeenLastCalledWith({ rating: 4.25, title: null, text: '' });
  await interaction.click(screen.getByRole('radio', { name: '3 estrelas' })); await interaction.click(screen.getByRole('button', { name: 'Salvar review' })); expect(onSubmit).toHaveBeenLastCalledWith({ rating: 3, title: null, text: '' });
});
