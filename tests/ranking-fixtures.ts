import type { Comment, Review } from '../src/models';
export const rankingNow = Date.parse('2026-10-11T12:00:00Z');
const base: Review = { id: 1, userId: 1, gameId: 1, rating: 4, text: 'Review antiga A', createdAt: '2025-01-01T12:00:00Z', updatedAt: null };
export const rankingReviews: Review[] = [base, { ...base, id: 2, userId: 2, text: 'Review B' }, { ...base, id: 3, gameId: 2, rating: 4, text: 'Review C' }, { ...base, id: 4, gameId: 3, rating: 4, text: 'Review sem atividade' }];
export const rankingComments: Comment[] = ([[1,1,-1],[2,1,-72],[3,1,-960],[4,1,1],[5,2,-2],[6,2,-144],[7,3,-1],[8,3,-480]] satisfies [number, number, number][]).map(([id, reviewId, hours]) => ({ id, reviewId, parentCommentId: null, likeCount: 0, userId: 2, text: 'Comentário', createdAt: new Date(rankingNow + hours * 3600000).toISOString() }));
