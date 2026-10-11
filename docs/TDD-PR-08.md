# TDD — PR-08

Branch feat/pr-08-preparacao-entrega, baseada em 367ff43, sem merge.

## US-29 — Teclado
RED: cinco falhas esperadas e 208 testes aprovados; commit 700d1ca. GREEN: 213 testes, lint, tipos e build aprovados. Atalho inicial por Tab/Enter para conteúdo principal em Home/login/perfil/review/jogo.

## US-29 — Layout RED no navegador real
Viewport 320 x 800, navegador IAB. Conta fictícia com nome PessoaComNomeMuitoLongoParaValidarResponsividadeDaNavegacao. Home autenticada: documentElement.clientWidth = 305 e scrollWidth = 467. Overflow horizontal reproduzido antes da correção. A medição DOM real é a prova; jsdom não comprova layout.

Layout GREEN real: Home, próprio perfil, jogo e review em viewports 320, 768 e 1280 pixels. Larguras úteis 305/753/1265 (barra de rolagem de 15 px); scrollWidth igual a clientWidth em todas as telas. Modal móvel e desktop sem overflow, foco inicial no fechamento e Escape validado. Conta fictícia de nome longo permaneceu legível. Override restaurado. npm run check: 213 testes, lint, tipos e build aprovados.
