import { CatalogNotice } from './CatalogNotice';
import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../services/ServiceProvider';
import type { FavoriteLists } from '../services/communityContracts';
import { useSession } from '../session/SessionProvider';
import { encodeRouteId } from '../routing/encodeRouteId';
import { GameCover } from './GameCover';
import { EmptyState, ErrorState, LoadingState } from './Feedback';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; lists: FavoriteLists };
export function FavoritesSections(): ReactElement | null {
  const { community } = useServices();
  const { user } = useSession();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (user) {
      setState({ status: 'loading' });
      void community.getFavorites(user).then((lists) => { if (active) setState({ status: 'ready', lists }); }, () => { if (active) setState({ status: 'error' }); });
    }
    return () => { active = false; };
  }, [user, attempt]);
  if (!user) return null;
  if (state.status === 'loading') return <LoadingState region="Favoritos" message="Carregando favoritos…" />;
  if (state.status === 'error') return <ErrorState region="Favoritos" message="Não foi possível carregar os favoritos." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />;
  return <div className="favorites-sections" role="region" aria-label="Favoritos" aria-busy={false}>
    <CatalogNotice paths={[[ 'favorites' ]]} onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />
    <section className="favorite-games-section" aria-label="Jogos favoritos"><h2>Jogos favoritos</h2>
      {state.lists.games.length ? <ul className="favorite-games-list" aria-label="Jogos favoritos">{state.lists.games.map((game) => <li className="favorite-game" key={game.id}>
        <GameCover title={game.title} src={game.coverUrl} />
        <div className="favorite-game-copy"><h3><Link to={`/jogos/${encodeRouteId(game.id)}`}>{game.title}</Link></h3><p>{game.summary.trim() || 'Resumo não informado.'}</p></div>
      </li>)}</ul> : <EmptyState message="Nenhum jogo favorito." />}
    </section>
    {state.lists.reviews.length > 0 && <section aria-label="Reviews favoritas"><h2>Reviews favoritas</h2>
      {state.lists.reviews.map((review) => <article className="review-card" key={review.id}><Link to={`/reviews/${encodeRouteId(review.id)}`}>Review de {review.author.displayName}: {review.game.title}</Link><p className="review-text">{review.text}</p></article>)}
    </section>}
  </div>;
}
