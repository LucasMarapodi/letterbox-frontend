# Game Reviews — Frontend Web

React + TypeScript + Vite. Fundação das US-01 a US-06, sem backend ou acesso direto à IGDB.

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

`/`, `/jogos/:gameId`, `/reviews/:reviewId`, `/perfil/:userId`, `/login`, `/cadastro` e `/notificacoes`.
As páginas de funcionalidades futuras mostram somente título, ID quando aplicável e aviso de implementação futura. Os links de exemplo na Home são atalhos temporários para verificar a navegação; não representam catálogo, sessão ou dados públicos já existentes.
URLs desconhecidas apresentam mensagem e a navegação permite retornar ao início.
Em hospedagem futura com `BrowserRouter`, configurar fallback dos caminhos para `index.html`.

## Componentes básicos

`Button` usa botão nativo e não submete formulários por padrão. `TextField` associa seu rótulo com ID próprio ou fornecido. `GameCard` oferece link com ID codificado. `Avatar` oferece iniciais sem foto ou quando a imagem falha. `LoadingState`, `ErrorState` e `EmptyState` recebem mensagens; o erro pode oferecer uma nova tentativa.

A Home tem uma prévia explícita para o primeiro uso desses componentes: texto local que pode ser limpo, avatar de visitante e um único cartão fictício lido pelo serviço. Isso não implementa busca, catálogo, login, review ou persistência das fases seguintes. Os testes da prévia fornecem um serviço substituto e cobrem carregamento, ausência e rejeição com recuperação.
