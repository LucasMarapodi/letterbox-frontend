import { withFilterOptions } from './http-fixtures';
import { wirePage } from './http-fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { createHttpSessionStore } from '../src/services/http/adapters';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, wireReview, withAuthentication } from './http-fixtures';
const updated = { ...wireReview, text: 'Texto atualizado', updatedAt: '2026-10-13T14:00:00Z' };
test('leitura pública e PATCH mínimo preservam projeção, ID e createdAt', async () => {
  const session = createHttpSessionStore(); session.establish({ user: wireUser, token: 'test-only', expiresAt: '2080-01-01T00:00:00Z' });
  const transport = vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json(wireReview)).mockResolvedValueOnce(Response.json(updated));
  const service = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5207' }, { transport: withFilterOptions(transport), session }).community;
  expect(await service.getReview(wireReview.id)).toEqual(wireReview);
  expect(transport.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  expect(await service.editReview(wireReview.id, { rating: 4.5, text: updated.text }, { ...wireUser, id: 999 })).toEqual(updated);
  expect(transport.mock.calls[1][0].endsWith('/reviews/55')).toBe(true);
  expect(transport.mock.calls[1][1]).toMatchObject({ method: 'PATCH', body: '{"rating":4.5,"text":"Texto atualizado"}', headers: { Authorization: 'Bearer test-only' } });
});
test('404 público vira ausência, rede/contrato continuam erros; edição distingue 403 e 404', async () => {
  const session = createHttpSessionStore(); session.establish({ user: wireUser, token: 'test-only', expiresAt: '2080-01-01T00:00:00Z' });
  const transport = vi.fn<FetchTransport>().mockResolvedValueOnce(Response.json({code:'not_found',message:'Seguro'},{status:404})).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json({})).mockResolvedValueOnce(Response.json({code:'forbidden',message:'Seguro'},{status:403})).mockResolvedValueOnce(Response.json({code:'not_found',message:'Seguro'},{status:404}));
  const service = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5207' }, { transport: withFilterOptions(transport), session }).community;
  expect(await service.getReview(999)).toBeNull();
  await expect(service.getReview(999)).rejects.toMatchObject({kind:'network'});
  await expect(service.getReview(999)).rejects.toMatchObject({kind:'contract'});
  await expect(service.editReview(55, { rating: 4.5, text: 'texto' }, wireUser)).rejects.toMatchObject({code:'forbidden'});
  await expect(service.editReview(55, { rating: 4.5, text: 'texto' }, wireUser)).rejects.toMatchObject({code:'not-found'});
});
async function open(failure?: number, other = false): Promise<ReturnType<typeof userEvent.setup>> {
  const interaction = userEvent.setup();
  const review = other ? { ...wireReview, userId: 2, author:{...wireReview.author,id: 2,displayName:'Outro'} } : wireReview;
  const transport = withAuthentication(async(url, init) => {
    if(new URL(url).pathname === '/api/v1/games') return Response.json(wirePage([]));
    if(url.endsWith('/comments')) return Response.json([]);
    if(init.method === 'PATCH') {
      if(failure === 0) throw new Error('offline');
      if(failure) return Response.json({code:failure === 403 ? 'forbidden':'not_found',message:'Seguro'},{status:failure});
      return Response.json(updated);
    }
    return Response.json(review);
  });
  render(<MemoryRouter initialEntries={['/login']}><AppRoutes adapters={createDefaultApplicationServices({apiBaseUrl:'http://localhost:5207'},{ transport: withFilterOptions(transport)})}/></MemoryRouter>);
  await interaction.type(screen.getByLabelText('E-mail'),'test@example.com'); await interaction.type(screen.getByLabelText('Senha'),'test-only'); await interaction.click(screen.getByRole('button',{name:'Entrar'}));
  await screen.findByLabelText('Usuário conectado');
  // Navegação pública pelo mesmo roteador, sem substituir o serviço da página.
  await interaction.click(await screen.findByRole('link',{name:'Review de exemplo'}));
  if(!other) await interaction.click(await screen.findByRole('button',{name:'Editar minha review'})); return interaction;
}
test('autor edita a projeção da API e UI mantém a data original', async () => {
  const interaction = await open();
  await interaction.clear(await screen.findByLabelText('Descrição (opcional)')); await interaction.type(screen.getByLabelText('Descrição (opcional)'),updated.text); await interaction.click(screen.getByRole('button',{name:'Salvar review'}));
  expect(await screen.findByText('Review atualizada.')).toBeVisible(); expect(screen.getByText(updated.text, {selector:'p.review-text'})).toBeVisible(); expect(screen.getByText('13/10/2026')).toHaveAttribute('dateTime',wireReview.createdAt);
});
test.each([[403,'Você não tem permissão para editar esta review.'],[404,'Esta review não está mais disponível.'],[0,'Não foi possível salvar a review. Tente novamente.']])('erro %s preserva o texto com mensagem própria', async (status, message) => {
  const interaction = await open(status);
  await interaction.type(await screen.findByLabelText('Descrição (opcional)'),' rascunho'); await interaction.click(screen.getByRole('button',{name:'Salvar review'}));
  expect(await screen.findByText(message)).toBeVisible(); expect(screen.getByLabelText('Descrição (opcional)')).toHaveValue('Review rascunho'); expect(screen.queryByText('Review atualizada.')).not.toBeInTheDocument();
});
test('outro autor não recebe formulário de edição',async()=>{await open(undefined,true); expect(await screen.findByRole('heading',{name:'Review de Outro'})).toBeVisible(); expect(screen.queryByLabelText('Descrição (opcional)')).not.toBeInTheDocument();});
