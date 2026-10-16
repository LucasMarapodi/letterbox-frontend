# TDD — PR-08

Branch feat/pr-08-preparacao-entrega, baseada em 367ff43, sem merge.

## US-29 — Teclado
RED: cinco falhas esperadas e 208 testes aprovados; commit 700d1ca. GREEN: 213 testes, lint, tipos e build aprovados. Atalho inicial por Tab/Enter para conteúdo principal em Home/login/perfil/review/jogo.

## US-29 — Layout RED no navegador real
Viewport 320 x 800, navegador IAB. Conta fictícia com nome PessoaComNomeMuitoLongoParaValidarResponsividadeDaNavegacao. Home autenticada: documentElement.clientWidth = 305 e scrollWidth = 467. Overflow horizontal reproduzido antes da correção. A medição DOM real é a prova; jsdom não comprova layout.

Layout GREEN real: Home, próprio perfil, jogo e review em viewports 320, 768 e 1280 pixels. Larguras úteis 305/753/1265 (barra de rolagem de 15 px); scrollWidth igual a clientWidth em todas as telas. Modal móvel e desktop sem overflow, foco inicial no fechamento e Escape validado. Conta fictícia de nome longo permaneceu legível. Override restaurado. npm run check: 213 testes, lint, tipos e build aprovados.

## US-30
RED: três falhas esperadas e 213 testes aprovados; commit c5f4156. GREEN: npm run check aprovado, 216 testes, lint, tipos e build. Configuração central, seleção mock/custom, mesma operação em mock/fake e Home com catálogo alternativo pela mesma interface. Telas de produção consomem ServiceProvider/useServices; fachadas preservam compatibilidade. Operações e pendências em SERVICE-INTEGRATION.md.

## US-31 — Validação integrada
Suíte existente reutilizada e duas lacunas de percurso cobertas com serviços isolados completos via AppRoutes, sem spies: cadastro/login/nota/publicação/edição/favoritos/reabertura/logout; busca/jogo/review/comentário/seguir/feed/notificações/destino. Os testes ficaram verdes sem defeito adicional; nenhuma implementação nova nem RED artificial nessa etapa de validação, conforme US-31. Total: 218 testes, lint, TypeScript estrito e build aprovados.

Navegador após US-30: login de Ana e consulta dos dois eventos pelo sino; Escape retornou foco ao sino; logout removeu o sino. Login e cadastro em viewport 320 x 850 com clientWidth = scrollWidth = 320. Viewport restaurado. Evidência visual pr08-notificacoes.png na pasta de visualizações do chat.
