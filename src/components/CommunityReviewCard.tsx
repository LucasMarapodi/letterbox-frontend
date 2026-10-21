import { ReviewBody } from './ReviewBody';
import { ReviewCardLink } from './ReviewCardLink';
import { ReviewGame } from './ReviewGame';
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import type { ReviewDetails } from '../services/communityContracts';
import { encodeRouteId } from '../routing/encodeRouteId';
import { Avatar } from './Avatar';
import { LastCommentTime } from './LastCommentTime';
import { ReviewFavoriteStar } from './ReviewFavoriteStar';
import { CommunityCommentPreview } from './CommunityCommentPreview';
export function CommunityReviewCard({ review, commentCount, lastCommentAt, periodLikeCount, lastLikeAt }: { review: ReviewDetails; commentCount?: number; lastCommentAt?: string; periodLikeCount?: number; lastLikeAt?: string }): ReactElement {
  return <article className="review-card review-preview community-review">
    <div className="feed-author"><Avatar name={review.author.displayName} src={review.author.avatarUrl} /><Link to={`/perfil/${encodeRouteId(review.author.id)}`}>{review.author.displayName}</Link><time dateTime={review.createdAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(review.createdAt))}</time></div>
    <h3><ReviewGame game={review.game} /></h3>
    <ReviewBody review={review} />
    {periodLikeCount !== undefined && <p>{periodLikeCount} {periodLikeCount === 1 ? 'curtida' : 'curtidas'} no período</p>}
    {lastLikeAt && <p>Última curtida no período: <time dateTime={lastLikeAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' }).format(new Date(lastLikeAt))} (UTC)</time></p>}
    {commentCount !== undefined && <p>{commentCount} {commentCount === 1 ? 'comentário' : 'comentários'} no período</p>}
    {lastCommentAt && <LastCommentTime value={lastCommentAt} />}
    {commentCount !== undefined && commentCount > 0 && <CommunityCommentPreview key={review.id} reviewId={review.id} />}
    <ReviewCardLink id={review.id} label="Ler review" />
    <ReviewFavoriteStar reviewId={review.id} author={review.author.displayName} />
  </article>;
}
