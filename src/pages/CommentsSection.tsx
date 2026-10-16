import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../services/ServiceProvider';
import type { PublicComment } from '../services/communityContracts';
import { encodeRouteId } from '../routing/encodeRouteId';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { CommentLikeButton } from '../components/CommentLikeButton';

type CommentsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; comments: PublicComment[] };
export function CommentsSection({ reviewId }: { reviewId: number }): ReactElement {
  const { community } = useServices();
  const [state, setState] = useState<CommentsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void community.getComments(reviewId).then((comments) => { if (active) setState({ status: 'ready', comments }); }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [reviewId, attempt]);
  return <section aria-label="Comentários" aria-busy={state.status === 'loading'}>
    <h3>Comentários</h3>
    {state.status === 'loading' && <LoadingState message="Carregando comentários…" />}
    {state.status === 'error' && <ErrorState message="Não foi possível carregar os comentários." onRetry={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }} />}
    {state.status === 'ready' && (state.comments.length ? <ul className="comments-list" aria-label="Comentários da review">{state.comments.map((comment) => <li key={comment.id} className={`review-card${comment.parentCommentId === null ? '' : ' comment-reply'}`}>
      {comment.parentCommentId !== null && <p className="comment-parent">Resposta ao comentário #{comment.parentCommentId}</p>}
      <Link to={`/perfil/${encodeRouteId(comment.author.id)}`}>{comment.author.displayName}</Link>
      <p><time dateTime={comment.createdAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(comment.createdAt))}</time></p>
      <p className="review-text">{comment.text}</p>
      <CommentLikeButton comment={comment} />
    </li>)}</ul> : <EmptyState message="Nenhum comentário nesta review." />)}
  </section>;
}
