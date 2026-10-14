# TDD — G-PR-05

Branch feat/igdb-pr-05-front-paginacao, base 0981a79 de Front. Backend existente em fec0fa8 inclui G-PR-01–04; não alterado. Terceira fase integrada está na base.

## G-US-13

RED: três falhas esperadas sem erro de tipos, commit b1929d0 antes do código. Envelope novo era rejeitado, UI não apresentava página e consulta nova não aceitava resultado paginado.

GREEN: 404 testes, lint, tipos e build aprovados. GameService e adaptador retornam GamePage; JSON externo validado, array antigo rejeitado. Home inicia release-desc, busca implícita name-asc, preserva ordenação explicitamente escolhida, reset de página por filtro/sort/limpar. Navegação usa page/pageSize e hasNextPage, sem ordenar itens no cliente ou fabricar total. IDs/capa ausente e corrida de respostas preservados. Doubles/transportes anteriores migrados ao envelope sem apagar testes.
