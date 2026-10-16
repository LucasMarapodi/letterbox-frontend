import { Link } from 'react-router-dom';
import { encodeRouteId } from '../routing/encodeRouteId';

export function ReviewCardLink({ id, label }: { id: number; label: string }) {
  return <Link className="review-card-link" to={`/reviews/${encodeRouteId(id)}`} aria-label={label} />;
}
