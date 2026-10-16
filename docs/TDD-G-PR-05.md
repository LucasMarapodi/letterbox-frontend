# TDD — G-PR-05

Branch feat/igdb-pr-05-front-paginacao, base 0981a79 de Front. Backend existente em fec0fa8 inclui G-PR-01–04; não alterado. Terceira fase integrada está na base.

## G-US-13

RED: três falhas esperadas sem erro de tipos, commit b1929d0 antes do código. Envelope novo era rejeitado, UI não apresentava página e consulta nova não aceitava resultado paginado.

GREEN: 404 testes, lint, tipos e build aprovados. GameService e adaptador retornam GamePage; JSON externo validado, array antigo rejeitado. Home inicia release-desc, busca implícita name-asc, preserva ordenação explicitamente escolhida, reset de página por filtro/sort/limpar. Navegação usa page/pageSize e hasNextPage, sem ordenar itens no cliente ou fabricar total. IDs/capa ausente e corrida de respostas preservados. Doubles/transportes anteriores migrados ao envelope sem apagar testes.

## G-US-14

RED: cinco falhas esperadas, quatro cenários já aprovados, commit 340cb73 antes do código. Avisos/data e mensagem de integração ausentes. Segundo RED: aviso de jogo projetado em review ausente, commit 024bd11; retry do detalhe já passou, sem declarar falha artificial.

GREEN: 415 testes, lint, tipos e build aprovados. Cliente reconhece códigos integration_* de Back e lê headers na mesma resposta. CatalogStore tipado guarda apenas metadata por operação, separado de Game/Review, limitado a 100 entradas; sequência descarta headers tardios e sessão limpa metadata anterior. Header stale precisa ser true/false; timestamp ausente/inválido não é inventado. Aviso nas telas de catálogo/detalhe e projeções (reviews, perfil, favoritos, dashboard/feed e Comunidade). Fresh/ausente não avisa. 502/503/504 não deslogam, 401 privado continua invalidando a sessão.

Chromium: um teste determinístico de contrato passou em 6,5s, com servidor sintético em 5091 e Front em 5175; paginação, leitura dos headers via CORS, stale/fresh/retry/503, sem fallback e zero chamadas externas. Não é Back/IGDB live. Evidência identificada pelo mode em docs/evidence/G-PR-05-contract-calls.json.

Contrato real de Back verificado separadamente: binário existente bin/IgdbValidation, host temporário 5083, health/OpenAPI 200, GamePageResponse e exposição de Location/X-Catalog-Stale/X-Catalog-Fetched-At. Nenhuma consulta OAuth/IGDB executada; processo temporário encerrado. A API habitual 5080 ainda executa Release antigo da terceira fase; essa diferença não foi mascarada como integração real de catálogo. Smoke live e jornada sobre dados IGDB ficam nas G-PR-06/07.
