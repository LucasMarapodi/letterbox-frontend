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
- `tests`: testes de comportamento e tipos; dados e DOM isolados entre testes.
- `docs`: decisões e evidências de TDD.

Execute uma US por vez. Antes de qualquer comportamento, escreva e execute o teste RED e faça seu commit. Refatorações sem comportamento novo usam testes existentes; não precisam de um RED artificial.

Não publicar contratos provisórios como decisões da API real. Não implementar Mobile, backend, banco, likes ou outras funcionalidades fora da fase.

## Rotas provisórias

`/`, `/jogos/:gameId`, `/reviews/:reviewId`, `/perfil/:userId`, `/login`, `/cadastro` e `/notificacoes`.
As páginas de funcionalidades futuras mostram somente título, ID quando aplicável e aviso de implementação futura. Os links de exemplo na Home são atalhos temporários para verificar a navegação; não representam catálogo, sessão ou dados públicos já existentes.
URLs desconhecidas apresentam mensagem e a navegação permite retornar ao início.
Em hospedagem futura com `BrowserRouter`, configurar fallback dos caminhos para `index.html`.
