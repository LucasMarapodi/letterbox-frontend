# TDD — S-PR-04

Base `dc99e02`; branch `feat/sexta-04-catalogo-quantidade` criada antes de testes/código. Dependência S-PR-02 presente no histórico.

RED `a4ca026`: 10 testes falharam funcionalmente pela ausência de seletor e contagem, com tipos válidos. Cobertura HTTP controlada de visitante/autenticado, 10/20/50, reset na página 3, preservação da consulta aplicada, página parcial/vazia, valores inválidos, loading, erro/retry e descarte de resposta antiga. Commit de testes anterior à implementação.

GREEN: mudança mínima em HomePage: handler aceita apenas valores literais permitidos, atualiza pageSize/page mantendo o restante da consulta, seletor reutiliza estilo existente e contagem usa dados do envelope. Nenhum recorte no navegador ou paginação em outras listas. Os 44 testes focados de catálogo/loading passaram.

Verificação completa: 469 testes em 70 arquivos, lint, tipos, build e diff check. E2E Chromium com HTTP sintético confirma envio dos parâmetros, 50 cartões retornados/renderizados, reset, filtros preservados, página parcial e layout desktop/mobile; capturas inspecionadas. Não foi executado como IGDB live. Backend preservado, sem merge/publicação remota. [Descrição e limites](S-PR-04.md).

Critério global de IDs inteiros continua pendente da migração própria, sem alterar os contratos opacos existentes.
