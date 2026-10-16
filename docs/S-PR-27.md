# S-PR-27 — Barra de busca e sugestões no menu

Branch `feat/sexta-27-busca-menu`, base `8c05eff`. API S-PR-26 conferida em código e em Back/docs/S-PR-26.md. Implementação exclusivamente Front, sem dependências novas ou mocks produtivos. Sem remoto, publicação ou merge.

Busca pública compacta no menu, separada da busca do catálogo. Trim, mínimo três/máximo 200 caracteres, debounce 300 ms e uma chamada a `/search` com mode=suggestions/scope=all/page=1. Pessoas/Jogos têm estados independentes, até cinco opções cada, avatares/capas com fallback e IDs locais numéricos. Retry consulta somente o grupo necessário e preserva o outro, incluindo notRequested no envelope e metadata de Jogos. HTTP 503 da busca passa pelo decodificador próprio, preservando os erros por grupo; demais erros HTTP mantêm o tratamento anterior.

Combobox/listbox com grupos e opção ativa identificada, sem seleção inicial automática. Setas e Enter abrem sugestão; clique abre perfil/jogo. Escape, Tab, clique fora e navegação fecham/cancelam, com descarte de respostas obsoletas. Loading local não bloqueia a navegação. Não há consulta por item nem envio de Bearer na busca pública.

O menu oferece callback de envio para a página de resultados. Nesta branch ele permanece desconectado: Enter sem seleção cancela debounce e orienta escolher uma sugestão, sem ativar rota inexistente. A integração do callback, URL canônica e página pertence à PR-28, autorizada pelo usuário em sequência e em outra branch. A S-US-24 completa ainda não é declarada entregue por esta branch.

## TDD e validação

- RED `05b655e`: dez falhas funcionais pela ausência da barra, antes do código.
- 98 testes em nove arquivos aprovados, incluindo 14 novos cenários de menu/contrato: debounce, cancelamento, terminação de resposta obsoleta, estados/vazio, privacidade, IDs, limites, envelope 503, teclado/destinos e retry parcial; regressões de HTTP/login/sessão/Comunidade preservadas.
- Os testes de timers precisaram substituir localmente o wrapper assíncrono do Testing Library, cujo timer zero detecta Jest e travava com o relógio Vitest. Nenhum timeout ou comportamento produtivo foi relaxado.
- Lint, checagem completa de tipos, build e diff check aprovados.
- Dois cenários Chromium HTTP sintético aprovados, desktop/mobile: teclado, foco, fechamento, perfil/jogo, retry de Jogos sem recarregar Pessoas, layout sem overflow e loading sem overlay. A primeira execução mobile tentou clicar em um título naturalmente coberto pelo dropdown; o teste passou a clicar na margem externa visível.
- Capturas [desktop](evidence/S-PR-27-menu-desktop.png) e [mobile](evidence/S-PR-27-menu-mobile.png) inspecionadas.

Sem suíte completa, escrita em dados reais ou IGDB live nesta entrega. Para repetir navegador, com portas 5091/5175 livres:

```sh
npm exec playwright test -- --config playwright.menu-search.config.ts
```
