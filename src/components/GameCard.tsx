import type { ReactElement } from 'react';
import type { Game } from '../models';
import { Link } from 'react-router-dom';
import { encodeRouteId } from '../routing/encodeRouteId';
import { GameCover } from './GameCover';
import { LastCommentTime } from './LastCommentTime';
export interface GameCardProps { game: Game; commentCount?: number; lastCommentAt?: string; }
export function GameCard({ game, commentCount, lastCommentAt }: GameCardProps): ReactElement {
  return <article className="game-card">
    <GameCover title={game.title} src={game.coverUrl} decorative />
    <h3><Link to={`/jogos/${encodeRouteId(game.id)}`}>{game.title}</Link></h3>
    {commentCount !== undefined && <p>{commentCount} {commentCount === 1 ? 'comentário' : 'comentários'} no período</p>}
    {lastCommentAt && <LastCommentTime value={lastCommentAt} />}
  </article>;
}
