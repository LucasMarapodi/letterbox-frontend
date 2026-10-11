import { useState, type ReactElement } from 'react';
import type { ReviewDetails } from '../services/communityContracts';
import { community } from '../services/community';
import { useSession } from '../session/SessionProvider';
import { ReviewTextForm } from '../components/ReviewTextForm';

function EditControl({ review, onSaved }: { review: ReviewDetails; onSaved(review: ReviewDetails): void }): ReactElement {
  const { user } = useSession();
  const [success, setSuccess] = useState(false);
  return <section aria-label="Editar minha review">
    <h3>Editar minha review</h3>
    <ReviewTextForm initialText={review.text} submitLabel="Salvar review" pendingLabel="Salvando…" failureMessage="Não foi possível salvar a review. Tente novamente." onSubmit={async (text) => {
      if (!user) return;
      const updated = await community.editReview(review.id, text, user);
      onSaved({ ...review, ...updated }); setSuccess(true);
    }} />
    {success && <p role="status">Review atualizada.</p>}
  </section>;
}
export function EditReview(props: { review: ReviewDetails; onSaved(review: ReviewDetails): void }): ReactElement | null {
  const { user } = useSession();
  return user?.id === props.review.userId ? <EditControl key={`${user.id}-${props.review.id}`} {...props} /> : null;
}
