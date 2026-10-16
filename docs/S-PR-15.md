# S-PR-15 — Limpeza de busca vazia

Branch `fix/sexta-15-limpar-busca-vazia`, base `8c99eff`. Correção localizada no Front, pronta para revisão local, sem merge. Front não possui remoto para publicação. Backend não alterado.

Antes, `clearSearch` sempre ativava loading e criava uma nova consulta. Mesmo sem busca, clicar em Limpar busca refazia o HTTP, removia os resultados durante a pendência e reiniciava a página. O RED reproduziu duas consultas extras ao clicar duas vezes na página 3.

A correção acrescenta somente duas guardas na função existente:

- Campo e termo aplicado vazios após trim: retornar antes de alterar qualquer estado.
- Apenas rascunho, sem termo aplicado: limpar o campo e retornar sem alterar consulta, resultados, página ou loading/erro.
- Busca aplicada: manter a limpeza já existente, mesmo se o campo foi apagado manualmente. Uma consulta sem termo, página 1, tamanho e ordenação explícita preservados; sem ordenação explícita, volta a release-desc. Cliques seguintes ficam inertes, inclusive durante essa requisição.

Nenhum hook, reducer, camada, contrato, tipo de ID ou serviço foi criado/alterado. A ação Limpar filtros da S-US-06 não foi implementada; gênero/plataforma continuam dependentes dos contratos ausentes registrados anteriormente.

## Validação

RED `08410ea`: 8 falhas funcionais por chamadas extras e 1 regressão já aprovada, sem erros de tipos. Commit de testes anterior ao código. [TDD](TDD-S-PR-15.md).

`tests/clear-empty-search.test.tsx` cobre visitante e autenticado, página 3 com tamanho 50/ordenação explícita, cliques repetidos, campo com espaços, loading inicial, rascunho local, erro preservado, busca aplicada com campo apagado, uma única consulta sem termo, ordenação padrão e resposta antiga descartada. Os 53 testes focados de busca/paginação/loading passaram.

Verificação final: `npm.cmd run test -- --maxWorkers=2`, 488 testes em 72 arquivos, além de lint, TypeScript e build aprovados; `git diff --check` sem erros. A primeira execução de `check`, em paralelo ao navegador, teve três timeouts de 5 segundos em testes antigos de favoritos/publicação. A suíte foi repetida com menos concorrência, sem alterar timeout, testes ou configuração do projeto; a causa exata dos timeouts não foi demonstrada.

`npm.cmd exec playwright test -- --config playwright.clear-search.config.ts`: 1 E2E Chromium aprovado com servidor HTTP/CORS sintético exclusivo do teste. Verifica página 3, alvos visíveis e quantidade de chamadas, rascunho local e limpeza de busca aplicada sem duplicar consulta. [Captura da página preservada](evidence/S-PR-15-clear-search-page3.png), inspecionada. Não é evidência de catálogo IGDB live.

Conferência por interação no navegador do Front local em 5173: API indisponível, mensagem de erro permaneceu ao clicar sem busca e ao digitar/apagar rascunho. O Front estava parado e foi iniciado para essa conferência; backend não foi iniciado/modificado. Preservação de resultados/página e contagem HTTP foram verificadas no E2E sintético e nos testes controlados, sem declarar essas partes como observação live.
