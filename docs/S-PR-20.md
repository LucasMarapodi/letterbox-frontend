# S-PR-20 — Jogos favoritos em linhas completas

Branch `fix/sexta-20-perfil-jogos-favoritos-lista`, base `6df8d42`. Corresponde à S-US-19, última US do índice atual. S-PR-19/S-US-18 já estava entregue; não existe S-US-20 nesse planejamento. Entrega local, sem remoto configurado, publicação ou merge.

No próprio perfil, Jogos favoritos passa de grade de cards para lista semântica de coluna única. A seção ocupa a largura disponível; cada item mostra capa à esquerda e nome/resumo à direita. Links usam os IDs locais existentes. Resumo vazio ou com espaços apresenta `Resumo não informado.`; conteúdo é renderizado como texto, e a capa reutiliza `GameCover`, incluindo fallback após falha da imagem.

Estilos restritos à lista permitem quebra de nomes/palavras longas e expansão vertical, com capa/espaçamento menores no mobile. `GameCard`, catálogo, feed e rankings não foram alterados. A consulta existente continua fornecendo todos os dados; não há consulta adicional por jogo para obter resumo/capa. Loading, vazio, erro/retry, privacidade e ocultação de reviews favoritas vazias permanecem. Favoritos continuam fora do Início.

## TDD e verificação

- RED `24094cd` antes do código: cinco testes de componente/fluxo, quatro falhas esperadas pela ausência da lista/resumo e um caso aprovado de preservação de `GameCard`.
- GREEN: alteração localizada em `FavoritesSections.tsx` e estilos próprios, sem componente ou endpoint novo, mudança de contratos, dependências ou arquivos do Back.
- 33 testes focados em cinco arquivos aprovados: lista com vários jogos, links, texto literal, fallbacks de resumo/capa, imagem com erro, navegação por teclado, ausência de consultas individuais, estados de consulta, privacidade, ações de favoritos e preservação da Home sem favoritos.
- Lint, TypeScript, build e `git diff --check` aprovados.
- Dois cenários Chromium aprovados, com servidor HTTP/CORS sintético, em 1280 e 320 px: largura real dos itens, linhas sem sobreposição, capa antes do texto, ausência de overflow horizontal mesmo com palavras longas, fallbacks e Enter abrindo o jogo correto. A contagem exata de consultas de favoritos fica no teste React; o StrictMode do servidor Vite pode repetir efeitos, sem criar consultas individuais de jogos.

Capturas de [desktop](evidence/S-PR-20-favorites-1280.png) e [mobile](evidence/S-PR-20-favorites-320.png) inspecionadas. A suíte completa e a API real não foram executadas nesta PR; não houve escrita em dados reais.

Para repetir a verificação visual, com portas 5091/5175 livres:

```sh
npm exec playwright test -- --config playwright.favorite-games.config.ts
```

As PRs anteriores pendentes da fase, como completar perfil com a API da PR-16, não são declaradas concluídas por esta entrega.
