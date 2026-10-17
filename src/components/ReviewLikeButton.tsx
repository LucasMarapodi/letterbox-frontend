import { useEffect } from 'react';
import { ThumbUpIcon } from './ThumbUpIcon';
import { Button } from './Button';
import { useReviewLikes } from './ReviewLikesProvider';

export function ReviewLikeButton({ reviewId, likeCount, author }: { reviewId: number; likeCount: number; author: string }) {
  const likes = useReviewLikes();
  const load = likes?.load;
  useEffect(() => { if (load) void load(reviewId, likeCount); }, [load, reviewId, likeCount]);
  const state = likes?.entries.get(reviewId);
  const count = state?.likeCount ?? likeCount;
  return <span className="review-like-action">
    <span className="review-like-count" aria-live="polite" aria-atomic="true">{count} {count === 1 ? 'curtida' : 'curtidas'}</span>
    {likes?.enabled && likes.authenticated && (state?.status === 'error' ? <>
      <Button aria-label={`Tentar novamente curtida da review de ${author}`} onClick={() => { void load?.(reviewId, likeCount, true); }}>Consultar novamente</Button><span role="status">{state.message} Última contagem confirmada.</span>
    </> : <Button aria-label={state?.status === 'ready' ? state.likedByMe ? `Retirar curtida da review de ${author}` : `Curtir review de ${author}` : `Carregando curtida da review de ${author}`} aria-pressed={state?.status === 'ready' ? state.likedByMe ?? undefined : undefined} disabled={state?.status !== 'ready' || state.pending} aria-busy={state?.status !== 'ready' || state.pending} onClick={() => { void likes.toggle(reviewId); }}><ThumbUpIcon /></Button>)}
  </span>;
}
