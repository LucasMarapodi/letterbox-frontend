import { useState, type ReactElement } from 'react';
import { ReviewTextForm } from '../components/ReviewTextForm';
import { useSession } from '../session/SessionProvider';
import { RequireSession } from '../session/RequireSession';
import { useServices } from '../services/ServiceProvider';
import { CommunityError } from '../services/communityContracts';

interface CommentFormProps { reviewId: string; authorId: number; onSaved(): void; }
function CommentControl({ reviewId, onSaved }: CommentFormProps): ReactElement {
  const { community } = useServices();
  const { user } = useSession();
  const [version, setVersion] = useState(0);
  const [success, setSuccess] = useState(false);
  return <section aria-label="Comentar review">
    <ReviewTextForm key={version} label="Seu comentário" emptyMessage="Escreva seu comentário." submitLabel="Publicar comentário" pendingLabel="Publicando…" failureMessage="Não foi possível publicar o comentário. Tente novamente." errorMessage={(error) => {
      if (error instanceof CommunityError && error.code === 'empty-text') return 'Seu comentário não foi aceito. Verifique o texto.';
      if (error instanceof CommunityError && error.code === 'not-found') return 'Esta review não está mais disponível.';
      return 'Não foi possível publicar o comentário. Tente novamente.';
    }} onSubmit={async (text) => {
      if (!user) return;
      setSuccess(false);
      await community.comment(reviewId, text, user);
      setSuccess(true); setVersion((value) => value + 1); onSaved();
    }} />
    {success && <p role="status">Comentário publicado.</p>}
  </section>;
}
export function CommentForm(props: CommentFormProps): ReactElement | null {
  const { user, version } = useSession();
  const { privateFeatures } = useServices();
  if ((privateFeatures?.comments ?? privateFeatures?.opinions) === false) return null;
  if (user?.id === props.authorId) return null;
  return <RequireSession><CommentControl key={`${version}-${user?.id}-${props.reviewId}`} {...props} /></RequireSession>;
}
