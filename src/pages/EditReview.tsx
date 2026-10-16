import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { ReviewDetails } from '../services/communityContracts';
import { CommunityError } from '../services/communityContracts';
import { useServices } from '../services/ServiceProvider';
import { useSession } from '../session/SessionProvider';
import { RatedReviewForm } from '../components/RatedReviewForm';
import { Button } from '../components/Button';

function EditControl({ review, onSaved }: { review: ReviewDetails; onSaved(review: ReviewDetails): void }): ReactElement {
  const { community } = useServices();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  return <section aria-label="Editar minha review">
    {open ? <RatedReviewForm initialText={review.text} initialRating={review.rating} submitLabel="Salvar review" pendingLabel="Salvando…" failureMessage="Não foi possível salvar a review. Tente novamente." onCancel={() => setOpen(false)} errorMessage={error => {
      if (error instanceof CommunityError && error.code === 'forbidden') return 'Você não tem permissão para editar esta review.';
      if (error instanceof CommunityError && error.code === 'not-found') return 'Esta review não está mais disponível.';
      return 'Não foi possível salvar a review. Tente novamente.';
    }} onSubmit={async input => {
      if (!user) return;
      setSuccess(false);
      const updated = await community.editReview(review.id, input, user);
      if (!alive.current) return;
      onSaved({ ...review, ...updated }); setOpen(false); setSuccess(true);
    }} /> : <Button onClick={() => { setSuccess(false); setOpen(true); }}>Editar minha review</Button>}
    {success && <p role="status">Review atualizada.</p>}
  </section>;
}
export function EditReview(props: { review: ReviewDetails; onSaved(review: ReviewDetails): void }): ReactElement | null {
  const { user, version } = useSession();
  const { privateFeatures } = useServices();
  if ((privateFeatures?.editReview ?? privateFeatures?.opinions) === false) return null;
  return user?.id === props.review.userId ? <EditControl key={`${version}-${user.id}-${props.review.id}`} {...props} /> : null;
}
