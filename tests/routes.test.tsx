import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { AppRoutes } from '../src/App';

interface NavigationCase { link: string; heading: string; }
const navigationCases: NavigationCase[] = [
  { link: 'Jogo de exemplo', heading: 'Detalhes do jogo' },
  { link: 'Review de exemplo', heading: 'Review' },
  { link: 'Perfil de exemplo', heading: 'Perfil público' },
  { link: 'Entrar', heading: 'Entrar' },
  { link: 'Criar conta', heading: 'Criar conta' },
  { link: 'Notificações', heading: 'Notificações' },
];

test.each(navigationCases)('o link $link navega para $heading e permite voltar', async ({ link, heading }) => {
  const user = userEvent.setup();
  render(<MemoryRouter><AppRoutes /></MemoryRouter>);
  await user.click(screen.getByRole('link', { name: link }));
  expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
  await user.click(screen.getByRole('link', { name: 'Início' }));
  expect(screen.getByRole('heading', { name: 'Game Reviews', level: 1 })).toBeVisible();
});

interface ParameterCase { path: string; value: string; }
const parameterCases: ParameterCase[] = [
  { path: '/jogos/jogo-42', value: 'ID do jogo: jogo-42' },
  { path: '/reviews/review-42', value: 'ID da review: review-42' },
  { path: '/perfil/usuario-42', value: 'ID do usuário: usuario-42' },
];

test.each(parameterCases)('disponibiliza o parâmetro de $path', ({ path, value }) => {
  render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);
  expect(screen.getByText(value)).toBeVisible();
});

test('uma URL desconhecida apresenta mensagem e caminho de retorno', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/nao-existe']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await user.click(screen.getByRole('link', { name: 'Início' }));
  expect(screen.getByRole('heading', { name: 'Game Reviews' })).toBeVisible();
});
