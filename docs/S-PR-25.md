# S-PR-25 — Busca sem salto de rolagem e com loading bloqueante

Branch `fix/sexta-25-busca-rolagem-loading`, base `5f04755`. Implementa S-US-23 no Front, sem dependências novas, alteração de contratos HTTP ou arquivos do Back. Entrega local, sem remoto configurado, publicação ou merge.

Busca efetiva, limpeza da busca aplicada e troca de 10/20/50 itens mantêm os resultados anteriores montados durante a atualização. Um único overlay fixo cobre a viewport, inclusive a área da navbar, anuncia Carregando jogos… e isola os elementos atrás com `inert`. Tab permanece no overlay; mouse/toque e rolagem ficam bloqueados. O offset e o foco são preservados, com fallback para a busca se o botão de retry tiver saído do DOM. Conteúdo menor aceita somente o limite rolável natural.

Um estado de loading no catálogo e uma trava síncrona impedem novos submits/trocas enquanto a operação bloqueante está pendente. Somente a consulta atual pode concluir o estado; resultado obsoleto é descartado. Sucesso, erro/cancelamento e desmontagem liberam o documento. Após erro, os cards antigos permanecem inertes e identificados como anteriores, sem contagem anunciada como atualizada; retry repete o bloqueio. A consulta abandonada é ignorada, sem ampliar o contrato de serviços para abortar requisições.

Limpar campo vazio ou apenas rascunho, selecionar o tamanho atual e submeter a mesma busca já aplicada na página 1 não disparam consulta/overlay. Reinício da página e preservação de tamanho/ordenação seguem as regras existentes. Carregamento inicial, ordenação e paginação mantêm feedback regional; favoritos e demais ações não recebem bloqueio global. Os novos filtros de gênero/plataforma da S-PR-06 não existem nesta base e não são implementados por esta entrega.

## TDD e validação

- RED `f636144`: oito falhas funcionais antes do código, sem erros de tipos detectados pelo Vitest.
- GREEN: 76 testes pertinentes em sete arquivos aprovados, cobrindo catálogo, busca/limpeza, tamanho, metadata, loading, sucesso, falha, cancelamento por AbortError, trava, sessão de consulta obsoleta e desmontagem. Jsdom não é utilizado como prova de rolagem real.
- Dois testes antigos foram adaptados à nova regra: limpar enquanto a busca está bloqueada não inicia outra consulta; a resposta obsoleta da ordenação regional continua sendo descartada quando uma troca de tamanho a substitui.
- Lint, checagem completa TypeScript, build e diff check aprovados. A checagem completa identificou a opção `exact` inválida em dois seletores dos testes novos; ela foi removida antes da validação final.
- Dois cenários Chromium com HTTP/CORS sintético aprovados, desktop 1280×900 e mobile 375×812: rolagem real antes/durante/depois de busca/tamanho, cobertura da viewport, cards preservados, bloqueio de clique/teclado/toque, erro/retry, resultado menor, foco e ausência de consultas duplicadas. A primeira execução detectou uma faixa de 15 px do gutter fora do overlay; `100vw` corrigiu a cobertura e a repetição passou.
- Capturas inspecionadas: [loading desktop](evidence/S-PR-25-loading-desktop.png), [loading mobile](evidence/S-PR-25-loading-mobile.png), [resultado desktop](evidence/S-PR-25-result-desktop.png), [resultado mobile](evidence/S-PR-25-result-mobile.png).

Não houve execução da suíte inteira nesta PR, validação IGDB live ou escrita em dados reais. As 633 verificações funcionais configuradas incluem os oito novos testes, mas somente os 76 pertinentes foram executados nesta entrega.

Para repetir o cenário, com portas 5091/5175 livres:

```sh
npm exec playwright test -- --config playwright.catalog-blocking.config.ts
```
