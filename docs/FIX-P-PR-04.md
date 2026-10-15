# Compatibilidade Front — P-PR-04

Branch `fix/postgres-pr-04-contrato-comentarios`, base `f06124b`. Contrato conferido nos DTOs do Back após `0311681`; nenhum arquivo do Back foi alterado. Sem merge ou publicação, pois Front não tem remoto configurado.

## Alteração

- `Comment.id` e `commentId` de notificações passam a inteiros positivos de int32, como os demais IDs locais já migrados.
- `parentCommentId` é obrigatório na resposta e aceita `null` para comentário principal ou inteiro positivo para uma resposta.
- `likeCount` é obrigatório na resposta e aceita inteiro de zero a 2.147.483.647. Zero é válido; negativos, frações, strings, campos ausentes e valores não finitos são rejeitados.
- Decoders preservam os novos campos em vez de descartá-los. Modelos, notificações e fixtures/doubles acompanham o contrato.
- IDs próprios de favoritos/notificações e tokens permanecem textuais. Publicação do comentário principal continua enviando somente `{ text }` e recarregando a lista confirmada pela API.

O escopo é compatibilidade do consumidor. A lista atual é preservada, incluindo comentários retornados com pai informado. Não foram adicionados controles de resposta/curtida, chamadas aos endpoints novos de likes, agrupamento visual, polling ou regra de negócio no runtime. Os campos ficam disponíveis e validados para as US de interface correspondentes.

## TDD e validação

RED `e9b86d9`, anterior ao código: 27 testes novos, com quatro falhas funcionais e 23 casos já aprovados. Reproduz rejeição do comentário numérico, aceitação indevida do ID textual e falha na leitura/publicação/notificação. Os testes posteriores ao ajuste verificam também pai nullable/positivo e contagem zero/positiva/inválida, sem perder a cobertura de campos obrigatórios.

Os 27 testes novos passaram após a adaptação. O teste de publicação foi corrigido para consultar a região remountada após sucesso e selecionar especificamente o POST de comentários, em vez do POST de login.

Suíte final: `npm.cmd run test -- --maxWorkers=2`, 581 testes em 78 arquivos aprovados, sem erros de tipos. A execução anterior ainda havia capturado a versão antiga do seletor do POST; após a correção, toda a suíte foi repetida com sucesso. `git diff --check` aprovado.

Lint, TypeScript e build aprovados. Chromium com servidor HTTP/CORS sintético aprovado: login, leitura de comentário principal/resposta, publicação retornando ID 83, lista atualizada, formulário limpo e notificação com `commentId: 82` abrindo `/reviews/55`. [Captura inspecionada](evidence/numeric-comments.png). Nenhuma credencial real, escrita na API real ou operação PostgreSQL foi utilizada nesta validação do Front.

A tentativa de leitura pública na API local de 5080 não respondeu; não se declara validação live. O contrato foi conferido no código do Back e validado com transporte/servidor controlados nos testes.

Para repetir o cenário de navegador com portas 5091/5175 livres:

```sh
npm exec playwright test -- --config playwright.numeric-comments.config.ts
```
