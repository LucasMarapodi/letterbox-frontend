import { ProfilePagination, useProfilePage } from './ProfilePagination';
import { ReviewBody } from './ReviewBody';
import { ReviewCardLink } from './ReviewCardLink';
import { ReviewAuthor } from './ReviewAuthor';
import { ReviewGame } from './ReviewGame';
import { useEffect, type ReactElement } from 'react';
import { GameTitle } from './GameTitle';
import { useSession } from '../session/SessionProvider';
import { GameCover } from './GameCover';
import { EmptyState, ErrorState, LoadingState } from './Feedback';
import { useFavorites } from './FavoritesProvider';
import { ReviewFavoriteStar } from './ReviewFavoriteStar';

export function FavoritesSections({ section = 'all' }: { section?: 'all' | 'games' | 'reviews' }): ReactElement | null {
  const { user } = useSession();
  const favorites = useFavorites();
  const games = useProfilePage(favorites?.state.lists?.games ?? [], 3);
  const reviews = useProfilePage(favorites?.state.lists?.reviews ?? [], 2);
  const load = favorites?.load;
  useEffect(() => { if (load) void load(); }, [load]);
  if (!user || !favorites) return null;
  const { state } = favorites;
  if (state.status === 'error') return section === 'reviews' ? null : <ErrorState region="Favoritos" message="Não foi possível carregar os favoritos." onRetry={() => { void favorites.load(true); }} />;
  if (!state.lists) return section === 'reviews' ? null : <LoadingState region="Favoritos" message="Carregando favoritos…" />;
  if (section === 'reviews' && !state.lists.reviews.length) return null;
  return <div className="favorites-sections" role={section === 'reviews' ? undefined : 'region'} aria-label={section === 'reviews' ? undefined : 'Favoritos'} aria-busy={false}>
    {section !== 'reviews' && <section className="favorite-games-section" aria-label="Jogos favoritos"><h2>Jogos favoritos</h2>
      {state.lists.games.length ? <ul className="favorite-games-list" aria-label="Jogos favoritos">{games.items.map((game) => <li className="favorite-game" key={game.id}>
        <GameCover title={game.title} src={game.coverUrl} />
        <div className="favorite-game-copy"><GameTitle game={game} /><p>{game.summary.trim() || 'Resumo não informado.'}</p></div>
      </li>)}</ul> : <EmptyState message="Nenhum jogo favorito." />}
      <ProfilePagination label="jogos favoritos" {...games} />
    </section>}
    {section !== 'games' && state.lists.reviews.length > 0 && <section aria-label="Reviews favoritas"><h2>Reviews favoritas</h2>
      {reviews.items.map((review) => <article className="review-card review-preview" key={review.id}><ReviewAuthor author={review.author} /><h3><ReviewGame game={review.game} /></h3><ReviewCardLink id={review.id} label={`Review de ${review.author.displayName}: ${review.game.title}`} /><ReviewBody review={review} /><ReviewFavoriteStar reviewId={review.id} author={review.author.displayName} /></article>)}
      <ProfilePagination label="reviews favoritas" {...reviews} />
    </section>}
  </div>;
}
