# Contratos numéricos — P-PR-01/P-PR-02

O Front rejeitava respostas válidas de cadastro/login porque validava `user.id` como string. Isso podia apresentar falha após um cadastro confirmado e produzir email duplicado em uma nova tentativa. O catálogo também precisava acompanhar a migração do ID local dos jogos.

## Contrato implementado

- Usuário, autor e referências `userId`/`actorId`: números inteiros positivos até 2.147.483.647.
- Jogo e referências `gameId`, inclusive resumos em reviews/rankings: números inteiros positivos no mesmo intervalo.
- `Game.igdbId`: identificador externo separado, inteiro positivo seguro em JavaScript; nunca substitui o ID local nas consultas.
- IDs próprios de reviews, comentários, notas, favoritos e notificações, além de tokens: strings.
- O contrato transitório de favoritos envia `targetId` textual. Para jogos, o decoder aceita decimal canônico e normaliza para número local; para reviews mantém a string. O ID próprio do favorito permanece string.
- Rotas de usuário/jogo aceitam apenas representação decimal canônica de inteiro positivo local. Parâmetros inválidos não consultam a API. IDs opacos de reviews mantêm a navegação existente.
- `storage_unavailable` é reconhecido; cadastro/login/edição de perfil apresentam mensagem específica. Falha em `auth/me` também limpa a sessão provisória. Email duplicado mantém o tratamento existente.

Modelos, serviços, validadores HTTP, componentes, comparações de titularidade e fixtures foram adaptados. Nenhum código do Back foi alterado.

## Validação

- 519 testes em 74 arquivos, incluindo validação de contratos e fluxos HTTP, mais lint, TypeScript e build.
- Chromium com servidor HTTP sintético: cadastro, erro de armazenamento/retry, login, dashboard, jogo local 12 com IGDB 345447, favorito, perfil e edição da review própria. [Captura](evidence/numeric-contract-owner.png).
- API local P-PR-02: health 200 e consulta pública de catálogo retornando `id` e `igdbId` numéricos e distintos.
- Não foi realizado login com credenciais reais. O E2E legado da terceira fase não foi executado; ainda depende da adaptação para descobrir IDs do catálogo atual, conforme o limite já documentado na G-PR-05.

Para repetir o cenário sintético, com portas 5091/5175 livres:

```sh
npm exec playwright test -- --config playwright.numeric-contract.config.ts
```

Os registros históricos de PRs anteriores preservam os contratos vigentes na época. Esta entrega migra usuários/jogos e não antecipa a migração das demais entidades.
