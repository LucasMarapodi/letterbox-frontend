# TDD — I-PR-07

Branch feat/integracao-pr-07-entrega, base e270e33. Backend não alterado.

## I-US-22

RED: três falhas esperadas em http-only-runtime.test.ts; commit 43502db antecede implementação. Exige src sem doubles/seletores, runtime exclusivamente HTTP e erro de rede em opiniões sem fallback.

GREEN: 401 testes, lint, tipos e build aprovados em 2026-10-14. Implementações e fixtures transferidas para tests/doubles; FoundationPreview e atalhos de exemplos existem somente nos testes. Runtime constrói explicitamente os adaptadores HTTP, inclusive a fachada de opiniões.

Cobertura preservada: antigos testes de motores exercitam somente doubles; a autoridade das regras é Back/tests/Tcc.Api.Tests (Identity, Opinions, Social e Queries), e o consumo do Front é verificado pelos testes http-*. Nenhum motor de negócio é importado por src. Sucesso desses doubles não é evidência de chamada real à API. A US-23 acrescenta navegador real.
