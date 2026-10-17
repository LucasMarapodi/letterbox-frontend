# Organização visual do perfil

Branch `feat/perfil-favoritos-antes-reviews`, baseada em `793febf` (S-PR-38), sem merge. Ajuste solicitado após revisão visual do perfil.

Ordem: informações do perfil, jogos favoritos, Minhas reviews, reviews favoritas e conexões. Favoritos mantêm a visibilidade privada existente; visitantes e perfis de terceiros continuam com o título Reviews, sem apresentar as opiniões de outra pessoa como próprias.

Jogos favoritos ocupam uma fileira de três itens no desktop, com capas compactas, nomes, estrelas e resumo limitado a duas linhas. No mobile, os itens ficam um por linha, preservando legibilidade. A paginação continua em três jogos e duas reviews, com controles independentes e uma única leitura compartilhada de favoritos. Loading/erro são apresentados uma vez, sem ocultar as reviews do autor.

Minhas reviews recebe contagem total, cabeçalho com divisor e separação de 48 px. Cartões de reviews próprias e favoritas usam o mesmo tom escuro da paleta do perfil. Links, ações e permissões foram preservados.

TDD: RED `f0f954d`, duas falhas e visitante já correto antes da implementação. 44 testes pertinentes em seis arquivos aprovados; dois cenários Chromium em 1280/390 px verificam ordem, espaçamento real, disposição dos favoritos, ausência de overflow e paginação independente. Lint, tipos/build e diff-check aprovados. Não executada suíte completa ou testes de Back. Os cenários de navegador usam HTTP sintético; nenhum dado do banco foi alterado.

- [Desktop](evidence/profile-order-desktop.png)
- [Mobile](evidence/profile-order-mobile.png)

```powershell
npm.cmd run test:e2e -- --config playwright.profile-order.config.ts
```

Front local permanece na porta 5173 com HMR. Sem dependências novas, alteração de Back, publicação ou merge.
