import { expect, test } from 'vitest';
import { createHttpAdapters } from '../src/services/http/adapters';
import { decodeForumDetail, decodeForumPage, decodeForumReply, decodeForumTopic } from '../src/services/http/forumDecoders';
import { topic, reply, forumPage } from './forum-fixtures';

test.each([{ id: '41' }, { id: 0 }, { gameId: -1 }, { replyCount: -1 }, { author: { ...topic.author, id: '1' } }, { createdAt: 'ontem' }])('tópico rejeita contrato inválido %j', patch => {
  expect(() => decodeForumTopic({ ...topic, ...patch })).toThrow();
});
test('contexto, envelope e referências numéricas são conferidos', () => {
  expect(() => decodeForumTopic(topic, 13)).toThrow();
  expect(() => decodeForumDetail({ ...topic, game: { ...topic.game, id: 13 } })).toThrow();
  expect(() => decodeForumReply({ ...reply, topicId: 42 }, 41)).toThrow();
  expect(() => decodeForumPage(forumPage([topic], 2), 1, decodeForumTopic)).toThrow();
  expect(() => decodeForumPage(forumPage([topic, topic]), 1, decodeForumTopic)).toThrow();
});
test('POSTs sem sessão não acessam transporte, leituras públicas não enviam token', async () => {
  const calls: RequestInit[] = [];
  const http = createHttpAdapters({ apiBaseUrl: 'http://localhost:5080' }, { transport: async (_url, init) => { calls.push(init); return Response.json(topic); } });
  await expect(http.forum.createTopic(12, { title: 'Título', text: 'Texto' })).rejects.toMatchObject({ status: 401 });
  await expect(http.forum.reply(41, { text: 'Texto' })).rejects.toMatchObject({ status: 401 });
  expect(calls).toHaveLength(0);
  await http.forum.topic(41);
  expect(calls[0].headers).not.toHaveProperty('Authorization');
});
