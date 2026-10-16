# Game Reviews — Frontend Web

React, TypeScript estrito e Vite. A terceira fase integra catálogo, autenticação, reviews, comentários, perfis, relações, favoritos, dashboard, Comunidade e notificações à API existente. HTTP é a única fonte de negócio do aplicativo; fixtures/doubles ficam exclusivamente em tests.

## Executar

Em Front, com Node 24 e npm, copie .env.example para .env e ajuste VITE_API_BASE_URL à origem efetiva de Back, sem /api/v1. Execute a API existente com origem CORS permitida para o Vite.

```sh
npm ci
npm run dev
npm run check
```

check executa 537 testes de regressão/contratos, lint, tipos e build. Configuração inválida ou API indisponível produz erro; não existe seletor de modo mock ou fallback para catálogo local.

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
- src/routing: usuários/jogos com IDs locais inteiros positivos; reviews com IDs opacos, preservando percentuais literais na navegação.
- tests/doubles: fornecedores/fixtures isolados para testes unitários; nunca importados por src.
- tests/e2e: navegador real e instância própria do backend existente.

## Comportamento

Visitantes consultam catálogo, detalhes, reviews, comentários, perfis e Comunidade. Cadastro não autentica automaticamente. Login confirma auth/me e redireciona à Home autenticada, com avatar/perfil, sino e logout. Escritas privadas exigem Bearer da sessão, sem autorizar por um objeto User recebido pelo serviço.

Nota é recuperada ao reabrir jogo; publicação atualiza reviews; somente o autor edita. Comentários são publicados por outra conta e atualizam a lista pública. Perfis permitem edição do titular; relações e favoritos refletem as respostas da API. Home autenticada usa dashboard agregado, e atualização do feed faz consulta específica. Rankings vêm do servidor e aceitam períodos 24h/7d/30d. Sino consulta notificações ao abrir/reabrir, com foco e Escape.

Início não monta seções de favoritos. Elas permanecem no próprio perfil; Reviews favoritas aparece somente quando há itens. Veja [PR-18](docs/S-PR-18.md) e [PR-19](docs/S-PR-19.md).

Sessão fica apenas em memória do navegador. Logout limpa usuário/dados e invalida solicitações anteriores imediatamente, tentando revogação real. 401 privado atual limpa sessão; respostas antigas não recuperam identidade ou dados pessoais. Falhas de rede têm erro/retry, sem fixtures.

## Entrega

[I-PR-07](docs/I-PR-07.md), [TDD](docs/TDD-I-PR-07.md) e [relatório dos endpoints](docs/RELATORIO-ENDPOINTS.md). Os documentos PR-01 a PR-09/TDD-PR-* preservam o histórico da fase anterior; descrições mockadas nesses registros não representam o runtime atual.

Contratos atuais: identidade e catálogo acompanham P-PR-01/P-PR-02 do Back com PostgreSQL. Usuários/jogos usam IDs locais numéricos; o identificador externo IGDB é um campo separado. IDs próprios das demais entidades continuam textuais nesta etapa. As seções de entregas abaixo preservam seus limites históricos; veja a [adaptação atual](docs/FIX-CONTRATOS-NUMERICOS.md). Branches preparadas localmente; Front não possui remoto configurado. Nenhum merge foi feito.

## Quarta fase — G-PR-05

Catálogo agora usa GamePageResponse, Recentes e páginas do servidor; headers stale/fetchedAt são exibidos sem request extra. 415 testes/check e navegador determinístico aprovados. Veja [entrega e limites](docs/G-PR-05.md). npm run test:e2e:catalog verifica o contrato com servidor sintético; não é IGDB live. O cenário npm run test:e2e da terceira fase precisa da adaptação planejada para IDs descobertos na G-US-17. Executar Back atualizado para novo envelope; a API antiga de 5080 não é compatível.

## Sexta fase — S-PR-01

Sair volta imediatamente ao Início usando replace, preservando revogação/aviso, limpeza e invalidação da sessão. 422 testes, lint, tipos e build aprovados; teste de perfil -> logout -> Home visitante confirmado em navegador/API local. [Descrição e limites](docs/S-PR-01.md). O checklist geral de IDs inteiros permanece pendente da migração da quinta fase; este ajuste preserva o contrato atual.

## Sexta fase — S-PR-02

Consultas indicam loading com status acessível e aria-busy, ocultando resultado/vazio antigos durante atualização. Regiões independentes continuam utilizáveis; falha na consulta da review própria oferece retry. 443 testes, lint, tipos, build e E2E Chromium determinístico aprovados. [Auditoria e limites](docs/S-PR-02.md). Execute `npm exec playwright test -- --config playwright.loading.config.ts` para o cenário sintético; portas 5175/5091 livres. Não é validação IGDB live. O critério global de IDs inteiros continua pendente.

## Sexta fase — S-PR-03

Logout tem trava síncrona e informa revogação pendente sem bloquear novo login/navegação. Comentário e edição de review limpam sucesso anterior ao tentar novamente. Proteções das demais mutações auditadas e verificadas com HTTP pendente. 459 testes, lint, tipos, build e E2E Chromium sintético aprovados. [Auditoria e limites](docs/S-PR-03.md). Execute `npm exec playwright test -- --config playwright.mutations.config.ts`, com portas 5175/5091 livres. Marcar notificações não existe no contrato atual; IDs inteiros seguem pendentes da migração própria.

## Sexta fase — S-PR-04

Catálogo permite 10/20/50 jogos por página, padrão 20; troca volta à primeira página preservando busca/ordenação e exibe contagem realmente retornada. 469 testes, lint, tipos, build e E2E Chromium sintético aprovados. [Descrição, capturas e limites](docs/S-PR-04.md). Execute `npm exec playwright test -- --config playwright.page-size.config.ts`, com portas 5175/5091 livres. Backend e contratos de IDs opacos preservados; migração de IDs inteiros segue pendente.

## Sexta fase — S-PR-14

Cadastro confirmado abre login com replace e mensagem de sucesso, sem autenticar nem transferir credenciais. Falhas mantêm formulário e permitem retry. 479 testes, lint, tipos, build e E2E Chromium sintético aprovados. [Descrição e PRs intermediárias pendentes por backend](docs/S-PR-14.md). Execute `npm exec playwright test -- --config playwright.registration.config.ts`, com portas 5175/5091 livres. IDs inteiros seguem pendentes da migração própria.

## Sexta fase — S-PR-15

Limpar busca sem termo não consulta nem reinicia a página. Rascunho é apagado localmente; busca aplicada é removida uma única vez, preservando tamanho/ordenação. Duas guardas locais, sem alterar contratos ou Back. 488 testes, lint, tipos, build e E2E Chromium sintético aprovados. [Descrição e evidência](docs/S-PR-15.md). Execute `npm exec playwright test -- --config playwright.clear-search.config.ts`, com portas 5175/5091 livres.
