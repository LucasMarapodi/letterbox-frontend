# S-PR-38 — Layout do jogo e review em modal com estrelas

Front pronto localmente na branch `feat/sexta-38-jogo-modal-review`, sobre `a7529d3` (S-PR-24). Sem alteração de Back, contrato, pacote ou banco; sem publicação ou merge.

O detalhe usa duas colunas: capa e área textual. Nome fica à esquerda; favorito e Criar review/Editar minha review formam o grupo à direita. Resumo e divisor dos metadados aproveitam toda a largura textual. No mobile, o título quebra acima do grupo de ações para preservar legibilidade. Capa, metadados, discussão e aviso de catálogo fora da grade foram preservados. Catálogo, favoritos do perfil e Jogos em discussão não receberam ação de review.

Criar/editar pelo jogo abre modal usando o formulário existente. A estrutura acessível foi extraída do modal de perfil para ambos reutilizarem foco inicial, Tab contido, fundo inerte, trava de rolagem, Escape/X e retorno ao gatilho. Cancelar/X/Escape descartam rascunho; reabrir edição carrega valores confirmados. Durante envio, a mesma trava síncrona impede fechamento e submit concorrente. Erro mantém o rascunho e permite retry. O gatilho permanece montado durante a revalidação, permitindo devolver o foco ao fechar.

RatedReviewForm oferece apenas radios de estrelas, com zero explícito, indicação textual do valor e nenhuma seleção inicial na criação. Não há input de digitação de nota. Frações antigas, como 4.25, aparecem na leitura e são enviadas intactas se a seleção não mudar. Escolher outra estrela substitui a nota pelo valor escolhido. A edição individual da review usa o mesmo controle e preserva mensagens, dados e permissões.

Publicar review/Salvar review e Cancelar ficam na mesma barra e com a mesma altura. Cancelar permanece type=button. Título condicional, limite/trim, nota zero, publicação somente com nota, unicidade e autoria foram preservados. Sucesso fecha o modal, anuncia feedback e reconsulta jogo/média, review própria e opiniões. O conflito de review existente oferece edição sem declarar publicação nova.

## TDD e verificações

- RED funcional `3dbc472`: oito falhas funcionais antes do código; visitante já funcionava. Cobertura de abertura/fechamento/foco, rascunho, input removido, zero, título condicional, fração, erro/retry, pendência e envio duplicado.
- RED visual `9aa39ca`: falhas reais de largura/alinhamento desktop/mobile antes da alteração da grade e do cabeçalho.
- 165 testes pertinentes em 13 arquivos aprovados em execuções focadas: publicação, edição, título, nota, pendência/logout, favoritos, perfil, detalhe, opiniões, metadados e loading. As verificações que digitavam notas passaram a escolher radios; a criação não simula valores fracionários por um controle inexistente. A preservação de frações continua coberta na edição e nos adaptadores.
- Seis cenários Chromium aprovados em desktop/mobile: dois novos de layout/modal e quatro regressões de favoritos e título. Medições verificam largura do divisor, ações, botões e ausência de overflow; não apenas classes CSS. Navegação por teclado, zero, erro/retry, reabertura e foco também conferidos.
- Lint, TypeScript (no build), build e diff-check aprovados. Sem suíte completa ou testes pesados de Back.

```powershell
npm.cmd run test:e2e -- --config playwright.review-modal.config.ts
npm.cmd run test:e2e -- --config playwright.game-favorite.config.ts
npm.cmd run test:e2e -- --config playwright.review-title.config.ts
```

Os cenários usam Front real com HTTP sintético (portas 5186/5092 para o cenário novo). Não constituem nova validação de persistência PostgreSQL ou integração com a API local. Nenhuma migration foi executada. A dependência de títulos da S-PR-37 mantém seu relatório próprio; esta entrega não altera essa dependência.

## Evidências

| Contexto | Desktop | Mobile |
| --- | --- | --- |
| Jogo, cabeçalho e divisor | [Captura](evidence/S-PR-38-desktop-game.png) | [Captura](evidence/S-PR-38-mobile-game.png) |
| Modal e barra de ações | [Captura](evidence/S-PR-38-desktop-modal.png) | [Captura](evidence/S-PR-38-mobile-modal.png) |
