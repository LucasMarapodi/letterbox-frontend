# TDD — PR-08

Branch feat/pr-08-preparacao-entrega, baseada em 367ff43, sem merge.

## US-29 — Teclado
RED: cinco falhas esperadas e 208 testes aprovados; commit 700d1ca. GREEN: 213 testes, lint, tipos e build aprovados. Atalho inicial por Tab/Enter para conteúdo principal em Home/login/perfil/review/jogo.

## US-29 — Layout RED no navegador real
Viewport 320 x 800, navegador IAB. Conta fictícia com nome PessoaComNomeMuitoLongoParaValidarResponsividadeDaNavegacao. Home autenticada: documentElement.clientWidth = 305 e scrollWidth = 467. Overflow horizontal reproduzido antes da correção. A medição DOM real é a prova; jsdom não comprova layout.
