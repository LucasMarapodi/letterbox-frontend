import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import type { ReviewDetails } from '../services/communityContracts';
import { encodeRouteId } from '../routing/encodeRouteId';
import { Avatar } from './Avatar';
import { LastCommentTime } from './LastCommentTime';
export function CommunityReviewCard({ review, commentCount, lastCommentAt }: { review: ReviewDetails; commentCount?: number; lastCommentAt?: string }): ReactElement {
  return <article className="review-card community-review">
    <div className="feed-author"><Avatar name={review.author.displayName} src={review.author.avatarUrl} /><Link to={`/perfil/${encodeRouteId(review.author.id)}`}>{review.author.displayName}</Link><time dateTime={review.createdAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(review.createdAt))}</time></div>
    <h3><Link to={`/jogos/${encodeRouteId(review.game.id)}`}>{review.game.title}</Link></h3>
    <p className="review-text community-excerpt">{review.text}</p>
    {commentCount !== undefined && <p>{commentCount} {commentCount === 1 ? 'comentário' : 'comentários'} no período</p>}
    {lastCommentAt && <LastCommentTime value={lastCommentAt} />}
    <Link to={`/reviews/${encodeRouteId(review.id)}`}>Ler review</Link>
  </article>;
}
