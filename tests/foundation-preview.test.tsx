import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { FoundationPreview } from '../src/pages/FoundationPreview';
import type { Game } from '../src/models';
import type { GameService } from '../src/services/contracts';

const game: Game = { id: 'game-1', title: 'Jogo fictício', summary: '', coverUrl: null, genres: [], platforms: [], releaseDate: null, averageRating: null };

function renderPreview(gameService: GameService): void {
  render(<MemoryRouter><FoundationPreview gameService={gameService} /></MemoryRouter>);
}

test('a prévia compõe cartão, avatar, campo e botão sem publicar conteúdo', async () => {
  const user = userEvent.setup();
  const gameService: GameService = { async list() { return [game]; }, async getById() { return game; } };
  renderPreview(gameService);
  expect(await screen.findByRole('link', { name: game.title })).toHaveAttribute('href', '/jogos/game-1');
  expect(screen.getByRole('img', { name: 'Visitante' })).toBeVisible();
  const field = screen.getByRole('textbox', { name: 'Texto de exemplo' });
  await user.type(field, 'Teste local');
  expect(field).toHaveValue('Teste local');
  await user.click(screen.getByRole('button', { name: 'Limpar texto' }));
  expect(field).toHaveValue('');
});

test('a leitura pendente exibe carregamento até receber o cartão', async () => {
  let resolve!: (value: Game | null) => void;
  const promise: Promise<Game | null> = new Promise((fulfill) => { resolve = fulfill; });
  const gameService: GameService = { async list() { return []; }, getById() { return promise; } };
  renderPreview(gameService);
  expect(screen.getByRole('status')).toHaveTextContent('Carregando exemplo…');
  await act(async () => { resolve(game); await promise; });
  expect(screen.getByRole('link', { name: game.title })).toBeVisible();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('ausência do jogo apresenta o estado vazio', async () => {
  const gameService: GameService = { async list() { return []; }, async getById() { return null; } };
  renderPreview(gameService);
  expect(await screen.findByText('Nenhum jogo de exemplo disponível.')).toBeVisible();
});

test('a rejeição mostra erro e a nova tentativa usa o mesmo contrato', async () => {
  const user = userEvent.setup();
  const getById = vi.fn<GameService['getById']>()
    .mockRejectedValueOnce(new Error('Falha simulada'))
    .mockResolvedValueOnce(game);
  const gameService: GameService = { async list() { return []; }, getById };
  renderPreview(gameService);
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o exemplo.');
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByRole('link', { name: game.title })).toBeVisible();
  expect(getById).toHaveBeenCalledTimes(2);
  expect(getById).toHaveBeenNthCalledWith(1, 'game-1');
  expect(getById).toHaveBeenNthCalledWith(2, 'game-1');
});
