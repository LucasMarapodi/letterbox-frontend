# Game Reviews — Frontend Web

React, TypeScript estrito e Vite. A terceira fase integra catálogo, autenticação, reviews, comentários, perfis, relações, favoritos, dashboard, Comunidade e notificações à API existente. HTTP é a única fonte de negócio do aplicativo; fixtures/doubles ficam exclusivamente em tests.

## Executar

Em Front, com Node 24 e npm, copie .env.example para .env e ajuste VITE_API_BASE_URL à origem efetiva de Back, sem /api/v1. Execute a API existente com origem CORS permitida para o Vite.

```sh
npm ci
npm run dev
npm run check
```

check executa a suíte de regressão/contratos, lint, tipos e build. Configuração inválida ou API indisponível produz erro; não existe seletor de modo mock ou fallback para catálogo local.

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
- src/routing: usuários/jogos/reviews com IDs locais inteiros positivos e validação explícita dos parâmetros.
- tests/doubles: fornecedores/fixtures isolados para testes unitários; nunca importados por src.
- tests/e2e: navegador real e instância própria do backend existente.

## Comportamento

Visitantes consultam catálogo, detalhes, reviews, comentários, perfis e Comunidade. Cadastro não autentica automaticamente. Login confirma auth/me e redireciona à Home autenticada, com avatar/perfil, sino e logout. Escritas privadas exigem Bearer da sessão, sem autorizar por um objeto User recebido pelo serviço.

Criar review reúne nota obrigatória (zero válido) e descrição opcional em uma escrita; Editar minha review recupera e salva ambos juntos. Listagens mostram a nota mesmo sem texto, e legados sem nota permanecem legíveis até o autor informar uma na edição. [PR-22: contrato, testes e integração real](docs/S-PR-22.md). Comentários são publicados por outra conta e atualizam a lista pública. Perfis permitem edição do titular; relações e favoritos refletem as respostas da API. Home autenticada usa dashboard agregado, e atualização do feed faz consulta específica. Rankings vêm do servidor e aceitam períodos 24h/7d/30d. Sino consulta notificações ao abrir/reabrir, com foco e Escape.

Início não monta seções de favoritos. Elas permanecem no próprio perfil; Reviews favoritas aparece somente quando há itens. Jogos favoritos usa linhas com capa, nome e resumo. Veja [PR-18](docs/S-PR-18.md), [PR-19](docs/S-PR-19.md) e [PR-20](docs/S-PR-20.md).

No próprio perfil, Completar perfil abre país, estado, descrição, avatar opcional e seleção de pelo menos três jogos distintos. A API confirma a conclusão; editar a bio ou retornar após remover favoritos revalida o estado. [PR-17: contrato, testes pertinentes e integração real](docs/S-PR-17.md).

Reviews nas listagens de Comunidade, feed, jogo e perfil têm estrela para favoritar/remover, com estado compartilhado por página e sessão. O dashboard reaproveita os favoritos do payload agregado. Veja [PR-23](docs/S-PR-23.md).

Busca, limpeza efetiva da busca e troca de tamanho preservam o catálogo montado e a rolagem com overlay bloqueante durante a consulta. Erro libera a tela e oferece retry; operações sem alteração não consultam novamente. Veja [PR-25](docs/S-PR-25.md).

O Início combina nome, gênero, plataforma e ordenação com **Aplicar filtros**. Opções vêm da API, com loading/retry separados; editar o formulário não consulta. Limpar filtros restaura Todos e Últimos lançados, preservando o tamanho. Últimos lançados usa a primeira data de lançamento, exibida nos cartões quando disponível. Veja [PR-06](docs/S-PR-06.md).

Menu público tem busca de pessoas/jogos, debounce de 300 ms, sugestões agrupadas, navegação por teclado e retry de uma categoria. Enter sem seleção abre pesquisa com abas Pessoas/Jogos, 20 itens por página e contexto na URL/histórico. Veja [PR-27](docs/S-PR-27.md) e [PR-28](docs/S-PR-28.md).

A busca fica antes dos links do menu. Itens por página fica à direita na paginação inferior, alinhado ao indicador, preservando as opções 10/20/50. [PR-29 e PR-30](docs/S-PR-29-30.md).

