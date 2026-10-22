# F-PR-02 — Fórum por jogo

Implementa F-US-04/05/06 na branch `feat/setima-02-forum-front`. Depende da API da [F-PR-01 / Back #34](https://github.com/LucasMarapodi/letterbox-backend/pull/34), ainda em revisão. Nenhum arquivo do Back foi alterado.

Reviews permanece padrão em `/jogos/{gameId}`. Fórum usa `?aba=forum&page=1`, consulta somente quando ativado e pagina no servidor em 20 itens. Aba inválida usa Reviews; página inválida usa 1. Histórico e teclado (setas/Home/End) acompanham a URL. Capa, informações, favoritos, nota e criação de review são preservados.

Tópicos abrem em `/jogos/{gameId}/forum/{topicId}` com contexto conferido antes de exibir mensagem/respostas. São textos escapados; respostas são uma lista simples. Visitantes leem; publicação exige sessão. Modal reutiliza foco, Escape, fundo inerte e retorno ao gatilho existentes. Limites: título 150, mensagem 10.000, ambos obrigatórios após trim.

Publicação bloqueia clique duplo e mantém rascunho em falha. Não repete POST automaticamente. Erro de rede/contrato orienta conferir a discussão, pois o resultado pode ser incerto. Troca de sessão desmonta formulários e cancela requisições privadas. Após resposta confirmada, reconsulta contagem/atividade e procura o ID publicado a partir da última página; concorrência pode levar à página anterior. Se essa leitura falhar, retry apenas reconsulta, sem reenviar a resposta.

## Consumo HTTP validado

| Operação | Consumidor | Momento e resultado integrado |
| --- | --- | --- |
| GET `/games/{id}/forum/topics?page=N` | `ForumTopics` → `http.forum.topics` | Ativação/paginação/retry; páginas 1 e 2 reais, até 20, `hasNextPage` da API. |
| POST `/games/{id}/forum/topics` | `CreateForumTopic` / `ForumForm` → `createTopic` | Confirmação autenticada; 201 abre o ID persistido. Cancelar não publica. |
| GET `/forum/topics/{id}` | `ForumTopicPage` → `topic` | Acesso direto/retry e após publicação; contexto, autor e contagem conferidos. |
| GET `/forum/topics/{id}/replies?page=N` | `ForumTopicPage` → `replies` | Leitura/paginação/reconsulta; páginas 1 e 2, ordem da API, sem mensagem inicial como resposta. |
| POST `/forum/topics/{id}/replies` | `ReplyForm` → `reply` | Outra conta publica via navegador; 201 e reconsulta mostram a 21ª resposta na página 2. |

Prefixo de todas as rotas: `/api/v1`. DTOs validados na fronteira HTTP: IDs inteiros positivos, contexto/coerência das referências, autores públicos, datas, contagens e envelope. GETs públicos sem Bearer; POSTs usam snapshot da sessão vigente. Nenhum mock produtivo ou reutilização de comentários de reviews.

## Evidências e comandos

Validação em 21/10/2026: 53 testes pertinentes de fórum, contratos, detalhes/opiniões de jogo, modal de review e favoritos; lint, TypeScript e build aprovados. Dois E2Es Chromium desktop 1280 e mobile 390 com API real, duas contas, paginação real de tópicos e respostas, foco/Escape/Tab do modal, leitura visitante, histórico, isolamento de jogos e leitura após reiniciar a API. Capturas em `docs/evidence/F-PR-02-*.png`.

```powershell
npm.cmd run test -- --maxWorkers=1 tests/forum-discussion.test.tsx tests/forum-contract.test.ts tests/forum-tabs.test.tsx tests/game-details.test.tsx tests/game-opinions.test.tsx tests/review-modal.test.tsx tests/http-favorite-flow.test.tsx
npm.cmd run lint
npm.cmd run build
# Back: compilar apenas para o host temporário de integração
dotnet build --no-restore -c Release -p:OutputPath=bin/ForumFront/
# Front:
npx.cmd playwright test --config playwright.forum.config.ts
git diff --check
```

O E2E lê `.env.postgres-test` do Back sem registrar credenciais, exige PostgreSQL local `tcc_pr01_tests`, marcador de exclusividade e tabelas de fórum já existentes. Cria fixtures/contas somente nesse banco; não aplica migrations, não reseta tabelas nem escreve em `gamesdb`. Sobe API temporária 5094 e Vite 5188, encerra ambos e reinicia a API durante cada cenário para comprovar persistência. Segredos não são incluídos em capturas/relatórios; traces e vídeos desativados. IGDB desabilitado nesse host: jogos são fixtures SQL, sem consumo externo. As primeiras tentativas localizaram falta das fixtures e navegação do teste que recarregava a sessão; foram corrigidas antes da validação final. Falhas ENOENT de temporários do Vitest no sandbox foram superadas executando os mesmos testes fora do isolamento.

Limitações: a sessão em memória já existente se encerra em reload; esta PR não altera sua persistência. No ambiente habitual, a API precisa incluir F-PR-01 e ter sua migration aplicada explicitamente pelo responsável. O E2E usa o schema já preparado do banco exclusivo, não comprova implantação em `gamesdb` ou produção. Sem edição/exclusão/moderação/likes/notificações de fórum. PR do Front separada, sem merge automático.
