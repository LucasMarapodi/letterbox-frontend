# Integração das entregas na main — 17/10/2026

Conjunto funcional partindo de main `9711a68` e chegando a `b2026db`, com nove entregas locais em sequência: layout stale do jogo, Seguir/feed na Comunidade, limite de resumo da pesquisa, likes de comentários/respostas (S-PR-11), ranking de comentários (S-PR-13), título de review (S-PR-37), favorito junto do nome do jogo (S-PR-24), cabeçalho/modal de review (S-PR-38) e organização das seções do perfil. Publicação e merge autorizados pelo usuário, preservando commits e uma PR por alteração.

A primeira suíte completa detectou 14 falhas em seis arquivos, com 840 testes aprovados. Os cenários antigos ainda esperavam payloads sem title, editavam descrição sem regularizar o título legado, acionavam botões fora do modal aberto ou buscavam nomes/IDs removidos da interface.

Os ajustes desta PR são exclusivos dos testes e seu double: title nullable esperado em payloads somente com nota; título explícito nos cenários de escrita com descrição; double preserva título em publicação/edição; favorito acionado antes de abrir modal e modal fechado antes do logout; labels atuais dos favoritos; rota de perfil verifica o ID passado ao serviço sem exigir sua exibição. A leitura de reviews legadas sem título permanece coberta pela fixture original. Cenários de falha continuam verificando erro, rascunho, autoria, data e IDs; não houve mudança no código de produção para acomodar os testes.

Validação final:

- 854 testes aprovados em 98 arquivos, zero falhas; os seis arquivos corrigidos também passaram isoladamente (91 testes).
- Lint aprovado; TypeScript e build Vite de produção aprovados.
- Oito cenários Chromium desktop/mobile aprovados: profile-order, review-modal, ranked-comments e review-title, dois por configuração. HTTP sintético valida o consumidor, sem nova comprovação de persistência PostgreSQL. Capturas versionadas foram preservadas após a execução.
- Diff conferido; sem novos pacotes, mudanças no contrato do backend, migrations ou IGDB live nesta sincronização.

Comandos:

```powershell
npm.cmd run test -- --maxWorkers=2
npm.cmd run lint
npm.cmd run build
npx.cmd playwright test --config playwright.profile-order.config.ts
npx.cmd playwright test --config playwright.review-modal.config.ts
npx.cmd playwright test --config playwright.ranked-comments.config.ts
npx.cmd playwright test --config playwright.review-title.config.ts
git diff --check
```

Os logs finais de Vitest/lint/build estão em Back/TestResults ignorado pelo Git, fora do diretório que o Playwright limpa. As validações de cada implementação original permanecem em seus próprios relatórios. O backend foi integrado separadamente pela PR #32 (S-PR-39), com a árvore validada preservada. A execução conjunta contra banco local não foi refeita; a última evidência da S-PR-37 registrava necessidade de aplicar ReviewTitle no ambiente de desenvolvimento.
