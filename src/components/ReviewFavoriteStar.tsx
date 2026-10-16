import { useEffect } from 'react';

import { Button } from './Button';
import { useFavorites } from './FavoritesProvider';

export function ReviewFavoriteStar({ reviewId, author }: { reviewId: number; author: string }) {
  const favorites = useFavorites();
  const load = favorites?.load;
  useEffect(() => { if (load) void load(); }, [load]);
  if (!favorites || !favorites.enabled) return null;
  if (!favorites.authenticated) return null;
  if (favorites.state.status === 'error') return <span className="review-favorite-action"><Button className="review-favorite-star" aria-label={`Tentar novamente favoritos da review de ${author}`} onClick={() => { void favorites.load(true); }}>↻</Button><span role="alert">Favoritos indisponíveis.</span></span>;
  if (favorites.state.status === 'loading') return <Button className="review-favorite-star" disabled aria-busy="true" aria-label={`Carregando favorito da review de ${author}`}>…</Button>;
  const selected = favorites.selected.has(reviewId);
  return <span className="review-favorite-action">
    <Button className="review-favorite-star" aria-pressed={selected} aria-label={selected ? `Remover review de ${author} dos favoritos` : `Favoritar review de ${author}`} disabled={favorites.pending.has(reviewId)} onClick={() => { void favorites.toggleReview(reviewId); }}><span aria-hidden="true">{selected ? '★' : '☆'}</span></Button>
    {favorites.errors[reviewId] && <span role="alert">{favorites.errors[reviewId]}</span>}
  </span>;
}
