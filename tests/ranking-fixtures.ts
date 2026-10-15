import type { Comment, Review } from '../src/models';
export const rankingNow = Date.parse('2026-10-11T12:00:00Z');
const base: Review = { id: 'a', userId: 1, gameId: 1, text: 'Review antiga A', createdAt: '2025-01-01T12:00:00Z', updatedAt: null };
export const rankingReviews: Review[] = [base, { ...base, id: 'b', userId: 2, text: 'Review B' }, { ...base, id: 'c', gameId: 2, text: 'Review C' }, { ...base, id: 'd', gameId: 3, text: 'Review sem atividade' }];
export const rankingComments: Comment[] = ([['a1','a',-1],['a2','a',-72],['old','a',-960],['future','a',1],['b1','b',-2],['b2','b',-144],['c1','c',-1],['c2','c',-480]] satisfies [string, string, number][]).map(([id, reviewId, hours]) => ({ id, reviewId, userId: 2, text: 'Comentário', createdAt: new Date(rankingNow + hours * 3600000).toISOString() }));
