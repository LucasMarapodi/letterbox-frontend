# TDD — PR-07 / US-28

Branch `feat/pr-07-notificacoes`, baseada em `5cc56e5` da PR-06, sem merge.

## Consulta pessoal

RED: 2 falhas esperadas e 195 testes aprovados; commit `f357306` antes da implementação. GREEN: 197 testes, lint, TypeScript estrito e build aprovados por `npm run check`. Testes dos dois tipos de evento, isolamento por destinatário, datas fora de ordem, desempate por ID, clonagem e acesso de visitante.

## Sino e modal

RED: 4 falhas esperadas e 198 testes aprovados; commit `a871fa4`. GREEN: 202 testes, lint, tipos e build aprovados. Sino autenticado, modal nomeado na página atual, eventos, datas, destinos, carregamento, vazio, erro com recuperação, fechamento durante consulta e navegação para review. A rota `/notificacoes` continua inexistente.

## Teclado e sessão

RED: 6 falhas esperadas e 202 testes aprovados; commit `23dc116`. GREEN: 208 testes, lint, tipos e build aprovados. Foco inicial, Tab/Shift+Tab, contenção de foco externo, único controle durante carregamento/vazio, botão fechar/Escape e retorno ao sino. Logout e troca de conta desmontam o modal, descartam dados e ignoram a resposta anterior.

Fixtures são eventos já ocorridos. Não há geração automática, status de leitura, contador, paginação ou limite inventado. Serviços permanecem mockados e contratos provisórios.
