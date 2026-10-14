import { useState, type ReactElement } from 'react';
import type { ReviewDetails } from '../services/communityContracts';
import { CommunityError } from '../services/communityContracts';
import { useServices } from '../services/ServiceProvider';
import { useSession } from '../session/SessionProvider';
import { ReviewTextForm } from '../components/ReviewTextForm';

function EditControl({ review, onSaved }: { review: ReviewDetails; onSaved(review: ReviewDetails): void }): ReactElement {
  const { community } = useServices();
  const { user } = useSession();
  const [success, setSuccess] = useState(false);
  return <section aria-label="Editar minha review">
    <h3>Editar minha review</h3>
    <ReviewTextForm initialText={review.text} submitLabel="Salvar review" pendingLabel="Salvando…" failureMessage="Não foi possível salvar a review. Tente novamente." errorMessage={(error) => {
      if (error instanceof CommunityError && error.code === 'forbidden') return 'Você não tem permissão para editar esta review.';
      if (error instanceof CommunityError && error.code === 'not-found') return 'Esta review não está mais disponível.';
      return 'Não foi possível salvar a review. Tente novamente.';
    }} onSubmit={async (text) => {
      if (!user) return;
      const updated = await community.editReview(review.id, text, user);
      onSaved({ ...review, ...updated }); setSuccess(true);
    }} />
    {success && <p role="status">Review atualizada.</p>}
  </section>;
}
export function EditReview(props: { review: ReviewDetails; onSaved(review: ReviewDetails): void }): ReactElement | null {
  const { user, version } = useSession();
  const { privateFeatures } = useServices();
  if ((privateFeatures?.editReview ?? privateFeatures?.opinions) === false) return null;
  return user?.id === props.review.userId ? <EditControl key={`${version}-${user.id}-${props.review.id}`} {...props} /> : null;
}

