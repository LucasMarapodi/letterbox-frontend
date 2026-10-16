import type { Review } from '../models';
export function ReviewBody({ review }: { review: Pick<Review, 'rating' | 'text'> }) {
  return <>
    {review.rating === null ? <p>Nota não informada (review antiga).</p> : <p className="review-rating"><span className="review-stars" aria-hidden="true" style={{ backgroundImage: `linear-gradient(to right, #67daa3 ${review.rating * 20}%, #71817c ${review.rating * 20}%)` }}>★★★★★</span><span>Nota: {review.rating} de 5</span></p>}
    {review.text.trim() && <p className="review-text">{review.text}</p>}
  </>;
}
