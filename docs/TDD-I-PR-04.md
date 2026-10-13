# TDD — I-PR-04

Branch feat/integracao-pr-04-reviews, base 0c58697 de Front. Código de Back não será alterado; dependências de backend deixam a US pendente conforme orientação do usuário.

## I-US-10
RED focado: 5 falhas e 3 aprovados, sem erros de tipos; commit 33cb323. GREEN: 332 testes, lint, tipos e build. Catálogo, filtros, percentuais literais, detalhes e opiniões HTTP; 404 válido vira null, rede/500/contrato não viram ausência. Zero/data sem hora/capa null e erro/recuperação/vazio na interface. Cenários de autenticação foram isolados do GET público novo por double de catálogo em tests; visitante agora consulta apenas catálogo público sem Bearer.
