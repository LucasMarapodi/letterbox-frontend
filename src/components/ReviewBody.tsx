import type { PublicReview } from '../services/contracts';
import { ReviewLikeButton } from './ReviewLikeButton';
import { ReviewRating } from './ReviewRating';
export function ReviewBody({ review, showLike = true, showRating = true }: { review: Pick<PublicReview, 'id' | 'title' | 'rating' | 'text' | 'likeCount' | 'author'>; showLike?: boolean; showRating?: boolean }) {
  return <>
    {review.title?.trim() && <h3 className="review-title">{review.title.trim()}</h3>}
    {showRating && <ReviewRating rating={review.rating} />}
    {review.text.trim() && <p className="review-text">{review.text}</p>}
    {showLike && <ReviewLikeButton reviewId={review.id} likeCount={review.likeCount} author={review.author.displayName} />}
  </>;
}
