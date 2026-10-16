# Game Reviews — Frontend Web

React, TypeScript estrito e Vite. A terceira fase integra catálogo, autenticação, reviews, comentários, perfis, relações, favoritos, dashboard, Comunidade e notificações à API existente. HTTP é a única fonte de negócio do aplicativo; fixtures/doubles ficam exclusivamente em tests.

## Executar

Em Front, com Node 24 e npm, copie .env.example para .env e ajuste VITE_API_BASE_URL à origem efetiva de Back, sem /api/v1. Execute a API existente com origem CORS permitida para o Vite.

```sh
npm ci
npm run dev
npm run check
```

check executa 401 testes de regressão/contratos, lint, tipos e build. Configuração inválida ou API indisponível produz erro; não existe seletor de modo mock ou fallback para catálogo local.

## E2E com API real

```sh
npx playwright install chromium
npm run test:e2e
```

Playwright 1.64.1 fixado. Requer .NET 10 e o binário Release existente de Back. O runner não compila/altera Back: inicia API própria em 5081 e Vite em 5174, sem proxy ou interceptação. As portas devem estar livres. Duas contas interagem pela UI; 34 operações funcionais são comparadas ao OpenAPI. health/OpenAPI são infraestrutura. Host de teste é reiniciado/encerrado pelo runner, sem parar a API habitual. Veja [execução, evidências e limites](docs/I-PR-07.md).

## Responsabilidades

- src/pages e src/components: interface, usando serviços pelo provider.
- src/services/http: transporte, requests permitidos, DTOs e validação de JSON unknown.
- src/services/runtime.ts: composição HTTP compartilhando cliente e sessão.
- src/session: usuário confirmado, versão e isolamento de ações privadas.
- src/routing: IDs opacos, preservando percentuais literais na navegação.
- tests/doubles: fornecedores/fixtures isolados para testes unitários; nunca importados por src.
- tests/e2e: navegador real e instância própria do backend existente.

## Comportamento

Visitantes consultam catálogo, detalhes, reviews, comentários, perfis e Comunidade. Cadastro não autentica automaticamente. Login confirma auth/me e redireciona à Home autenticada, com avatar/perfil, sino e logout. Escritas privadas exigem Bearer da sessão, sem autorizar por um objeto User recebido pelo serviço.

Nota é recuperada ao reabrir jogo; publicação atualiza reviews; somente o autor edita. Comentários são publicados por outra conta e atualizam a lista pública. Perfis permitem edição do titular; relações e favoritos refletem as respostas da API. Home autenticada usa dashboard agregado, e atualização do feed faz consulta específica. Rankings vêm do servidor e aceitam períodos 24h/7d/30d. Sino consulta notificações ao abrir/reabrir, com foco e Escape.

Sessão fica apenas em memória do navegador. Logout limpa usuário/dados e invalida solicitações anteriores imediatamente, tentando revogação real. 401 privado atual limpa sessão; respostas antigas não recuperam identidade ou dados pessoais. Falhas de rede têm erro/retry, sem fixtures.

## Entrega

[I-PR-07](docs/I-PR-07.md), [TDD](docs/TDD-I-PR-07.md) e [relatório dos endpoints](docs/RELATORIO-ENDPOINTS.md). Os documentos PR-01 a PR-09/TDD-PR-* preservam o histórico da fase anterior; descrições mockadas nesses registros não representam o runtime atual.

Limites: Back continua em memória, com token simulado e IGDB fake. SQL, autenticação de produção e IGDB externa estão fora da fase. A API não gera IDs . ou .., rejeitados pelo transporte antes de fetch; percentuais literais continuam preservados. Branches preparadas localmente; Front não possui remoto configurado. Nenhum merge foi feito.
