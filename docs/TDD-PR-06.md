# TDD — PR-06

Branch feat/pr-06-conexoes-feed, baseada em 25319e4, sem merge.

## US-25
RED: 6 falhas esperadas e 180 testes verdes, commit 6d71f2b antes da implementação. GREEN: npm run check aprovado, 186 testes, lint, TypeScript estrito e build. Relações direcionais, seguir/deixar de seguir, rejeição de duplicidade/própria conta/visitante/destino inexistente, erro com recuperação, bloqueio de envio duplicado e logout durante envio.

## US-26
RED: 4 falhas esperadas e 186 testes verdes, commit 59710c0. GREEN: npm run check aprovado, 190 testes, lint, tipos e build. Listas públicas direcionais testadas com três usuários, nomes/fotos/links opacos, vazio, erro com recuperação, clonagem e atualização após alteração da relação.

## US-27
RED: 5 falhas esperadas e 190 testes verdes, commit c01e939. GREEN: npm run check aprovado, 195 testes, lint, tipos e build. Feed somente de autores seguidos, ordem por publicação decrescente com fixtures determinísticas, edição sem alterar ordem de publicação, links/autor/jogo/data/texto, nova publicação e remoção na próxima consulta, vazio, erro com recuperação e consulta pendente após logout. Empates de data usam ID para ordenação estável provisória.
