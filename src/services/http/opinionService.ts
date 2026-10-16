import type { CommunityService } from '../communityContracts';
import { CommunityError } from '../communityContracts';
import type { HttpAdapters } from './adapters';
import { HttpFailure } from './client';
export async function communityRequest<T>(request: () => Promise<T>, invalid?: 'invalid-rating' | 'empty-text', conflict?: 'duplicate-review'): Promise<T> {
  try { return await request(); }
  catch (error: unknown) {
    if (error instanceof HttpFailure && error.kind === 'http') {
      if (error.status === 400 && invalid) throw new CommunityError(invalid);
      if (error.status === 401) throw new CommunityError('session-required');
      if (error.status === 403) throw new CommunityError('forbidden');
      if (error.status === 404) throw new CommunityError('not-found');
      if (error.status === 409 && conflict) throw new CommunityError(conflict);
    }
    throw error;
  }
}
export function createHttpRatingService(getHttp: () => HttpAdapters): Pick<CommunityService, 'getRating' | 'rate'> {
  return {
    getRating: (id) => communityRequest(() => getHttp().games.myRating(id)),
    rate: (id, value) => communityRequest(() => getHttp().games.rate(id, { value }), 'invalid-rating'),
  };
}
export function createHttpPublishingService(getHttp: () => HttpAdapters): Pick<CommunityService, 'findOwnReview' | 'publish' | 'getGameReviews'> {
  return {
    findOwnReview: (id) => communityRequest(() => getHttp().games.myReview(id)),
    publish: (id, text) => communityRequest(() => getHttp().games.publish(id, { text }), 'empty-text', 'duplicate-review'),
    getGameReviews: (id) => getHttp().games.reviews(id),
  };
}
export function createHttpReviewService(getHttp: () => HttpAdapters): Pick<CommunityService, 'getReview' | 'editReview'> {
  return {
    async getReview(id) {
      try { return await getHttp().reviews.get(id); }
      catch (error: unknown) { if (error instanceof HttpFailure && error.kind === 'http' && error.status === 404) return null; throw error; }
    },
    editReview: (id, text) => communityRequest(() => getHttp().reviews.edit(id, { text }), 'empty-text'),
  };
}
export function createHttpCommentService(getHttp: () => HttpAdapters): Pick<CommunityService, 'getComments' | 'comment'> {
  return {
    getComments: (id) => getHttp().reviews.comments(id),
    comment: (id, text) => communityRequest(() => getHttp().reviews.comment(id, { text }), 'empty-text'),
  };
}
