import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import type { Review } from '../models';
import { community } from '../services/community';
import { CommunityError } from '../services/communityContracts';
import { useSession } from '../session/SessionProvider';
import { encodeRouteId } from '../routing/encodeRouteId';
import { ReviewTextForm } from '../components/ReviewTextForm';

function PublishControl({ gameId, onSaved }: { gameId: string; onSaved(): void }): ReactElement {
  const { user } = useSession();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    let active = true;
    if (user) void community.findOwnReview(gameId, user).then((own) => { if (active) { setReview(own); setLoading(false); } }, () => { if (active) { setError('Não foi possível verificar sua review.'); setLoading(false); } });
    return () => { active = false; };
  }, [gameId, user]);
  async function submit(text: string): Promise<void> {
    if (!user) return;
    setError('');
    try { setReview(await community.publish(gameId, text, user)); setSuccess(true); onSaved(); }
    catch (failure: unknown) {
      if (failure instanceof CommunityError && failure.code === 'duplicate-review') {
        setError('Você já tem uma review para este jogo.');
        try { setReview(await community.findOwnReview(gameId, user)); } catch { /* O texto permanece para nova tentativa. */ }
      } else throw failure;
    }
  }
  if (loading) return <p role="status">Verificando sua review…</p>;
  return <section className="review-card" aria-label="Publicar review">
    {success && <p role="status">Review publicada.</p>}
    {error && <p role="alert">{error}</p>}
    {review ? <Link to={`/reviews/${encodeRouteId(review.id)}`}>Editar minha review</Link> : <ReviewTextForm submitLabel="Publicar review" pendingLabel="Publicando…" failureMessage="Não foi possível publicar a review. Tente novamente." onSubmit={submit} />}
  </section>;
}
export function PublishReview(props: { gameId: string; onSaved(): void }): ReactElement | null {
  const { user } = useSession();
  return user ? <PublishControl key={user.id} {...props} /> : null;
}
