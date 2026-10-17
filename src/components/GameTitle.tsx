import { Link } from 'react-router-dom';
import type { Game } from '../models';
import { encodeRouteId } from '../routing/encodeRouteId';
import { GameFavoriteStar } from './GameFavoriteStar';

export function GameTitle({ game, detail = false }: { game: Pick<Game, 'id' | 'title'>; detail?: boolean }) {
  return <div className="game-title-row">
    {detail ? <h2 id="game-title">{game.title}</h2> : <h3><Link to={`/jogos/${encodeRouteId(game.id)}`}>{game.title}</Link></h3>}
    <GameFavoriteStar game={game} />
  </div>;
}
