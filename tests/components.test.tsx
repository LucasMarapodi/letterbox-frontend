import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { Button } from '../src/components/Button';
import { TextField } from '../src/components/TextField';
import { GameCard } from '../src/components/GameCard';
import { Avatar } from '../src/components/Avatar';
import { LoadingState, EmptyState, ErrorState } from '../src/components/Feedback';
import type { Game } from '../src/models';

const game: Game = { id: 42, igdbId: 345447, title: 'Jogo de exemplo', summary: '', coverUrl: null, genres: [], platforms: [], releaseDate: null, averageRating: null };

test('botão recebe foco e funciona por Enter e Espaço sem submeter por padrão', async () => {
  const user = userEvent.setup();
  const onClick = vi.fn<() => void>();
  render(<Button onClick={onClick}>Continuar</Button>);
  await user.tab();
  const button = screen.getByRole('button', { name: 'Continuar' });
  expect(button).toHaveFocus();
  expect(button).toHaveAttribute('type', 'button');
  await user.keyboard('{Enter}');
  await user.keyboard(' ');
  expect(onClick).toHaveBeenCalledTimes(2);
});

test('botão desabilitado não aciona a ação', async () => {
  const user = userEvent.setup();
  const onClick = vi.fn<() => void>();
  render(<Button disabled onClick={onClick}>Continuar</Button>);
  await user.click(screen.getByRole('button', { name: 'Continuar' }));
  expect(onClick).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
});

test('campo associa rótulo, recebe foco pelo rótulo e aceita texto', async () => {
  const user = userEvent.setup();
  render(<TextField label="Nome" />);
  const field = screen.getByRole('textbox', { name: 'Nome' });
  await user.click(screen.getByText('Nome'));
  expect(field).toHaveFocus();
  await user.type(field, 'Lucas');
  expect(field).toHaveValue('Lucas');
});

test('campos independentes têm rótulos associados e preservam atributos nativos', () => {
  render(<><TextField label="Primeiro" required /><TextField label="Segundo" id="segundo" disabled /></>);
  expect(screen.getByLabelText('Primeiro')).toBeRequired();
  expect(screen.getByLabelText('Segundo')).toBeDisabled();
  expect(screen.getByLabelText('Segundo')).toHaveAttribute('id', 'segundo');
  expect(screen.getByLabelText('Primeiro').id).not.toBe(screen.getByLabelText('Segundo').id);
});

test('cartão possui link acessível e codifica o ID no destino', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><GameCard game={game} /></MemoryRouter>);
  const link = screen.getByRole('link', { name: game.title });
  expect(link).toHaveAttribute('href', '/jogos/42');
  await user.tab();
  expect(link).toHaveFocus();
});

test('cartão mostra Sem capa após erro da imagem e tenta uma URL diferente', () => {
  const withCover: Game = { ...game, coverUrl: '/invalida.png' };
  const { rerender } = render(<MemoryRouter><GameCard game={withCover} /></MemoryRouter>);
  fireEvent.error(screen.getByAltText(''));
  expect(screen.getByRole('img', { name: `Capa de ${game.title} indisponível` })).toHaveTextContent('Sem capa');
  rerender(<MemoryRouter><GameCard game={{ ...withCover, coverUrl: '/nova.png' }} /></MemoryRouter>);
  expect(screen.getByAltText('')).toHaveAttribute('src', '/nova.png');
  expect(screen.queryByText('Sem capa')).not.toBeInTheDocument();
});

test('avatar sem foto apresenta alternativa acessível', () => {
  render(<Avatar name="Lucas Marapodi" />);
  expect(screen.getByRole('img', { name: 'Lucas Marapodi' })).toHaveTextContent('LM');
});

test('avatar com foto apresenta texto alternativo e fallback se a imagem falhar', () => {
  render(<Avatar name="Lucas Marapodi" src="/foto.png" />);
  const avatar = screen.getByRole('img', { name: 'Lucas Marapodi' });
  expect(avatar).toHaveAttribute('src', '/foto.png');
  fireEvent.error(avatar);
  expect(screen.getByRole('img', { name: 'Lucas Marapodi' })).toHaveTextContent('LM');
});

test('carregamento comunica o estado a tecnologias assistivas', () => {
  render(<LoadingState message="Carregando exemplo…" />);
  expect(screen.getByRole('status')).toHaveTextContent('Carregando exemplo…');
});

test('estado vazio apresenta a mensagem recebida', () => {
  render(<EmptyState message="Nenhum jogo de exemplo disponível." />);
  expect(screen.getByText('Nenhum jogo de exemplo disponível.')).toBeVisible();
});

test('erro anuncia a falha e permite tentar novamente por teclado', async () => {
  const user = userEvent.setup();
  const onRetry = vi.fn<() => void>();
  render(<ErrorState message="Falha ao carregar." onRetry={onRetry} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Falha ao carregar.');
  await user.tab();
  await user.keyboard('{Enter}');
  expect(onRetry).toHaveBeenCalledOnce();
});
