# Game Reviews — Frontend Web

React + TypeScript + Vite. Fundação, catálogo público e autenticação mockada das US-01 a US-14, sem backend ou acesso direto à IGDB.

## Executar

Em `Front`, com Node.js 24 e npm:

```sh
npm ci
npm run dev
npm run check
```

`check` executa testes (incluindo testes de tipos), lint, TypeScript estrito e build.
`npm test -- --watch` permite acompanhar os testes durante desenvolvimento.

## Responsabilidades

- `src/pages`: telas e composição dos componentes; acessam dados somente por serviços.
- `src/components`: elementos de interface reutilizáveis, sem importação de mocks.
- `src/services`: contratos provisórios e ponto central de seleção do fornecedor dos dados.
- `src/models`: tipos provisórios de domínio, sem assumir regras definitivas do backend.
- `src/mocks`: fixtures e implementações em memória; acessíveis apenas pela composição dos serviços e pelos testes.
- `src/App.tsx`: composição da aplicação.
- `src/main.tsx`: montagem no DOM.
- `src/routing`: extração de IDs opacos a partir da URL, preservando percentuais literais.
- `tests`: testes de comportamento e tipos; dados e DOM isolados entre testes.
- `docs`: decisões e evidências de TDD.

Execute uma US por vez. Antes de qualquer comportamento, escreva e execute o teste RED e faça seu commit. Refatorações sem comportamento novo usam testes existentes; não precisam de um RED artificial.

Não publicar contratos provisórios como decisões da API real. Não implementar Mobile, backend, banco, likes ou outras funcionalidades fora da fase.

## Rotas provisórias

`/`, `/jogos/:gameId`, `/reviews/:reviewId`, `/perfil/:userId`, `/login` e `/cadastro`.
Home e detalhes do jogo oferecem catálogo público mockado. Login e cadastro possuem formulários funcionais. Review e perfil permanecem provisórios. Notificações será acessado pelo sino e modal na US-28, sem página dedicada. Os links de exemplo na Home permanecem como atalhos temporários de navegação.
URLs desconhecidas apresentam mensagem e a navegação permite retornar ao início.
Em hospedagem futura com `BrowserRouter`, configurar fallback dos caminhos para `index.html`.

## Componentes básicos

`Button` usa botão nativo e não submete formulários por padrão. `TextField` associa seu rótulo com ID próprio ou fornecido. `GameCard` oferece link com ID codificado. `Avatar` oferece iniciais sem foto ou quando a imagem falha. `LoadingState`, `ErrorState` e `EmptyState` recebem mensagens; o erro pode oferecer uma nova tentativa.

`GameCover`, compartilhado por cartões e detalhes, mostra “Sem capa” para URL ausente ou erro de carregamento e permite uma nova tentativa ao receber outra URL. `encodeRouteId` gera URLs seguras inclusive para IDs `.`/`..`; sua representação é documentada em `docs/CONTRACTS.md`.

A prévia inicial `FoundationPreview` permanece como exemplo isolado com testes de componentes; a Home agora apresenta o catálogo. Seus testes usam um serviço substituto e cobrem carregamento, ausência e rejeição com recuperação.

## Catálogo público — PR-02

Visitantes podem listar jogos, buscar pelo nome por Enter ou botão, limpar a busca, ordenar por nome e consultar detalhes, média e reviews. As opções A–Z e Z–A são provisórias. Estado sem notas aparece como ausência de avaliações, e média zero aparece como uma nota válida. Reviews oferecem links para seu conteúdo e para o autor; as páginas de destino serão implementadas nas fases correspondentes.

Fixtures fictícias ilustram jogo completo, lançamento/capa ausentes, média zero e ausência de notas. Capas SVG locais em `public/covers` não usam serviços externos. Os componentes não filtram, ordenam ou calculam média: consomem os resultados da camada de serviços.

Evidências de TDD: `docs/TDD-PR-02.md`. Descrição local da PR: `docs/PR-02.md`. A branch `feat/pr-02-catalogo-publico` deriva da branch da fundação, sem merge. A PR ainda não foi publicada por ausência de remoto.

## Autenticação mockada — PR-03

Login, cadastro sem login automático, sessão em memória e logout. `RequireSession` oferece proteção reutilizável para ações das próximas US. Conteúdo público continua acessível a visitantes.

Credenciais fictícias: `ana@example.com` / `teste123`. Decisões e limitações em `docs/AUTH.md`; evidências em `docs/TDD-PR-03.md`; descrição para revisão em `docs/PR-03.md`.

