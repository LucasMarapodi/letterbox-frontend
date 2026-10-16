import { Link } from 'react-router-dom';
import type { PublicReview } from '../services/contracts';
import { encodeRouteId } from '../routing/encodeRouteId';
import { Avatar } from './Avatar';

export function ReviewAuthor({ author }: Pick<PublicReview, 'author'>) {
  return <div className="feed-author"><Avatar name={author.displayName} src={author.avatarUrl} /><Link to={`/perfil/${encodeRouteId(author.id)}`}>{author.displayName}</Link></div>;
}
