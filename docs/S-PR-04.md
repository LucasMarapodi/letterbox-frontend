# S-PR-04 — Quantidade de jogos por página

Branch `feat/sexta-04-catalogo-quantidade`, base `dc99e02`, com a dependência S-PR-02 já incluída no histórico. Alteração exclusiva de Front, sem merge. Front não possui remoto configurado, portanto revisão local sem publicação. Backend preservado.

O catálogo do Início oferece **Itens por página** com 10, 20 e 50, inicialmente 20, tanto para visitantes quanto para usuários autenticados. A seleção envia `pageSize` na consulta existente e volta à página 1, preservando a busca submetida e a ordenação. Texto ainda não submetido não substitui o filtro aplicado. A quantidade também permanece ao buscar, ordenar, limpar e navegar entre páginas.

O Front renderiza os itens retornados, sem buscar 50 para recortar localmente. A mensagem usa `items.length` e `pageSize` do envelope: por exemplo, `Exibindo 13 jogos · até 20 por página`, incluindo zero e singular. Não há total global inventado. Anterior/Próxima continuam usando `page` e `hasNextPage` da API. Outras listas não receberam paginação.

Somente os valores literais 10/20/50 são aceitos; valores vazios, parciais ou inválidos não disparam consulta. Reaplicar o valor selecionado também não recarrega. Loading/erro ocultam contagens anteriores, retry conserva a seleção e respostas antigas são ignoradas pelas guardas existentes da S-PR-02.

## Validação

- RED `a4ca026`: 10 falhas funcionais por ausência de seletor/contagem, sem erros de tipos; commit dos testes anterior ao código. [TDD](TDD-S-PR-04.md).
- `tests/catalog-page-size.test.tsx`: parâmetros HTTP para visitantes/autenticados; reset na página 3 com busca e ordenação; rascunho não submetido; navegação/limpeza mantendo quantidade; página parcial e vazia; valores inválidos; loading, erro/retry e resposta anterior tardia.
- `npm.cmd run check`: 469 testes/70 arquivos, lint, TypeScript e build aprovados.
- `npm.cmd exec playwright test -- --config playwright.page-size.config.ts`: 1 E2E Chromium aprovado, HTTP/CORS contra servidor sintético exclusivo do teste. Padrão 20, página parcial 13, troca para 50 renderizando 50 cartões, reset/preservação dos filtros, seleção 10 e layout desktop/mobile sem overflow horizontal. Não representa validação IGDB live.
- Capturas inspecionadas: [desktop](evidence/S-PR-04-catalog-desktop.png) e [mobile](evidence/S-PR-04-catalog-mobile.png). Estilos existentes e bordas arredondadas foram reutilizados.

## Limites

Backend já expõe `pageSize` na busca e o envelope `items/page/pageSize/hasNextPage`; nenhum endpoint ou contrato foi alterado. Filtros adicionais de gênero/plataforma seguem suas próprias US; esta entrega preserva os filtros disponíveis na base.

O requisito genérico de IDs inteiros da quinta fase permanece pendente, como nas PRs anteriores: Front/API usam IDs opacos string. Esta alteração conserva contratos tipados e não introduz conversão silenciosa, `any`, GUID/UUID ou mocks no runtime.
