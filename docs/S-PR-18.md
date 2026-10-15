# S-PR-18 — Início sem favoritos

Branch `fix/sexta-18-inicio-sem-favoritos`, base `daeec0d` (inclui a PR-19). Sem merge; Front sem remoto configurado para publicação.

A rota `/` deixa de montar Jogos favoritos e Reviews favoritas nos dois caminhos de composição. `App.tsx` mantém somente o feed na Home simples; `DashboardHome` conserva consulta agregada, loading, erro/retry e feed. O backend ainda pode retornar favoritos no dashboard, conforme permitido pela US, mas esses dados não montam componentes nem geram consulta exclusiva de favoritos no Início.

Foram retiradas a prop `favorites` de `HomePage`, os imports sem uso e a prop `initialLists` de `FavoritesSections`, utilizada somente pela composição removida. O componente continua no próprio perfil, com consulta, loading, erro/retry e a condição de reviews vazias da PR-19. Ações de favoritar/desfavoritar, contratos e dados não foram alterados. Nenhum arquivo do Back foi modificado.

## TDD

RED `2838edf`, anterior à implementação: 11 falhas funcionais reproduzidas pela montagem indevida das seções. Os testes novos cobrem os caminhos com/sem dashboard, acesso direto/após login, favoritos vazios/preenchidos, ausência de chamada exclusiva, navegação ao próprio perfil, busca, ordenação, paginação e atualização do feed, além de loading, erro e retry do dashboard.

GREEN: retirada das renderizações e simplificação das props existentes. Regressões antigas que esperavam favoritos na Home passaram a conferi-los no próprio perfil; a cobertura de autorização e descarte de respostas tardias foi preservada. A verificação completa de TypeScript detectou uma opção inválida em seletores dos testes novos; ela foi removida antes da validação final.

## Validação

Os 40 testes focados em sete arquivos passaram antes da simplificação final da prop sem uso. Validação final: `npm.cmd run test -- --maxWorkers=2`, 537 testes em 76 arquivos aprovados, sem erros de tipos; lint, TypeScript, build e `git diff --check` aprovados. O fluxo integrado de navegação foi verificado com Router e transporte controlado exclusivamente nos testes; não houve escrita na API real ou execução de Chromium nesta PR.
