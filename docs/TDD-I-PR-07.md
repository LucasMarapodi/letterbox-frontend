# TDD — I-PR-07

Branch feat/integracao-pr-07-entrega, base e270e33. Backend não alterado.

## I-US-22

RED: três falhas esperadas em http-only-runtime.test.ts; commit 43502db antecede implementação. Exige src sem doubles/seletores, runtime exclusivamente HTTP e erro de rede em opiniões sem fallback.

GREEN: 401 testes, lint, tipos e build aprovados em 2026-10-14. Implementações e fixtures transferidas para tests/doubles; FoundationPreview e atalhos de exemplos existem somente nos testes. Runtime constrói explicitamente os adaptadores HTTP, inclusive a fachada de opiniões.

Cobertura preservada: antigos testes de motores exercitam somente doubles; a autoridade das regras é Back/tests/Tcc.Api.Tests (Identity, Opinions, Social e Queries), e o consumo do Front é verificado pelos testes http-*. Nenhum motor de negócio é importado por src. Sucesso desses doubles não é evidência de chamada real à API. A US-23 acrescenta navegador real.

## I-US-23

Cenário E2E escrito e executado antes de qualquer correção de produto; commit 920a8f2. Os fluxos HTTP existentes passaram sem exigir alterações produtivas. Falhas iniciais foram do harness (seletor após cadastro duplicado, montagem do formulário, Home já aberta e comparação de headers); não são declaradas RED de produto. Não foi criado RED artificial para validar comportamento existente.

GREEN: Playwright 1.64.1 fixado; Chromium instalado. Uma jornada de duas contas passou em 15,9s, e check aprovou 401 testes, lint, tipos e build. Origem Front 127.0.0.1:5174, API 127.0.0.1:5081, sem proxy/interceptação. Conjunto de método/rota de sucessos observado no navegador coincide exatamente com 34 operações funcionais do OpenAPI. Readiness health e inventário são infraestrutura.

409 de cadastro pela UI; 401 privado pela UI após revogação real e reinício; 403 de edição e 409 de review por cliente de permissões contra a API real (controles proibidos não são fabricados na UI). CORS de todas as respostas observadas, origem rejeitada e quatro preflights verificados. Latência de rede via CDP, sem substituição de resposta: logout aborta notificações pendentes. Host próprio desligado causa erro em nova busca sem fixtures; reinício recupera catálogo e invalida a sessão anterior.

Evidências exportadas contêm somente método/rota anonimizada/status/origem da observação; trace/vídeo/screenshots automáticas desativados. Resultados internos do runner, inclusive error-context, ficam ignorados e não são evidência publicável. API :5080 do desenvolvimento e código Back não são alterados.
