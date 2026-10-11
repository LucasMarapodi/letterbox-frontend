import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { community } from '../services/community';
import type { PublicComment } from '../services/communityContracts';
import { encodeRouteId } from '../routing/encodeRouteId';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';

type CommentsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; comments: PublicComment[] };
export function CommentsSection({ reviewId }: { reviewId: string }): ReactElement {
  const [state, setState] = useState<CommentsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void community.getComments(reviewId).then((comments) => { if (active) setState({ status: 'ready', comments }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [reviewId, attempt]);
  return <section aria-label="Comentários">
    <h3>Comentários</h3>
    {state.status === 'loading' && <LoadingState message="Carregando comentários…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar os comentários." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />}
    {state.status === 'ready' && (state.comments.length ? <ul className="comments-list" aria-label="Comentários da review">{state.comments.map((comment) => <li key={comment.id} className="review-card">
      <Link to={`/perfil/${encodeRouteId(comment.author.id)}`}>{comment.author.displayName}</Link>
      <p><time dateTime={comment.createdAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(comment.createdAt))}</time></p>
      <p className="review-text">{comment.text}</p>
    </li>)}</ul> : <EmptyState message="Nenhum comentário nesta review." />)}
  </section>;
}
