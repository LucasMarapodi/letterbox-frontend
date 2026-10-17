import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Game } from '../models';
import { Button } from './Button';
import { useFavorites } from './FavoritesProvider';

export function GameFavoriteStar({ game }: { game: Pick<Game, 'id' | 'title'> }) {
  const favorites = useFavorites();
  const navigate = useNavigate();
  const load = favorites?.load;
  useEffect(() => { if (load) void load(); }, [load]);
  if (!favorites?.enabled) return null;
  if (!favorites.authenticated) return <Button className="game-favorite-star" aria-label={`Favoritar jogo ${game.title}`} title="Entre para salvar nos favoritos" onClick={() => navigate('/login')}><span aria-hidden="true">☆</span></Button>;
  if (favorites.state.status === 'loading') return <Button className="game-favorite-star" disabled aria-busy="true" aria-label={`Carregando favorito do jogo ${game.title}`}>…</Button>;
  if (favorites.state.status === 'error') return <><Button className="game-favorite-star" aria-label={`Tentar novamente favoritos do jogo ${game.title}`} title="Tentar novamente favoritos" onClick={() => { void favorites.load(true); }}>↻</Button><span className="game-favorite-error" role="alert">Favoritos indisponíveis.</span></>;
  const selected = favorites.selectedGames.has(game.id);
  const label = selected ? `Remover jogo ${game.title} dos favoritos` : `Favoritar jogo ${game.title}`;
  return <>
    <Button className="game-favorite-star" aria-pressed={selected} aria-label={label} title={label} disabled={favorites.pendingGames.has(game.id)} onClick={() => { void favorites.toggleGame(game.id); }}><span aria-hidden="true">{selected ? '★' : '☆'}</span></Button>
    {favorites.gameErrors[game.id] && <span className="game-favorite-error" role="alert">{favorites.gameErrors[game.id]}</span>}
  </>;
}
