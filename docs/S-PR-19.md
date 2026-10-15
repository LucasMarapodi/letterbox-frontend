# S-PR-19 — Reviews favoritas vazias no perfil

Branch `fix/sexta-19-perfil-reviews-favoritas-vazias`, base `1af9a24`. Entrega de Front pronta para revisão local; remoto ausente, sem publicação ou merge. A PR-17 permanece pendente da API da PR-16.

Após uma consulta válida de favoritos, `FavoritesSections` monta a seção Reviews favoritas somente quando há pelo menos uma review. Lista vazia não produz seção, título nem mensagem de vazio. A condição envolve a seção completa; não há ocultação por CSS, flag ou nova abstração.

Jogos favoritos, consultas, loading, erro/retry, links e permissões foram preservados. A navegação existente reconsulta favoritos ao retornar ao próprio perfil, refletindo adição da primeira review e remoção da última. Nenhuma mudança em Back, contratos, tipos de ID ou dados persistidos. A composição do Início não foi alterada nesta entrega; a remoção de favoritos da Home pertence à PR-18, ainda pendente nesta base.

## TDD e validação

- RED `938dac3`, anterior ao código: sete testes novos, três falhas esperadas pela seção vazia ainda renderizada e quatro casos aprovados, sem erros de tipos.
- GREEN: condição simples `state.lists.reviews.length > 0` ao redor da seção completa. Regressão antiga que exigia a mensagem de vazio foi ajustada ao novo comportamento.
- `npm.cmd run test -- --maxWorkers=2 tests/profile-favorite-reviews.test.tsx tests/favorite-lists.test.tsx tests/http-favorite-flow.test.tsx`: 17 testes aprovados em três arquivos, sem erros de tipos.
- Lint, TypeScript, build e `git diff --check` aprovados.
- Testes com Router e transporte HTTP controlado verificam zero/uma/várias reviews, conteúdo/links, jogos independentes, loading, falha 503 e retry, privacidade e percurso perfil → review → favoritar/desfavoritar → perfil com três consultas de favoritos.

Não houve execução da suíte completa, E2E Chromium ou gravação de favoritos na API real nesta PR. O fluxo integrado foi validado em React com transporte controlado exclusivamente nos testes.
