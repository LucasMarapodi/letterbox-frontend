# S-PR-40 — Contexto do jogo no topo da review

Front na branch `feat/sexta-40-review-contexto-jogo`, sobre `c055e2a`. Sem alteração de Back, contrato, pacote ou provider global; sem publicação ou merge.

O ID deixou de aparecer no layout, preservando rota e chamadas por ID numérico. O primeiro bloco identifica o jogo com capa, nome linkado, estrelas e Nota desta review: X de 5. A nota é do autor, sem usar a média do jogo, arredondar frações ou inventar zero no legado. Nome/capa/nota não são repetidos abaixo; os demais cards conservam sua apresentação.

O resumo usa games.getById após identificar o jogo. Enquanto carrega, capa/nome/nota e discussão permanecem disponíveis. Vazio ou jogo ausente usa Resumo não informado; erro oferece retry local sem recarregar review/comentários. Uma promessa local por jogo/tentativa também evita duplicação no ciclo de efeitos do StrictMode. Retornos de rota anterior são ignorados. Não há consulta por comentário ou chamada direta à IGDB.

Autor/avatar/data, título/texto, ações, edição e discussão continuam abaixo do contexto. O aviso stale considera os metadados da review e do detalhe do jogo, em posição secundária, depois do texto, com informação e retry preservados. A chegada do resumo não remonta a discussão nem rouba foco, destaque ou rascunho.

## TDD e validações

- RED `8789f8d`: 12 falhas funcionais e caso inexistente já correto antes do código.
- RED `17de638`: duplicação de consulta em StrictMode, detectada também no Chromium e corrigida com reuso local da consulta.
- 127 casos pertinentes em dez arquivos aprovados em execuções focadas: contexto, nota/legado, erro/retry, rota antiga, comentário/foco/rascunho, título/edição, capa, rotas, opiniões e curtidas. Testes anteriores de ID visual foram substituídos pela verificação do ID nas chamadas.
- Dois Chromium (1280/390 px) aprovados: nome/resumo longos, proporção de capa/fallback, ausência de overflow, aviso secundário, nota diferente da média, uma consulta em StrictMode, foco no comentário após o resumo e navegação do nome por teclado.
- Lint, tipos/build e diff-check aprovados. Sem suíte completa ou testes pesados de Back.

```powershell
npm.cmd run test:e2e -- --config playwright.review-context.config.ts
```

Navegador com Front real e HTTP sintético nas portas 5189/5095. Não é uma nova comprovação de persistência PostgreSQL. Nenhum dado real ou migration foi alterado.

- [Desktop](evidence/S-PR-40-desktop.png)
- [Mobile](evidence/S-PR-40-mobile.png)
