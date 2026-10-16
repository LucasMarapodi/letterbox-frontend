# Compatibilidade Front — P-PR-05

Branch `fix/postgres-pr-05-contrato-favoritos`, base `dc85d25`. Contrato conferido em `FavoriteResponse` do Back após `f0b7c17`: `id`, `userId` e `targetId` inteiros; `targetType` distingue jogo/review. Nenhum arquivo do Back foi alterado. Sem merge ou publicação; Front não tem remoto configurado.

## Correção

O decoder exigia ID próprio textual e ainda normalizava o alvo decimal textual da fase transitória. Isso podia apresentar erro após um favorito já confirmado no banco.

`Favorite.id` agora usa `FavoriteId`, alias de ID local numérico. O decoder exige inteiros positivos de int32 tanto em `id` quanto em `targetId`, reutilizando a validação local existente. A conversão transitória de string foi removida. Serviços, componentes e caminhos HTTP já recebiam o alvo como número e foram preservados. O wrapper `{ favorite: null }` continua válido; PUT retorna o favorito numérico e DELETE 204 continua sem corpo.

Fixtures, doubles e cenários antigos foram alinhados ao contrato atual, inclusive testes de mutações pendentes e alvos independentes. IDs próprios de notificações e tokens permanecem strings. O layout de favoritos da PR-20 e a ocultação de reviews vazias da PR-19 foram preservados. Não há novas consultas, dependências, armazenamento ou alteração de interface.

## TDD e validação

RED `a9b5611`, anterior ao código: 26 testes novos, cinco falhas funcionais e 21 casos aprovados. Reproduz rejeição de favoritos numéricos de ambos os tipos, aceitação indevida do ID textual e erro aparente após favoritar.

64 testes focados em seis arquivos aprovados. Incluem limites de int32, IDs inválidos/textuais, GET/wrapper, PUT, DELETE, botões atualizados, ida ao perfil e retorno ao detalhe, listas após inclusão/remoção, permissões e mutações pendentes.

Validação final: 612 testes em 80 arquivos aprovados, sem erros de tipos, com `npm.cmd run test -- --maxWorkers=2`. Lint, TypeScript, build e `git diff --check` aprovados.

Chromium com servidor HTTP/CORS sintético aprovado: cadastro/login, armazenamento indisponível/retry, nota/review numéricas, remoção e inclusão de favoritos de jogo/review usando respostas com `id` e `targetId` numéricos. [Captura inspecionada](evidence/numeric-favorites-owner.png).

Nenhuma credencial real ou escrita na API real/PostgreSQL foi utilizada. A validação do contrato usa o código do Back e servidores/transportes controlados nos testes.

Para repetir o cenário de navegador, com portas 5091/5175 livres:

```sh
npm exec playwright test -- --config playwright.numeric-contract.config.ts
```
