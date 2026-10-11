import type { Comment } from '../models';
import type { RankingPeriod } from '../services/communityContracts';
export function commentsInPeriod(_comments: Comment[], _period: RankingPeriod, _clock: () => Date): Comment[] {
  void _comments; void _period; void _clock; throw new Error('US-34 pendente');
}
