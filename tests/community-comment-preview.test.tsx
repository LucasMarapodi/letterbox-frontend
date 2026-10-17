import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireComment, wireReview } from './http-fixtures';
import { deferred } from './fixtures';

const comments = [81, 82, 83, 84].map((id, index) => ({ ...wireComment, id, text: `Comentário ${index + 1}` }));
async function open(options: { count?: number; response?: () => Promise<Response> } = {}) {
  const transport = vi.fn<FetchTransport>().mockImplementation(async url => {
    const path = new URL(url).pathname;
    if (path.endsWith('/most-commented')) return Response.json([{ review: wireReview, commentCount: options.count ?? 4, lastCommentAt: wireReview.createdAt }]);
    if (path.endsWith('/recent')) return Response.json([wireReview]);
    if (path.endsWith('/comments')) return options.response ? options.response() : Response.json(comments.slice(0, options.count ?? 4));
    if (path.endsWith('/reviews/55')) return Response.json(wireReview);
    return Response.json([]);
  });
  render(<MemoryRouter initialEntries={['/comunidade']}><AppRoutes adapters={createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport })} /></MemoryRouter>);
  const interaction = userEvent.setup();
  await screen.findByText('Review');
  return { interaction, transport };
}

test('Mais comentadas mostra apenas os dois primeiros; Ver mais abre o primeiro oculto e dá foco', async () => {
  const { interaction, transport } = await open();
  expect(transport.mock.calls.some(([url]) => url.endsWith('/comments'))).toBe(false);
  await interaction.click(screen.getByRole('button', { name: 'Mais comentadas' }));
  const preview = await screen.findByRole('region', { name: 'Prévia dos comentários' });
  await within(preview).findByText('Comentário 1');
  expect(within(preview).getAllByRole('listitem')).toHaveLength(2);
  expect(within(preview).getByText('Comentário 2')).toBeVisible();
  expect(screen.queryByText('Comentário 3')).not.toBeInTheDocument();
  const more = within(preview).getByRole('link', { name: 'Ver mais' });
  expect(more).toHaveAttribute('href', '/reviews/55#comentario-83');
  expect(transport.mock.calls.filter(([url]) => url.endsWith('/reviews/55/comments'))).toHaveLength(1);
  await interaction.click(more);
  const target = await screen.findByText('Comentário 3');
  expect(target.closest('li')).toHaveAttribute('id', 'comentario-83');
  expect(target.closest('li')).toHaveFocus();
});

test.each([1, 2])('%i comentários não exibem Ver mais desnecessário', async count => {
  const { interaction } = await open({ count }); await interaction.click(screen.getByRole('button', { name: 'Mais comentadas' }));
  await screen.findByText('Comentário 1');
  expect(within(screen.getByRole('region', { name: 'Prévia dos comentários' })).getAllByRole('listitem')).toHaveLength(count);
  expect(screen.queryByRole('link', { name: 'Ver mais' })).not.toBeInTheDocument();
});

test('lista vazia não inventa comentários, mesmo se contagem do ranking estiver antiga', async () => {
  const { interaction } = await open({ response: async () => Response.json([]) }); await interaction.click(screen.getByRole('button', { name: 'Mais comentadas' }));
  await screen.findByText('4 comentários no período');
  expect(screen.queryByRole('link', { name: 'Ver mais' })).not.toBeInTheDocument();
  expect(screen.queryByText('Nenhum comentário nesta review.')).not.toBeInTheDocument();
});

test('falha da prévia não oculta review; retry carrega e resposta após sair da aba é ignorada', async () => {
  let fail = true;
  const { interaction } = await open({ response: async () => fail ? Response.json({ code: 'storage_unavailable', message: 'Erro' }, { status: 503 }) : Response.json(comments) });
  await interaction.click(screen.getByRole('button', { name: 'Mais comentadas' })); await screen.findByText('Não foi possível carregar os comentários.');
  expect(screen.getByText('Review')).toBeVisible(); fail = false;
  await interaction.click(within(screen.getByRole('region', { name: 'Prévia dos comentários' })).getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByText('Comentário 1');
});

test('resposta depois de sair da aba não insere comentários em Recentes', async () => {
  const pending = deferred<Response>(); const { interaction } = await open({ response: () => pending.promise });
  await interaction.click(screen.getByRole('button', { name: 'Mais comentadas' })); await screen.findByText('Carregando comentários…');
  await interaction.click(screen.getByRole('button', { name: 'Recentes' })); await screen.findByText('Review');
  await act(async () => pending.resolve(Response.json(comments)));
  expect(screen.queryByText('Comentário 1')).not.toBeInTheDocument();
});
