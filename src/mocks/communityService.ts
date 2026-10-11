import type { CommunityService } from '../services/communityContracts';
import { CommunityError } from '../services/communityContracts';
import type { Rating } from '../models';
export function createMockCommunityService(): CommunityService {
  const ratings: Rating[] = [];
  return { async rate(gameId, value, user) {
    if (!user) throw new CommunityError('session-required');
    if (!Number.isFinite(value) || value < 0 || value > 5) throw new CommunityError('invalid-rating');
    let rating = ratings.find((item) => item.gameId === gameId && item.userId === user.id);
    if (rating) rating.value = value;
    else { rating = { id: `mock-rating-${ratings.length + 1}`, gameId, userId: user.id, value }; ratings.push(rating); }
    return structuredClone(rating);
  } };
}
