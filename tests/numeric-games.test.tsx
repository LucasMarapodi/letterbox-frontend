import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AppRoutes } from '../src/App';
import { createDefaultApplicationServices } from '../src/services/runtime';
import { decodeGame, decodeReview, decodeRating, decodeFavorite } from '../src/services/http/decoders';
import { wireGame, wireReview, wireRating, wireFavorite } from './http-fixtures';

test('jogo local e igdbId permanecem numéricos e distintos das referências de review/nota', () => {
  expect(decodeGame({ ...wireGame, id: 12, igdbId: 345447 })).toMatchObject({ id: 12, igdbId: 345447 });
  expect(decodeReview({ ...wireReview, gameId: 12, game: { ...wireReview.game, id: 12 } })).toMatchObject({ gameId: 12, game: { id: 12 } });
  expect(decodeRating({ ...wireRating, gameId: 12 }).gameId).toBe(12);
  expect(decodeFavorite({ ...wireFavorite, targetType: 'game', targetId: '12' }).targetId).toBe(12);
});
test.each([0, -1, 1.5, 2_147_483_648, '12', 'igdb-12'])('ID local inválido %j não é convertido para jogo', id => {
  expect(() => decodeGame({ ...wireGame, id, igdbId: 345447 })).toThrow();
});
test.each([undefined, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '345447'])('igdbId inválido %j é rejeitado', igdbId => {
  expect(() => decodeGame({ ...wireGame, id: 12, igdbId })).toThrow();
});
test.each(['userId', 'gameId'] as const)('URLs %s inválidas não fazem consultas HTTP', parameter => {
  const transport = vi.fn().mockRejectedValue(new Error('Não deveria consultar'));
  const adapters = createDefaultApplicationServices({ apiBaseUrl: 'http://localhost:5080' }, { transport });
  render(<MemoryRouter initialEntries={[parameter === 'userId' ? '/perfil/01' : '/jogos/igdb-12']}><AppRoutes adapters={adapters} /></MemoryRouter>);
  expect(screen.getByText(parameter === 'userId' ? 'Perfil não encontrado.' : 'Jogo não encontrado.')).toBeVisible();
  expect(transport).not.toHaveBeenCalled();
});
