import { Link } from 'react-router-dom';
import type { ReviewDetails } from '../services/communityContracts';
import { encodeRouteId } from '../routing/encodeRouteId';
import { GameCover } from './GameCover';

export function ReviewGame({ game }: Pick<ReviewDetails, 'game'>) {
  return <Link className="review-game" to={`/jogos/${encodeRouteId(game.id)}`} aria-label={game.title}>
    <GameCover title={game.title} src={game.coverUrl ?? null} className="review-game-cover" />
    <span>{game.title}</span>
  </Link>;
}
