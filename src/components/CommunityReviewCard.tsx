import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import type { ReviewDetails } from '../services/communityContracts';
import { encodeRouteId } from '../routing/encodeRouteId';
import { Avatar } from './Avatar';
export function CommunityReviewCard({ review }: { review: ReviewDetails }): ReactElement {
  return <article className="review-card community-review">
    <div className="feed-author"><Avatar name={review.author.displayName} src={review.author.avatarUrl} /><Link to={`/perfil/${encodeRouteId(review.author.id)}`}>{review.author.displayName}</Link><time dateTime={review.createdAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(review.createdAt))}</time></div>
    <h3><Link to={`/jogos/${encodeRouteId(review.game.id)}`}>{review.game.title}</Link></h3>
    <p className="review-text community-excerpt">{review.text}</p><Link to={`/reviews/${encodeRouteId(review.id)}`}>Ler review</Link>
  </article>;
}
