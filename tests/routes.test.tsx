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
test('navegação não oferece página de notificações', () => {
  render(<MemoryRouter><AppRoutes /></MemoryRouter>);
  expect(screen.queryByRole('link', { name: 'Notificações' })).not.toBeInTheDocument();
});
test('URL antiga de notificações é tratada como inexistente', () => {
  render(<MemoryRouter initialEntries={['/notificacoes']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
});
const parameterCases: ParameterCase[] = [
  { path: '/jogos/42', value: 'ID do jogo: 42' },
  { path: '/reviews/review-42', value: 'ID da review: review-42' },
  { path: '/perfil/42', value: 'ID do usuário: 42' },
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

const opaqueIds: string[] = ['game%2F42', 'game/42', 'game%2f42', 'game%252F42', 'game%42', 'jogo ç?#42', '.', '..', '~.', '~..', '%2E', '%2E%2E'];

test.each(opaqueIds)('rota de jogo rejeita identificador legado %s', id => {
  render(<MemoryRouter initialEntries={['/jogos/' + encodeURIComponent(id)]}><AppRoutes /></MemoryRouter>);
  expect(screen.getByText('Jogo não encontrado.')).toBeVisible();
});

interface OpaqueRouteCase { prefix: string; label: string; }
const opaqueRoutes: OpaqueRouteCase[] = [
  { prefix: '/reviews', label: 'ID da review' },
];

test.each(opaqueRoutes)('preserva percentuais literais ao abrir diretamente $prefix', ({ prefix, label }) => {
  render(<MemoryRouter initialEntries={[`${prefix}/item%252F42/`]}><AppRoutes /></MemoryRouter>);
  expect(screen.getByText(`${label}: item%2F42`)).toBeVisible();
});
