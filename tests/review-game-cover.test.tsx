import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import type { FetchTransport } from '../src/services/http/client';
import { wireUser, wireReview, withAuthentication, withFilterOptions } from './http-fixtures';

async function open(path: string, coverUrl: string | null = '/covers/game.jpg') {
  const review = {...wireReview, game:{...wireReview.game, coverUrl}};
  const transport = vi.fn<FetchTransport>().mockImplementation(withAuthentication(async url => {
    if (url.endsWith('/favorites')) return Response.json({games:[],reviews:[review]});
    if (url.endsWith('/like/me')) return Response.json({likedByMe:false});
    if (url.endsWith('/reviews/55')) return Response.json(review);
    if (url.endsWith('/recent') || url.endsWith('/users/1/reviews')) return Response.json([review]);
    if (url.endsWith('/users/1')) return Response.json(wireUser);
    return Response.json([]);
  }));
  const services = createDefaultApplicationServices({apiBaseUrl:'http://localhost:5080'}, {transport:withFilterOptions(transport)});
  await services.auth.login({email:'cover@example.test',password:'test-only'});
  render(<MemoryRouter initialEntries={[path]}><AppRoutes adapters={services} /></MemoryRouter>);
  return transport;
}

test.each(['/perfil/1','/comunidade','/reviews/55'])('capa do jogo aparece em %s sem buscar detalhes adicionais', async path => {
  const transport = await open(path);
  const covers = await screen.findAllByRole('img',{name:'Capa de Jogo HTTP'});
  expect(covers).toHaveLength(path.startsWith('/perfil') ? 2 : 1);
  for (const cover of covers) {
    expect(cover).toHaveAttribute('src','/covers/game.jpg');
    expect(cover.closest('a')).toHaveAttribute('href','/jogos/12');
  }
  expect(transport.mock.calls.some(([url])=>url.endsWith('/games/12'))).toBe(false);
});

test.each([null, '/covers/broken.jpg'])('capa ausente ou quebrada usa alternativa: %s', async src => {
  await open('/comunidade',src);
  if (src) fireEvent.error(await screen.findByRole('img',{name:'Capa de Jogo HTTP'}));
  expect(await screen.findByRole('img',{name:'Capa de Jogo HTTP indisponível'})).toHaveTextContent('Sem capa');
  expect(screen.getByRole('link',{name:'Jogo HTTP'})).toHaveAttribute('href','/jogos/12');
});
