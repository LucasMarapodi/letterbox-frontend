import { useState, type ReactElement } from 'react';
import { ReviewTextForm } from '../components/ReviewTextForm';
import { useSession } from '../session/SessionProvider';
import { RequireSession } from '../session/RequireSession';
import { community } from '../services/community';

interface CommentFormProps { reviewId: string; authorId: string; onSaved(): void; }
function CommentControl({ reviewId, onSaved }: CommentFormProps): ReactElement {
  const { user } = useSession();
  const [version, setVersion] = useState(0);
  const [success, setSuccess] = useState(false);
  return <section aria-label="Comentar review">
    <ReviewTextForm key={version} label="Seu comentário" emptyMessage="Escreva seu comentário." submitLabel="Publicar comentário" pendingLabel="Publicando…" failureMessage="Não foi possível publicar o comentário. Tente novamente." onSubmit={async (text) => {
      if (!user) return;
      await community.comment(reviewId, text, user);
      setSuccess(true); setVersion((value) => value + 1); onSaved();
    }} />
    {success && <p role="status">Comentário publicado.</p>}
  </section>;
}
export function CommentForm(props: CommentFormProps): ReactElement | null {
  const { user } = useSession();
  if (user?.id === props.authorId) return null;
  return <RequireSession><CommentControl key={`${user?.id}-${props.reviewId}`} {...props} /></RequireSession>;
}
