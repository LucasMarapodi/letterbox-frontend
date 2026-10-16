# S-PR-06 — Filtros da tela inicial

Branch `feat/sexta-06-inicio-filtros`, criada sobre `b8b4870` (PR-28). O catálogo agora combina nome, gênero, plataforma e ordenação em uma única consulta explícita. As opções vêm de `GET /api/v1/games/filters`; os jogos continuam sendo filtrados e paginados pela API.

O formulário mantém um rascunho separado dos filtros aplicados. **Aplicar filtros** envia o conjunto, volta à página 1 e preserva 10/20/50 itens por página. Paginar e trocar o tamanho usam a consulta aplicada, sem enviar alterações pendentes. **Limpar filtros** restaura nome vazio, Todos e `release-desc`, preservando o tamanho. **Limpar busca** mantém o comportamento específico da PR-15: remove somente o nome aplicado e não consulta para limpar um rascunho ou uma busca já vazia.

**Últimos lançados** substitui Recentes e permanece como padrão, inclusive ao buscar por nome. A ajuda informa que a ordenação usa a primeira data de lançamento. Os cartões do Início exibem a data disponível em pt-BR; os demais usos de GameCard permanecem sem essa linha por padrão.

As opções têm loading, erro e retry independentes do catálogo. Aplicar/limpar filtros e mudar o tamanho reaproveitam o overlay da PR-25, preservando cartões, foco e rolagem enquanto a consulta está pendente. Uma falha não apresenta os cartões anteriores como resultado da nova combinação. `invalid_filter` tem mensagem específica. Os IDs das opções são números inteiros positivos locais; o decoder rejeita strings, valores fora do intervalo e IDs duplicados na mesma dimensão.

## TDD e validação

O commit `7818768` registra os testes antes da implementação: sete falhas funcionais confirmaram a ausência dos filtros/opções. A cobertura nova verifica visitante e autenticado, parâmetros combinados, rascunho, aplicação/limpeza, paginação, tamanho preservado, retry separado, resposta pendente, erro e validação dos IDs.

Os testes antigos foram adaptados ao envio explícito da ordenação e ao novo texto do botão. Um helper de testes responde somente à consulta de opções nos cenários que verificam outros contratos; não existe fixture ou fallback no runtime. A primeira execução completa encontrou erros de sintaxe nessa adaptação de fixtures e expectativas antigas de chamadas; esses trechos foram corrigidos, e os 32 testes dos cinco arquivos afetados passaram. Nenhum timeout foi ampliado.

Validação final: **667 testes em 86 arquivos passaram**, sem erros de tipos. `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build` e `git diff --check` também passaram.

Quatro cenários Chromium passaram: filtros e regressão de loading/rolagem, em desktop e mobile. Usam HTTP sintético nas portas 5091/5175, sem escrita na API real ou consulta IGDB live. Executar com:

```sh
npm exec playwright test -- --config playwright.catalog-filters.config.ts
```

Capturas verificadas: [desktop](evidence/S-PR-06-filters-desktop.png) e [mobile](evidence/S-PR-06-filters-mobile.png). O teste também verifica teclado, parâmetros HTTP, ausência de consulta ao editar rascunho, retry apenas das opções, rolagem durante loading e ausência de overflow no celular.

O contrato da S-PR-05 foi conferido em `Back/docs/S-PR-05.md`. Esta entrega altera somente Front. Sem dependência nova, alteração no Back, publicação ou merge; Front não possui remoto configurado.
