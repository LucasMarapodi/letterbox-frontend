import type { PublicReview } from '../services/contracts';
import { ReviewLikeButton } from './ReviewLikeButton';
export function ReviewBody({ review, showLike = true }: { review: Pick<PublicReview, 'id' | 'title' | 'rating' | 'text' | 'likeCount' | 'author'>; showLike?: boolean }) {
  return <>
    {review.title?.trim() && <h3 className="review-title">{review.title.trim()}</h3>}
    {review.rating === null ? <p>Nota não informada (review antiga).</p> : <p className="review-rating"><span className="review-stars" aria-hidden="true" style={{ backgroundImage: `linear-gradient(to right, #67daa3 ${review.rating * 20}%, #71817c ${review.rating * 20}%)` }}>★★★★★</span><span>Nota: {review.rating} de 5</span></p>}
    {review.text.trim() && <p className="review-text">{review.text}</p>}
    {showLike && <ReviewLikeButton reviewId={review.id} likeCount={review.likeCount} author={review.author.displayName} />}
  </>;
}
