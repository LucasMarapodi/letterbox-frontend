import type { ReactElement } from 'react';
import type { Game } from '../models';
import { Link } from 'react-router-dom';
export interface GameCardProps { game: Game; }
export function GameCard({ game }: GameCardProps): ReactElement {
  return <article className="game-card">
    {game.coverUrl
      ? <img src={game.coverUrl} alt="" className="game-cover" />
      : <div className="game-cover" role="img" aria-label={`Capa de ${game.title} indisponível`}>Sem capa</div>}
    <h3><Link to={`/jogos/${encodeURIComponent(game.id)}`}>{game.title}</Link></h3>
  </article>;
}
