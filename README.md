# Game Reviews — Frontend Web

React + TypeScript + Vite. Fundação, catálogo, autenticação, avaliações, reviews, comentários, perfis, favoritos, conexões, feed e notificações das US-01 a US-28, sem backend ou acesso direto à IGDB.

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
Home e detalhes do jogo oferecem catálogo público mockado. Login e cadastro possuem formulários funcionais. Reviews possuem leitura pública, edição do autor e comentários. Perfis públicos mostram biografia, avatar e reviews. Favoritos pessoais de jogos e reviews aparecem na Home e próprio perfil. Notificações são acessadas pelo sino e modal, sem página dedicada. Os links de exemplo na Home permanecem como atalhos temporários de navegação.
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

## Avaliações, reviews e comentários — PR-04

Nos detalhes do jogo, a sessão permite salvar nota e publicar review; quem já publicou encontra o link de edição. A página de review mostra texto completo, autor, jogo, data e comentários públicos. Somente o autor edita; outros usuários podem comentar. Logout remove os formulários autenticados. Nota e review são independentes.

O adaptador `src/services/community.ts` centraliza essas operações. A instância padrão compartilha as opiniões públicas com o catálogo; as factories dos mocks produzem instâncias isoladas para testes. Dados ficam em memória até reload. Comentários na própria review e granularidade das notas permanecem pendentes de definição.

Evidências: `docs/TDD-PR-04.md`. Descrição local para revisão: `docs/PR-04.md`. Branch `feat/pr-04-avaliacoes-reviews-comentarios`, sem merge e sem publicação remota.


## Conexões e feed — PR-06

Seguir e deixar de seguir no perfil, com bloqueio de própria conta, duplicidade e visitantes. Listas públicas de seguidores e seguidos com avatares e links. Feed na Home autenticada mostra reviews de pessoas seguidas por publicação decrescente. Falhas e estados vazios são tratados; alterações refletem na próxima consulta. Relações permanecem em memória.

Branch feat/pr-06-conexoes-feed, derivada da PR-05, sem merge. Evidências em docs/TDD-PR-06.md e descrição local em docs/PR-06.md. Publicação pendente por ausência de remoto.

## Notificações — PR-07

O sino exclusivo da sessão autenticada abre um modal com eventos pessoais mockados, mais recentes primeiro. Modal com teclado, retorno de foco, carregamento/vazio/erro e links para reviews. Logout ou troca de conta fecha e descarta dados. Não há rota exclusiva, contador, status de leitura ou geração automática de eventos.

Branch feat/pr-07-notificacoes sobre PR-06, sem merge. Evidências em docs/TDD-PR-07.md; descrição em docs/PR-07.md. 208 testes, lint, tipos e build aprovados. Publicação pendente por ausência de remoto.

