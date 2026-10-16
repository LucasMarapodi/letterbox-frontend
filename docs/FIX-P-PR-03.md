# Compatibilidade Front — P-PR-03

Branch `fix/postgres-pr-03-ids-opinioes`, base `87cd383`. Somente Front, sem merge ou publicação; não há remoto configurado.

O Front rejeitava IDs numéricos de reviews e notas, inclusive respostas válidas após gravações. A mesma incompatibilidade atingia referências em comentários/notificações e coleções de reviews em perfil, catálogo, feed, rankings, dashboard e favoritos.

## Contrato aplicado

- `Review.id`, `Rating.id` e toda referência `reviewId` usam números inteiros positivos até 2.147.483.647.
- Serviços e controles de edição, comentário e favorito recebem IDs numéricos. `/reviews/:reviewId` usa a mesma validação explícita de parâmetros locais já existente para usuário/jogo; legado textual, zero, frações, negativos, notação exponencial, zeros iniciais e valores acima de int32 não consultam HTTP.
- Favoritos de jogos/reviews recebem `targetId` decimal textual da API e o normalizam na fronteira HTTP para o ID local numérico. Não há `parseInt` permissivo nem conversão para string nas camadas de negócio. A serialização textual ocorre nos caminhos HTTP.
- IDs próprios de comentários, favoritos e notificações, além de `commentId` e tokens, permanecem strings no contrato P-PR-03.
- Usuários/jogos e a separação entre ID local e `igdbId` foram preservados. As entregas PR-18/19 permanecem incluídas.

O contrato foi conferido nos DTOs commitados do Back após P-PR-03 (`4b2c42e`). O checkout do Back já tinha mudanças posteriores de comentários/replies/likes em andamento: elas foram preservadas e não fazem parte desta adaptação. Nenhum arquivo, migration, banco ou serviço do Back foi alterado.

## TDD e evidências

RED `9991e51`, anterior à implementação: 13 falhas funcionais e quatro casos aprovados entre 17 testes novos. Reproduz rejeição de respostas numéricas, favoritos incompatíveis, acesso HTTP por rotas inválidas e falha aparente após salvar nota.

GREEN altera os modelos, assinaturas, decoders e rotas; fixtures/doubles foram migrados para identidades numéricas e desempate numérico, mantendo IDs textuais das entidades ainda não migradas. Testes anteriores que exigiam IDs opacos de reviews agora verificam IDs locais ou rejeição do legado. A validação genérica de encoding do transporte permanece coberta separadamente.

66 testes focados de contratos/adaptadores aprovados. O cenário Chromium `playwright.numeric-contract.config.ts` foi aprovado com servidor HTTP/CORS sintético: cadastro, falha de armazenamento/retry, login, dashboard, jogo local 12/IGDB 345447, nota 77 salva, perfil do titular, review 55 editada e favorito com `targetId: "55"`. [Captura inspecionada](evidence/numeric-opinions-owner.png).

Validação final: 554 testes em 77 arquivos aprovados, sem erros de tipos, com `npm.cmd run test -- --maxWorkers=2`; lint, TypeScript e build aprovados. A primeira suíte completa apontou seis expectativas/fixtures legadas em feed, loading e navegação; foram corrigidas e a suíte completa foi repetida com sucesso, mantendo as verificações de comportamento.

Os testes HTTP também cobrem publicação, edição, comentários, notificações e coleções com as referências atualizadas. Nenhuma credencial real foi utilizada. Não foi executado o E2E legado com PostgreSQL/API real; os requisitos de descoberta de jogos daquele runner permanecem pendentes conforme G-PR-05.

Reprodução do cenário de navegador, com portas 5091/5175 livres:

```sh
npm exec playwright test -- --config playwright.numeric-contract.config.ts
```
