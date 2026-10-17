export function ReviewRating({ rating, label = 'Nota' }: { rating: number | null; label?: string }) {
  return rating === null ? <p>Nota não informada (review antiga).</p> : <p className="review-rating"><span className="review-stars" aria-hidden="true" style={{ backgroundImage: `linear-gradient(to right, #67daa3 ${rating * 20}%, #71817c ${rating * 20}%)` }}>★★★★★</span><span>{label}: {rating} de 5</span></p>;
}
