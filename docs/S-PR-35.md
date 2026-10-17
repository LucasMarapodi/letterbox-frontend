# S-PR-35 — Texto de seguir e feed na Comunidade

Branch `fix/sexta-35-seguir-feed-comunidade`, base `5b5da4d`, incluindo a correção anterior do layout stale do jogo. Uma única entrega para os dois ajustes solicitados, sem criar US ou rota adicional.

FollowButton mostra somente Seguir/Deixar de seguir conforme o estado confirmado, inclusive enquanto aguarda a API. Durante envio mantém texto e aria-pressed, fica desabilitado e informa aria-busy. Prop name removida do componente/consumidores. Mantidos targetId, sessão, ocultação no próprio perfil, erro/retry, trava síncrona e revalidação de seguidores/seguindo.

O Início agora monta somente HomePage, tanto para a configuração antiga com dashboard quanto sem ela. Removidos DashboardHome, a prop feed da HomePage e initialReviews do FeedSection. Não restou consumidor da consulta agregada nessa tela; ela não chama dashboard, feed ou favoritos. Adaptadores/DTOs de dashboard continuam disponíveis para compatibilidade, com teste de contrato próprio; nenhum contrato do Back mudou.

Comunidade mantém Recentes como aba inicial, Mais comentadas e Jogos em discussão, acrescentando Feed de reviews. Somente as duas abas de ranking mostram período. FeedSection monta apenas ao ativar sua aba como autenticado, usando GET /api/v1/feed/following. Visitante vê Entrar para ver o feed, sem consulta privada. privateFeatures.feed=false oculta a aba e impede a consulta. Nenhum dado de Recentes é reutilizado como feed pessoal.

Preservados loading, erro/retry, vazio, Atualizar feed, nota/descrição opcional, favoritos e curtidas. Keys de rota/sessão e a chave explícita versão/ID do feed descartam dados pessoais anteriores; consultas tardias não atualizam a nova sessão.

## TDD e verificações

RED `45ada07`: 18 falhas funcionais em testes existentes de seguir, feed e Início, antes do código. Testes e roteiros foram reaproveitados conforme a PR, com expectativas novas de texto/localização e sem arquivo de US ou framework de abas novo. Regressões que buscavam cards na Home após login passaram a abrir a Comunidade/feed. Um teste antigo de identidade numérica também foi atualizado para abrir/fechar o modal atual de perfil e abrir a edição de review, preservando sua cobertura de IDs.

Passaram **139 casos distintos em 17 arquivos**: 87 nas outras 13 regressões e 52 nos quatro arquivos repetidos após adaptar os roteiros antigos. Cobertura de seguir/conexões, Início nas configurações com/sem dashboard e login direto/retorno, lazy loading, visitante, funcionalidade desativada, retry/vazio/loading, respostas antigas após logout, favoritos/curtidas, sessão, provider padrão e abas/rankings. Lint, TypeScript completo, build e diff aprovados.

Chromium com HTTP sintético em **1280 e 375 px** confirmou visitante/login, ausência de consultas de dashboard/feed no Início e feed em Recentes, textos estáveis e aria-busy nos dois sentidos de seguir, atualização das conexões, feed diferente de Recentes, filtro só em ranking, atualização manual, ações de review, vazio após deixar de seguir e troca Ana → Bia sem conteúdo privado antigo. A fixture DELETE foi corrigida para 204 antes da execução final; não houve alteração de produto para esse erro de roteiro. Sem contas, sessões ou escritas no banco real. Scripts temporários removidos. Capturas [desktop](evidence/S-PR-35-feed-1280.png) e [mobile](evidence/S-PR-35-feed-375.png) inspecionadas, sem overflow.

Roteiros E2E históricos de favoritos e integração foram atualizados nos pontos de texto/localização; não foram executados nesta entrega. Suíte completa e testes do Back não executados. Nenhuma biblioteca, endpoint, migration ou código de backend alterado; trabalho paralelo do Back preservado.

Remoto origin conferido: LucasMarapodi/letterbox-frontend. Entrega/commits locais, sem publicação ou merge; GitHub CLI não está disponível neste ambiente. Vite existente aplica as mudanças em http://127.0.0.1:5173/comunidade.