Sessão fica apenas em memória do navegador. Logout limpa usuário/dados e invalida solicitações anteriores imediatamente, tentando revogação real. 401 privado atual limpa sessão; respostas antigas não recuperam identidade ou dados pessoais. Falhas de rede têm erro/retry, sem fixtures.

## Entrega

S-PR-35: Seguir/Deixar de seguir sem nome e com texto estável durante envio. Feed de reviews movido do Início para uma aba da Comunidade, carregada sob demanda; Início deixa de consultar dashboard/feed. [Comportamento e validações](docs/S-PR-35.md).

Correção do layout dos detalhes quando o catálogo está desatualizado: aviso acima da grade, preservando capa/informações/ações ao entrar pela review ou pelo Início. [Regressão visual e evidências](docs/FIX-GAME-STALE-LAYOUT.md).

S-PR-34: perfil com páginas independentes de 3 jogos, 2 reviews por lista e 6 pessoas por lista, usando as coleções completas recebidas da API. Convites textuais para favoritar/criar review removidos; Criar review de visitante abre login diretamente. [Implementação e verificações](docs/S-PR-34.md).

S-PR-33: Editar perfil abre um modal único no cabeçalho do dono, com localização dependente, avatar e seleção de favoritos. Salva alterações parciais por um PATCH da API S-PR-32, sem exigir perfil completo. [Contrato, validação e capturas](docs/S-PR-33.md).

S-PR-09: reviews mostram contagem pública e permitem curtir/descurtir com estado isolado por sessão e confirmação pela API, independentemente dos favoritos. Requer API S-PR-08 com `likeCount` nas projeções e endpoints de curtida. [Implementação, testes e acesso local](docs/S-PR-09.md).

[I-PR-07](docs/I-PR-07.md), [TDD](docs/TDD-I-PR-07.md) e [relatório dos endpoints](docs/RELATORIO-ENDPOINTS.md). Os documentos PR-01 a PR-09/TDD-PR-* preservam o histórico da fase anterior; descrições mockadas nesses registros não representam o runtime atual.

Contratos atuais: identidade, catálogo, opiniões, comentários e favoritos acompanham P-PR-01 a P-PR-05 do Back com PostgreSQL. Usuários/jogos/reviews/notas/comentários/favoritos/notificações e suas referências usam IDs locais numéricos; o identificador externo IGDB é um campo separado. Comentários incluem `parentCommentId` nullable e `likeCount` inteiro não negativo; controles de resposta/curtida dependem de US próprias de interface. As seções de entregas abaixo preservam seus limites históricos; veja as adaptações de [identidade/catálogo](docs/FIX-CONTRATOS-NUMERICOS.md), [opiniões](docs/FIX-P-PR-03.md), [comentários](docs/FIX-P-PR-04.md), [favoritos](docs/FIX-P-PR-05.md) e [notificações](docs/FIX-NOTIFICATION-ID.md). Branches preparadas localmente; Front não possui remoto configurado. Nenhum merge foi feito.

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

## Sexta fase — S-PR-11

Curtidas de comentários/respostas e ajustes visuais solicitados nos cartões e no perfil. 246 testes pertinentes, lint/tipos/build, cinco cenários Chromium sintéticos e integração real aprovados. [Entrega, evidências e dependência da API](docs/S-PR-11.md).

## Sexta fase — S-PR-13

Mais curtidos na Comunidade: comentários/respostas com períodos, paginação, contagens distintas e revalidação após curtida; navegação destaca o comentário na review. 142 testes pertinentes, dois cenários Chromium, lint/tipos/build e API real aprovados. [Entrega e dependências](docs/S-PR-13.md).

## Sexta fase — S-PR-37

Título no formulário e nas reviews, validação condicional/limite, contratos nullable e ordem da API preservada. 156 testes pertinentes, dois Chromium com HTTP sintético, lint/tipos/build aprovados. Integração com PostgreSQL local aguarda migration da S-PR-36. [Entrega e limites](docs/S-PR-37.md).

## Sexta fase — S-PR-24

Estrela à direita da primeira linha do nome no catálogo, detalhe, perfil e Jogos em discussão. Estado compartilhado, sem GET por alvo, com retry, isolamento de sessão e navegação independente. Dois Chromium desktop/mobile, testes pertinentes, lint/tipos/build aprovados. [Entrega e capturas](docs/S-PR-24.md).
