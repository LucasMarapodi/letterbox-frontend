import { CatalogNotice } from './CatalogNotice';
import { useEffect, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../session/SessionProvider';
import { encodeRouteId } from '../routing/encodeRouteId';
import { GameCover } from './GameCover';
import { EmptyState, ErrorState, LoadingState } from './Feedback';
import { useFavorites } from './FavoritesProvider';
import { ReviewFavoriteStar } from './ReviewFavoriteStar';

export function FavoritesSections(): ReactElement | null {
  const { user } = useSession();
  const favorites = useFavorites();
  const load = favorites?.load;
  useEffect(() => { if (load) void load(); }, [load]);
  if (!user || !favorites) return null;
  const { state } = favorites;
  if (state.status === 'error') return <ErrorState region="Favoritos" message="Não foi possível carregar os favoritos." onRetry={() => { void favorites.load(true); }} />;
  if (!state.lists) return <LoadingState region="Favoritos" message="Carregando favoritos…" />;
  return <div className="favorites-sections" role="region" aria-label="Favoritos" aria-busy={false}>
    <CatalogNotice paths={[[ 'favorites' ]]} onRetry={() => { void favorites.load(true); }} />
    <section className="favorite-games-section" aria-label="Jogos favoritos"><h2>Jogos favoritos</h2>
      {state.lists.games.length ? <ul className="favorite-games-list" aria-label="Jogos favoritos">{state.lists.games.map((game) => <li className="favorite-game" key={game.id}>
        <GameCover title={game.title} src={game.coverUrl} />
        <div className="favorite-game-copy"><h3><Link to={`/jogos/${encodeRouteId(game.id)}`}>{game.title}</Link></h3><p>{game.summary.trim() || 'Resumo não informado.'}</p></div>
      </li>)}</ul> : <EmptyState message="Nenhum jogo favorito." />}
    </section>
    {state.lists.reviews.length > 0 && <section aria-label="Reviews favoritas"><h2>Reviews favoritas</h2>
      {state.lists.reviews.map((review) => <article className="review-card" key={review.id}><Link to={`/reviews/${encodeRouteId(review.id)}`}>Review de {review.author.displayName}: {review.game.title}</Link><p className="review-text">{review.text}</p><ReviewFavoriteStar reviewId={review.id} author={review.author.displayName} /></article>)}
    </section>}
  </div>;
}
