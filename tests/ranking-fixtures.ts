import type { Comment, Review } from '../src/models';
export const rankingNow = Date.parse('2026-10-11T12:00:00Z');
const base: Review = { id: 1, userId: 1, gameId: 1, text: 'Review antiga A', createdAt: '2025-01-01T12:00:00Z', updatedAt: null };
export const rankingReviews: Review[] = [base, { ...base, id: 2, userId: 2, text: 'Review B' }, { ...base, id: 3, gameId: 2, text: 'Review C' }, { ...base, id: 4, gameId: 3, text: 'Review sem atividade' }];
export const rankingComments: Comment[] = ([['a1',1,-1],['a2',1,-72],['old',1,-960],['future',1,1],['b1',2,-2],['b2',2,-144],['c1',3,-1],['c2',3,-480]] satisfies [string, number, number][]).map(([id, reviewId, hours]) => ({ id, reviewId, userId: 2, text: 'Comentário', createdAt: new Date(rankingNow + hours * 3600000).toISOString() }));
