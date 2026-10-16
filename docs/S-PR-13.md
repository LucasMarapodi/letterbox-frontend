# S-PR-13 — Comentários mais curtidos na Comunidade

READY_LOCAL. Branch `feat/sexta-13-ranking-comentarios-ui`, base `1e2a738` (S-PR-11), sem merge ou publicação.

A aba **Mais curtidos** consulta o ranking público da S-PR-12 e preserva Recentes, Mais comentadas, Jogos em discussão e Feed de reviews. Mostra comentários principais e respostas, autor/avatar, texto, data de publicação, contexto com link do jogo, curtidas no período, total ativo e última curtida no período, com datas identificadas em UTC.

Períodos 24h/7d/30d, padrão 7d; paginação 10/20/50, padrão 20. Alterar período/tamanho volta à página 1, preservando o tamanho na troca de período. Exibe a quantidade realmente recebida na página, sem inventar total global. Loading oculta os resultados anteriores; vazio, erro e retry permanecem distintos. Consultas anteriores são canceladas/ignoradas.

O cartão abre `/reviews/{reviewId}#comentario-{commentId}`. Após carregar a lista, o comentário recebe foco, rolagem e contorno visível também na navegação interna. Autor e jogo têm links independentes.

Reutiliza o polegar da S-PR-11: estado pessoal consultado separadamente com Bearer, trava por comentário, erro sem alterar contagem e isolamento por sessão. Após PUT/DELETE 204, reconsulta a página inteira; a ordem e a remoção dos itens vêm do servidor. Não calcula ranking nem reordena os itens em memória. Por orientação posterior do usuário, visitantes veem os dados públicos sem botões ou convites de curtida, substituindo esse trecho do aceite original.

## Contrato

`GET /api/v1/community/comments/most-liked?period=7d&page=1&pageSize=20`, sem Bearer mesmo para usuários conectados.

Envelope `{items,page,pageSize,hasNextPage}`; itens com `commentId`, `reviewId`, `gameId`, `parentCommentId`, `text`, `createdAt`, `author`, `likeCount`, `periodLikeCount`, `lastLikeAt`. IDs locais exigem inteiros positivos int32, referências nullable somente onde previsto, contagens inteiras e período positivo até o total. Valida datas, parâmetros retornados, limites e IDs duplicados; rejeita estado pessoal no payload público e strings em IDs. Query inválida é rejeitada antes do transporte. A resposta fornece IDs do contexto, sem título/capa do jogo; o Front usa o link correto sem fazer consultas adicionais ao catálogo.

## TDD e testes

- RED `73989c3`: 26 falhas funcionais pela ausência da aba, antes do código.
- RED `c88b22f`: dois cenários Chromium confirmaram que `:target` isoladamente não destacava o comentário após navegação pelo Router; corrigido com classe vinculada ao fragmento atual.
- 142 testes pertinentes em 11 arquivos aprovados: ranking/contrato, parâmetros, paginação, contagens, autenticado/visitante, unlike/ordem da API, loading, respostas tardias, erros/retry, navegação e regressões de comentários/Comunidade/adaptadores.
- Dois cenários Chromium desktop 1280 px e mobile 390 px aprovados: navegação, período/tamanho, página, destaque/foco, ausência de controles para visitante, login/unlike, revalidação pública sem Bearer e layout sem overflow.
- Lint, TypeScript, build e `git diff --check` aprovados. Sem suíte completa ou testes pesados de backend.

```powershell
npm.cmd exec playwright test -- --config playwright.ranked-comments.config.ts
```

Esse teste usa HTTP sintético nas portas 5181/5096, que devem estar livres; não é evidência de persistência.

## Validação real das dependências

Contratos consultados no código e nos relatórios: [S-PR-10 / Back PR #28](https://github.com/LucasMarapodi/letterbox-backend/pull/28), commit `20a8317`, e [S-PR-12 / Back PR #30](https://github.com/LucasMarapodi/letterbox-backend/pull/30), commit `3c54514`. São branches separadas; o checkout do Back está em trabalho de outra PR e foi preservado.

Foram compiladas cópias isoladas dos commits, sem alterar código do Back ou rodar migrations. API S-PR-10 em 5098 e API S-PR-12 em 5097. Um proxy exclusivamente local em 5099 encaminha a rota do ranking para S-PR-12 e demais rotas para S-PR-10, sem substituir respostas por fixtures. Essa composição de teste evita mesclar commits do backend: **a API usada normalmente pelo produto precisa integrar ambos os contratos**. O Front versionado continua usando uma única `VITE_API_BASE_URL` configurável.

Front de validação em `http://127.0.0.1:5176/comunidade`, ligado ao proxy. Health de ambas as APIs e Front 200. Chromium com PostgreSQL real confirmou visitante, comentário 1/resposta 4 da review 1, 24h/50, oito solicitações de ranking sem Bearer, login, unlike/revalidação com a ordem da API, mobile e navegação ao comentário com contorno/foco.

Foi criada somente a conta local de teste 23. Suas duas curtidas foram retiradas; sessões usadas foram revogadas. Comentários 1/4 voltaram ao total zero, preservando registros existentes. Nenhuma review/comentário foi criado ou excluído por esta PR. Scripts e cópias de validação ficam fora do repositório Front, em `.local-validation`; não participam do runtime versionado.

- [Ranking sintético desktop](evidence/S-PR-13-desktop-guest.png)
- [Ranking sintético mobile após unlike](evidence/S-PR-13-mobile-unlike.png)
- [Ranking com API real](evidence/S-PR-13-live-guest.png)
- [API real, mobile após unlike](evidence/S-PR-13-live-mobile-unlike.png)

Sem mudanças de backend, schema, pacotes ou regras de ranking. PR pronta localmente, sem publicação/merge nesta entrega.
