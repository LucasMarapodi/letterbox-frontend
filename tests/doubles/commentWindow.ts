import type { Comment } from '../../src/models';
import { isRankingPeriod, type RankingPeriod } from '../../src/services/communityContracts';
export function commentsInPeriod(comments: Comment[], period: RankingPeriod, clock: () => Date): Comment[] {
  if (!isRankingPeriod(period)) throw new Error('Período inválido.');
  const hours: Record<RankingPeriod, number> = { '24h': 24, '7d': 168, '30d': 720 };
  const end = clock().getTime(); const start = end - hours[period] * 3600000;
  return comments.filter((comment) => { const time = Date.parse(comment.createdAt); return time >= start && time <= end; });
}
