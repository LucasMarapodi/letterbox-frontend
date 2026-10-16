import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import type { Review } from '../models';
import { useServices } from '../services/ServiceProvider';
import { CommunityError, type ReviewInput } from '../services/communityContracts';
import { useSession } from '../session/SessionProvider';
import { RatedReviewForm } from '../components/RatedReviewForm';
import { Button } from '../components/Button';
import { ErrorState, LoadingState, QueryRegion } from '../components/Feedback';

function PublishControl({ gameId, onSaved }: { gameId: number; onSaved(): void }): ReactElement {
  const { community } = useServices();
  const { user } = useSession();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError(false);
    if (user) void community.findOwnReview(gameId, user).then(own => { if (active) { setReview(own); setLoading(false); } }, () => { if (active) { setLoadError(true); setLoading(false); } });
    return () => { active = false; };
  }, [gameId, user, attempt, community]);
  async function submit(input: ReviewInput): Promise<void> {
    if (!user) return;
    setError(''); setSuccess('');
    try {
      const saved = review ? await community.editReview(review.id, input, user) : await community.publish(gameId, input, user);
      if (!alive.current) return;
      setSuccess(review ? 'Review atualizada.' : 'Review publicada.'); setReview(saved); setOpen(false); setAttempt(value => value + 1); onSaved();
    } catch (failure: unknown) {
      if (!alive.current) return;
      if (failure instanceof CommunityError && failure.code === 'duplicate-review') {
        setError('Você já tem uma review para este jogo.');
        const own = await community.findOwnReview(gameId, user);
        if (alive.current && own) { setReview(own); setOpen(false); onSaved(); }
      } else throw failure;
    }
  }
  if (loading) return <LoadingState region="Consulta da sua review" message="Verificando sua review…" />;
  if (loadError) return <ErrorState region="Consulta da sua review" message="Não foi possível verificar sua review." onRetry={() => { setLoading(true); setAttempt(value => value + 1); }} />;
  return <QueryRegion label="Consulta da sua review" busy={false}><section className="review-card" aria-label="Sua review">
    {success && <p role="status">{success}</p>}
    {error && <p role="alert">{error}</p>}
    {open ? <RatedReviewForm initialText={review?.text} initialRating={review?.rating} submitLabel={review ? 'Salvar review' : 'Publicar review'} pendingLabel={review ? 'Salvando…' : 'Publicando…'} failureMessage={review ? 'Não foi possível salvar a review. Tente novamente.' : 'Não foi possível publicar a review. Tente novamente.'} onSubmit={submit} onCancel={() => setOpen(false)} /> : <Button onClick={() => { setSuccess(''); setError(''); setOpen(true); }}>{review ? 'Editar minha review' : 'Criar review'}</Button>}
  </section></QueryRegion>;
}
export function PublishReview(props: { gameId: number; onSaved(): void }): ReactElement | null {
  const { user, version } = useSession();
  const { privateFeatures } = useServices();
  const [invitation, setInvitation] = useState(false);
  if ((privateFeatures?.publishReview ?? privateFeatures?.opinions) === false) return null;
  return user ? <PublishControl key={`${version}-${user.id}-${props.gameId}`} {...props} /> : <section aria-label="Sua review"><Button onClick={() => setInvitation(true)}>Criar review</Button>{invitation && <p><Link to="/login">Entrar para criar review</Link></p>}</section>;
}
