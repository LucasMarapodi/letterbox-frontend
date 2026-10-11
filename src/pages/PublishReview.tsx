import { useEffect, useRef, useState, type ReactElement, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Review } from '../models';
import { community } from '../services/community';
import { CommunityError } from '../services/communityContracts';
import { useSession } from '../session/SessionProvider';
import { encodeRouteId } from '../routing/encodeRouteId';
import { Button } from '../components/Button';

function PublishControl({ gameId, onSaved }: { gameId: string; onSaved(): void }): ReactElement {
  const { user } = useSession();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const sending = useRef(false);
  useEffect(() => {
    let active = true;
    if (user) void community.findOwnReview(gameId, user).then((own) => { if (active) { setReview(own); setLoading(false); } }, () => { if (active) { setError('Não foi possível verificar sua review.'); setLoading(false); } });
    return () => { active = false; };
  }, [gameId, user]);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user || sending.current) return;
    if (!text.trim()) { setError('Escreva sua review.'); return; }
    sending.current = true; setPending(true); setError('');
    try { setReview(await community.publish(gameId, text, user)); setSuccess(true); onSaved(); }
    catch (failure: unknown) {
      if (failure instanceof CommunityError && failure.code === 'duplicate-review') {
        setError('Você já tem uma review para este jogo.');
        try { setReview(await community.findOwnReview(gameId, user)); } catch { /* O texto permanece para nova tentativa. */ }
      } else setError('Não foi possível publicar a review. Tente novamente.');
    } finally { sending.current = false; setPending(false); }
  }
  if (loading) return <p role="status">Verificando sua review…</p>;
  return <section className="review-card" aria-label="Publicar review">
    {success && <p role="status">Review publicada.</p>}
    {error && <p role="alert">{error}</p>}
    {review ? <Link to={`/reviews/${encodeRouteId(review.id)}`}>Editar minha review</Link> : <form onSubmit={submit}>
      <label htmlFor="review-text">Sua review</label>
      <textarea id="review-text" value={text} disabled={pending} onChange={(event) => setText(event.target.value)} />
      <Button type="submit" disabled={pending}>{pending ? 'Publicando…' : 'Publicar review'}</Button>
    </form>}
  </section>;
}
export function PublishReview(props: { gameId: string; onSaved(): void }): ReactElement | null {
  const { user } = useSession();
  return user ? <PublishControl key={user.id} {...props} /> : null;
}
