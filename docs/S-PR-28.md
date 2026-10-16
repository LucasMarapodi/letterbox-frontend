# S-PR-28 — Página de pesquisa com abas Pessoas e Jogos

Branch `feat/sexta-28-pagina-pesquisa`, base `6dac1a6` da PR-27. Usuário autorizou concluir PR-27/28 em branches separadas. Sem merge, remoto configurado, dependências novas ou alterações no Back.

Enter no menu sem opção selecionada cancela debounce e abre `/pesquisa?q=...&aba=pessoas&page=1`, com URLSearchParams. Termo, aba e página são lidos da URL, incluindo acesso direto, recarga e histórico. Termo recebe trim; aba/página inválidas usam Pessoas/1 e URL canônica por replace. Termo inválido orienta sem HTTP. Novo termo reinicia Pessoas/1; trocar aba preserva termo e reinicia página.

A consulta inicial usa mode=results/scope=all e até 20 itens por grupo, sem seletor de tamanho. Página direta acima de 1, paginação e retry consultam só a categoria necessária. Mapas locais ao componente guardam cada termo/categoria/página e reutilizam grupos ao trocar abas ou navegar no histórico, sem persistência no navegador nem confundir esse cache visual com a fonte de negócio. hasNextPage controla os botões reais. Loading, vazio e erro são distintos por categoria; falha de Jogos preserva Pessoas. metadata stale/fetchedAt de Jogos é exibida sem atribuir esse estado a Pessoas.

Cards usam IDs locais numéricos, nomes/@usuário/avatares e capas/nome/resumo, com fallbacks existentes e texto literal. Abas permitem clique, setas, Home/End e foco previsível; listas não geram consulta por item. Não há overlay global para busca no menu ou resultados.

Uma microtask com verificação do ciclo ativo evita iniciar o efeito descartado pelo StrictMode, preservando uma única consulta inicial também no Vite. AbortSignal e guarda do efeito ignoram respostas de URL anterior. A barra permanece montada entre rotas: somente sugestões são fechadas/canceladas, evitando apagar texto digitado durante uma transição. Clicar novamente no campo reabre a lista mesmo quando ele já estava focado.

## TDD e validação

- RED `43a24c6`: nove falhas funcionais por rota/integração ausentes antes da implementação.
- RED `6022dfa`: duas consultas iniciais em StrictMode onde era esperada uma; corrigido sem remover StrictMode.
- RED `aaef6a6`: campo remontado, trocando o elemento e apagando o texto ao navegar; corrigido mantendo o campo e fechando a lista por efeito de rota.
- 25 testes de busca/contratos aprovados em três arquivos, incluindo URL, abas, paginação, histórico/cache, erro/retry parcial, codificação, debounce, resposta obsoleta e as duas regressões acima.
- Suíte final completa: 658 testes em 85 arquivos aprovados, sem erros de tipos. A primeira execução com o RED de StrictMode falhou somente nesse cenário; após as correções e o teste adicional de navegação, a suíte completa foi repetida e passou.
- Lint, checagem completa de tipos, build e diff check aprovados.
- Quatro cenários Chromium HTTP/CORS sintético aprovados: menu e resultados em desktop/mobile; Enter sem seleção, sugestões, destinos, abas por teclado, 20 itens, histórico, recarga, retry restrito, metadata e ausência de consultas redundantes. As falhas intermediárias de navegador levaram aos dois testes RED adicionais; não houve aumento de timeout.
- Capturas [desktop](evidence/S-PR-28-results-desktop.png) e [mobile](evidence/S-PR-28-results-mobile.png) inspecionadas, além das capturas do menu da PR-27.

O contrato foi conferido com a implementação/documentação da API S-PR-26. Os testes de navegador usam servidor HTTP sintético; não houve validação IGDB live, modificação de dados reais ou execução de testes do Back nesta entrega.

Para repetir os quatro cenários, com portas 5091/5175 livres:

```sh
npm exec playwright test -- --config playwright.search-results.config.ts
```
