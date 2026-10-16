# S-PR-37 — Título no formulário e nas listagens de reviews

Front READY_LOCAL na branch `feat/sexta-37-titulo-review-front`, base `509ecec` (S-PR-13). A S-PR-24 ficou somente com a branch criada, sem código. Sem merge ou publicação nesta entrega.

O formulário único de criação/edição oferece Título com indicação do limite de 150 caracteres e obrigatoriedade quando houver descrição. Valida os valores finais após trim, preserva nota zero e permite somente nota ou título sem descrição. Título vazio é enviado como null; descrição vazia como string vazia. Limpar somente título mantendo descrição impede salvar, sem apagar o texto. Limpar os dois juntos mantém a identidade da review e a nota.

Edição carrega o título salvo. Erros preservam o rascunho, cancelamento não grava e envio pendente bloqueia os campos/ações, com trava síncrona contra envio duplicado. Os erros HTTP `review_title_required` e `review_title_too_long` são reconhecidos e apresentados junto ao campo, antes do tratamento genérico de nota. Tratamentos existentes de sessão, autoria, duplicidade e storage_unavailable preservados.

Modelos/DTOs/adaptadores transportam title nullable. O modelo básico permite ausência durante a transição; a resposta HTTP decodificada sempre tem string ou null. Campo ausente de API antiga vira null; títulos com tipo incompatível ou mais de 150 caracteres são rejeitados. POST/PATCH preservam a diferença entre omissão e limpeza explícita.

ReviewBody exibe um único heading de título, distinto do jogo/autor, no detalhe, opiniões do jogo, perfil, favoritos, Recentes, Mais comentadas e feed. Sem título, não cria heading vazio nem texto artificial. Legados textuais sem título e reviews somente com nota continuam legíveis/interativos. Nenhuma ordenação foi adicionada: a sequência recebida da API permanece intacta, inclusive antes do slice do perfil e nos rankings.

## TDD e verificações

- RED `4f3a4d1`: 26 falhas funcionais antes do código, cobrindo formulário, trim/limite, nota zero, legado, payloads, erros HTTP, renderização e ordem/paginação.
- 156 casos pertinentes aprovados em execuções focadas, incluindo os 26 novos. Regressões de publicação/edição, envio duplicado/logout, adaptadores, leitura, Comunidade, paginação e favoritos. Testes existentes agora fornecem título explicitamente quando enviam descrição; mantida a validação de rascunho e erro.
- Dois cenários Chromium em 1280/390 px aprovados: criação somente com nota zero; bloqueio de texto sem título e limite de 151; título com trim; edição carregada; listagem na ordem da API; limpeza inválida/válida; título sem descrição; cancelamento e ausência de overflow. A navegação pelo cartão usa sua área própria, preservando o link independente do jogo.
- Lint, TypeScript, build e `git diff --check` aprovados. Não executada a suíte completa ou testes pesados de backend.

```powershell
npm.cmd exec playwright test -- --config playwright.review-title.config.ts
```

O E2E usa Front real e servidor HTTP sintético nas portas 5184/5094. Ele valida o consumidor e os payloads; **não comprova persistência PostgreSQL**.

## Dependência e limite de integração local

Contrato conferido no commit `9260250` da [S-PR-36 / Back PR #31](https://github.com/LucasMarapodi/letterbox-backend/pull/31), incluindo DTOs, semântica de PATCH, erros e relatório SQL/HTTP do Back. Nenhum arquivo ou conflito em andamento no Back foi alterado.

Duas consultas somente de leitura confirmaram que `gamesdb.reviews` ainda não tem a coluna `titulo`. A migration `20261016221305_ReviewTitle` precisa ser aplicada explicitamente pelo responsável pelo backend antes de executar a API nova nesse banco. Não foram executadas migrations, criados bancos ou alterados dados reais.

A validação conjunta **Front → API S-PR-36 → PostgreSQL local** permanece pendente desse upgrade. A API antiga não aceita title nos comandos; os servidores anteriores não devem ser apresentados como compatíveis com gravação do formulário novo. A branch está pronta no Front, com compatibilidade de leitura de respostas antigas; isso não constitui compatibilidade de escrita com a API anterior.

- [Título no detalhe desktop](evidence/S-PR-37-desktop-title.png)
- [Título longo no detalhe mobile](evidence/S-PR-37-mobile-title.png)

Sem novas dependências, alterações de backend, banco, ordenação local, nota, likes ou favoritos.
