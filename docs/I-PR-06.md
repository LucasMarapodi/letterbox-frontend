# I-PR-06 — Dashboard, Comunidade e notificações HTTP

A Home autenticada recebe favoritos/feed da API em uma consulta agregada; Atualizar feed usa o endpoint próprio. Comunidade pública consulta recentes e rankings por período. O sino busca eventos reais ao abrir/reabrir, mantendo foco/fechamento e isolamento da sessão.

Preparada localmente em `feat/integracao-pr-06-dashboard-feeds`, base `8aa7b66` (I-PR-05). I-US-19–21 entregues, sem alteração de backend ou merge. Front não tem remoto configurado; nenhuma PR remota foi publicada.

## TDD e verificações

| US | Commit RED | Commit GREEN | Testes |
| --- | --- | --- | --- |
| I-US-19 | f7824cf | e664dea | 388 |
| I-US-20 | bb24b98 | 8175c98 | 392 |
| I-US-21 | c628315 | d561419 | 398 |

Cada GREEN passou pelo npm run check: testes, lint, tipos e build. [Registro TDD](TDD-I-PR-06.md). http-dashboard-flow, http-community-flow e http-notification-flow cobrem dados tipados, consulta única, ausência de chamadas iniciais redundantes, refresh, visitantes, vazios/rede, períodos rápidos, respostas antigas, união inválida, 401 e foco. Testes de composição foram atualizados para dashboard/sino ativos, preservando cobertura de isolamento sem mocks pessoais.

## Navegador real em 14/10/2026

Vite `http://127.0.0.1:5173`, API existente `http://localhost:5080`, sem proxy/interceptações. Contas sintéticas Ana e Bia PR5:

- Visitante abriu Recentes, Mais comentadas (24h) e Jogos em discussão (30d). Review de janeiro apareceu com comentário recente e último comentário UTC; dados vieram da API. Seleção de período foi mantida ao trocar ranking.
- Ana entrou e recebeu dashboard vazio de favoritos/feed. Publicou em Ecos do Horizonte e comentou na review de Bia em Circuito Aurora.
- Bia, que segue Ana, entrou: Home mostrou favorito de review próprio e a publicação de Ana no feed. Atualizar feed foi acionado; dados continuaram coerentes com a API.
- Sino exibiu new-review e review-comment de Ana, incluindo eventos novos desta validação. Foco inicial no fechamento; Escape fechou e devolveu foco ao sino. Reabertura seguida de clique no evento abriu a review correta e fechou modal.
- Logout removeu sino e formulários pessoais; leitura da review permaneceu pública. Aba deixada como visitante.

Capturas na pasta de visualizações da conversa: integracao-pr06-dashboard.png, integracao-pr06-ranking.png e integracao-pr06-notificacoes.png. Contagem exata das chamadas iniciais e ausência de GET favorites/feed redundantes são verificadas no teste de transporte; não se atribui uma captura de rede inexistente ao navegador. Após logout, largura útil/scrollWidth 1280, sem overflow horizontal na review.

## API real: métodos/status/cenários

`tests/manual/pr06-api.ps1` cria duas contas novas, segue/publica/comenta/favorita e verifica agregados/eventos. Executar em PowerShell 7: `./tests/manual/pr06-api.ps1 -ApiBase http://localhost:5080`. Só imprime método/rota/status; credenciais transitórias e registros sintéticos na API em memória.

| Endpoint relativo a /api/v1 | Status observados |
| --- | --- |
| GET dashboard | 200 vazio e agregado com favoritos/feed; 401 visitante |
| GET feed/following | 200 com nova review após seguir/publicar e vazio após unfollow; 401 visitante |
| GET community/reviews/recent | 200 lista pública |
| GET community/reviews/most-commented?period=24h/7d/30d | 200, review-fixture antiga com comentário recente; 400 período inválido |
| GET community/games/in-discussion?period=24h/7d/30d | 200 com jogo da review antiga; 400 período inválido |
| GET notifications | 200 vazio e ambos os eventos para a segunda conta, actor correto e sem duplicação; 401 visitante/token revogado |

Todas as respostas verificadas incluíram Access-Control-Allow-Origin para Vite. 201 das publicações/comentários, 200 de follow/favoritos e 204 de unfollow/logout também observados no harness. Status negativos são do harness; rede/retry/DTO inválido/races de UI são doubles tipados, sem afirmar que foram provocados no navegador real.

## Limites

Nenhum arquivo de Back foi editado ou commitado nesta entrega; nenhuma US precisou de correção de backend ou foi ignorada. A API continua em memória, com token simulado e catálogo fake. SQL, JWT e IGDB real fora do escopo.

Imports/fábrica de mocks e contratos legados ainda existem para a suíte e devem ser retirados na I-PR-07, incluindo o método legado CommunityService.getOpinions, não utilizado pelas telas (detalhes usam GameService HTTP). Os fluxos ativos desta PR não recorrem a fixtures em falha. E2E e relatório consolidado da fase ainda pendentes. Sem polling, endpoint de lido ou página dedicada a notificações.
