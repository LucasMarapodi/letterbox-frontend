# Relatório da integração IGDB — quarta fase

## Estado

IMPLEMENTAÇÃO LOCAL PARCIAL: G-PR-01, G-PR-02, G-PR-03 e G-PR-04 implementadas e verificadas com transporte simulado. Nenhum token ou consulta real Twitch/IGDB foi executado. Os fluxos live da matriz continuam PLANEJADO. Não gravar credenciais, Authorization, access_token, client_secret ou bodies secretos neste arquivo.

## Evidência local da G-PR-04 — 2026-10-14

Branch `feat/igdb-pr-04-api-casos-uso`, base Back `2c7fac7`. Front `0981a79` intacto e limpo. Entrega descrita em Back/docs/G-PR-04.md; sem remoto Git, não publicada.

- CatalogHttpTests: 11 casos de paginação/defaults, validação antes do fornecedor, detalhe, CORS/metadados, status 502/503/504, OpenAPI e runtime sem fixtures.
- ProjectionHttpTests: 5 casos de IDs repetidos, lote cache/local/faltantes, fornecedor indisponível, metadados agregados e comentários sem catálogo.
- AsyncWriteTests: 6 casos de espera sem lock, concorrência/409, cancelamento, revogação durante espera para review/nota/favorito e edição sem perda de texto ou fetch após commit.
- 354 testes Release aprovados (327 Api, 26 Domain, 1 Application), nenhum ignorado; build com analisadores sem avisos/erros. Regressões anteriores de notas/média local, permissões, social, rankings e rollback permanecem verdes usando fixtures somente em testes.
- Snapshot OpenAPI exportado de API Release temporária em porta livre; somente esse processo foi encerrado. API aberta pelo usuário preservada, outputs de verificação isolados.

Endpoints usam IAsyncGameCatalog; IGameCatalog síncrono e FakeIgdbCatalog removidos. Sem banco/ORM/migration/dependência nova. GET /games mudou para items/page/pageSize/hasNextPage; headers de catálogo expostos via CORS. Escritas preparam projeções antes do trecho atômico, sem I/O nele ou após commit. Cache eviction não impede leitura de jogo conhecido localmente; comentários não consultam fornecedor.

Nenhuma credencial real lida/exposta nem chamada live efetuada. Matriz de navegador/live permanece PLANEJADO. Front não foi alterado: G-PR-05 pendente para adaptação incompatível do envelope e aviso de stale. Reiniciar a API descarta memória; IDs game-* não são migrados para jogos reais.

## Evidência local da G-PR-03 — 2026-10-14

Branch `feat/igdb-pr-03-cache-resiliencia`, base Back `3914c79`. Sem alteração de Front; terceira fase conferida nas evidências já versionadas em Front `0981a79`. Descrição detalhada em Back/docs/G-PR-03.md.

- ResilienceTests: 15 casos de rate rolling, concorrência/fila, retries, Retry-After, timeout/budget compartilhado com 401 e resposta tardia.
- LocalCatalogTests: 6 casos de upsert, metadados, retenção, snapshots completos, isolamento/reinício e cópias imutáveis.
- CatalogCacheTests: 5 casos de TTL/evicção independente, keys/página vazia válida, single-flight, cancelamento/falha sem sucesso falso e disponibilidade durante sobrecarga.
- CatalogCompositionTests: 1 caso de singleton por host e leitura local sem credenciais externas.
- CatalogAvailabilityTests: 11 casos de fallback cache/local, limites de stale, offline, refresh, ausência confirmada, 400/404/401 externos e 504.
- 332 testes Release aprovados (305 Api, 26 Domain, 1 Application), nenhum ignorado; build com analisadores sem erros/avisos. OutputPath isolado preservou a API local. Sem banco, ORM, migrations ou nova dependência de persistência.

As estruturas concretas são memórias separadas; cache expira/evicta e snapshots são limitados, sem apagar jogos locais. Fallback de query usa somente snapshot completo elegível por até 60min após freshness; fetchedAt não é renovado ao repopular cache. Ratelimits/retries assumem uma instância da API, sem coordenação distribuída.

Todas as requisições externas foram simuladas. O catálogo assíncrono está registrado internamente; ativação dos endpoints e headers de metadados pertence à G-PR-04. Isso não prova catálogo real consumido pelo navegador nem smoke live.

## Evidência local da G-PR-02 — 2026-10-14

Branch `feat/igdb-pr-02-catalogo-async`, base Back `5c2ba73`. Terceira fase conferida na entrega Front `0981a79`, I-PR-07 READY_LOCAL: runtime HTTP e artefato I-PR-07-calls.json com chamadas de navegador, infraestrutura e permissões separadas. Evidências anteriores foram lidas; não houve alteração ou reexecução de Front nesta PR.

- AsyncCatalogTests: 13 casos de ordem/early return, página incompleta/stale, IDs ausentes em lote, metadados e cancelamento.
- QueryTests: 13 casos de filtros, limit/offset, sorts, escape de aspas/backslash, lançamento futuro, headers e IDs.
- GameMappingTests/ExternalCatalogTests: 19 casos de DTOs, campos opcionais, capa/data/ID, extras e ratings ignorados, payloads malformados, lookahead, 502 e composição lazy.
- 294 testes Release aprovados (267 Api, 26 Domain, 1 Application), build com analisadores sem avisos/erros; saída isolada preserva API local. Nenhuma dependência de banco/ORM/migrations.

Ordem de portas comprovada com spies; fornecedor tipado comprovado com HttpMessageHandler. Não representam cache/local concretos, consulta live, nova listagem HTTP ou catálogo real observado no navegador. Esses passos seguem nas PRs G-PR-03–05. Descrição e contratos em Back/docs/G-PR-02.md e IGDB-CATALOG.md.

## Evidência local da G-PR-01

Branch `feat/igdb-pr-01-token-seguro` em Back, base `c64bb0a`. Infraestrutura de token iniciada a pedido do usuário, sem alteração de Front e sem declarar a terceira fase validada. Descrição em `Back/docs/G-PR-01.md`; configuração e limites em `Back/docs/IGDB-AUTH.md`.

- CredentialTests: 11 casos de opções, falhas sem valores, clientes sem logging/redirects, health/OpenAPI e lookups atuais com zero chamadas externas.
- OAuthTests: 19 casos de form body, endpoint fixo, DTO/expiração, HTTP/JSON inválidos, cancelamento e timeout sanitizado.
- TokenProviderTests: 8 casos de aquisição compartilhada, expiração/margem, vida curta, 401 atrasado, cancelamento individual e falha compartilhada com recuperação posterior.
- AuthenticatedClientTests: 5 casos de headers e body mínimo interno, recuperação única, 401 persistente e outros status sem renovação/retry nessa camada.
- PlatformIsolationTests: 2 casos de 503 seguro após 401 externo mantendo auth/me 200, e ausência de probes externos no host produtivo.
- Suíte Release: 249 aprovados, nenhum ignorado; build com analisadores: zero erros/avisos. Saída `bin/IgdbValidation` para preservar uma API já em execução. Sem banco/ORM/migrations adicionados.

As chamadas foram interceptadas por HttpMessageHandler de teste. Não constituem emissão live, consumo de catálogo real ou validação de navegador. Cache de catálogo/local/IGDB ainda não foi implementado nesta entrega. A terceira fase continua pendente de validação final no planejamento.

## Fluxos a verificar

| Fluxo | Origem e destino | Momento | Dados | US | Validação |
| --- | --- | --- | --- | --- | --- |
| Token de aplicação | Back -> POST https://id.twitch.tv/oauth2/token | Primeiro acesso sem token válido e renovação | Form de client credentials; token interno | G-US-02–03 | PLANEJADO |
| Catálogo inicial | Front -> Back -> cache -> catálogo local -> IGDB se necessário | Abrir Início sem termo | Lançamentos já publicados, página e campos selecionados | G-US-05,10,13 | PLANEJADO |
| Busca/página | Front -> Back -> cache -> catálogo local -> IGDB se necessário | Buscar, ordenar, próxima/anterior | Termo, sort, page/pageSize; envelope paginado | G-US-05,10,13 | PLANEJADO |
| Detalhe de jogo | Front -> Back -> cache -> catálogo local -> IGDB se necessário | Abrir jogo da lista | GameResponse com ID estável e média local | G-US-06,10,13 | PLANEJADO |
| Projeções locais | Front -> Back -> cache/local em lote -> IGDB só para faltantes | Ler conteúdo local com referências a jogos | Jogos reais normalizados, metadados agregados | G-US-11 | PLANEJADO |
| Escritas locais | Front -> nota/review/favorito -> Back | Ação de usuário com token local | Referência real validada fora do lock; regra local dentro | G-US-12,17 | PLANEJADO |
| Cache fresco | Back -> cache em memória | Repetir query/chave dentro do TTL | Payload real reutilizado, sem consulta extra | G-US-08 | PLANEJADO |
| Catálogo local | Back -> repositório local em memória -> cache | Cache miss com jogo/snapshot local utilizável | Retorno sem IGDB, fetchedAt original | G-US-19,08,11 | PLANEJADO |
| Descoberta externa | Back -> IGDB -> catálogo local -> cache | Miss/insuficiência nas duas camadas | Normalizar e armazenar primeiro localmente | G-US-08 | PLANEJADO |
| Stale | Back -> cache/local permitido -> Front | Falha transitória com entrada utilizável | Dados reais, X-Catalog-Stale e data; aviso na UI | G-US-09,14 | PLANEJADO |
| Falha sem dado local utilizável | Back -> erro -> Front | Falha externa sem cache nem catálogo capazes de atender | 502/503/504 sem segredo; tentar novamente | G-US-09,14 | PLANEJADO |

## Contratos e objetos

- G-US-04: portas separadas de cache, catálogo local e fornecedor; resolução assíncrona de busca/detalhe/lote.
- G-US-19: repositório local em memória com jogos reais e snapshots de páginas; expirar cache não apaga catálogo.
- G-US-06: DTO IGDB traduzido para Game sem contaminar Domain.
- G-US-10: listagem passa de array para items/page/pageSize/hasNextPage; detalhe preserva formato normalizado.
- G-US-13: adaptador TypeScript deve tratar a mudança de envelope.
- Headers de cache precisam ser expostos por CORS e interpretados pelo cliente sem request adicional.
- IDs antigos de fixtures não são correspondências reais. Registrar transição/reinício da memória, sem apagar histórico de repositórios.

## Evidências exigidas na conclusão

Para cada fluxo: cenário/arquivo de teste, resultado e comportamento observado; informar quando foi transporte simulado e quando foi smoke real. Não apresentar teste com handler fake como consulta real.

- Configuração por variáveis do processo e validação sem exposição: VERIFICADO EM TESTES, configuração real não executada.
- Aquisição real de token, sem registrar seu valor: PENDENTE.
- Expiração/renovação/concurrency em testes com relógio: VERIFICADO EM TESTES, arquivos acima.
- Query/campos/normalização/paginação: PENDENTE.
- Ordem cache -> catálogo local -> IGDB e contagem zero de chamadas no local hit: PENDENTE.
- Catálogo local separado do cache, retenção dos jogos referenciados e snapshots completos: PENDENTE.
- Ausência de criação/consumo de banco, ORM, migrations ou conexão: PENDENTE.
- Cache/limites/retry/timeout/stale: PENDENTE.
- Escritas locais, projeções e ausência de N+1/I/O em lock: PENDENTE.
- Navegador com dados reais e sem chamadas à API IGDB/Twitch: PENDENTE.
- CORS e leitura dos headers de cache: PENDENTE.
- Segredos ausentes de logs, responses, diffs/commits da entrega e bundle: PENDENTE.
- Testes, builds, análises e regressões: PENDENTE.
- Revisão das condições de uso/atribuição aplicáveis e fontes: PENDENTE.
- PRs reais, dependências e limitações: PENDENTE.

## Limitações conhecidas do plano

- Uma instância da API; cache, catálogo local e dados de usuários em memória. Reinício perde todas essas estruturas, sem persistência.
- Nenhum banco será criado ou consumido, nem SQL/SQLite/ORM/migrations. Catálogo local desta fase não é database persistente; sincronização completa fica fora do escopo.
- Paginação offset não representa snapshot imutável de um catálogo que muda externamente; não prometer navegação sem qualquer mudança entre consultas.
- Autenticação da plataforma continua simulada; token Twitch é server-to-server.
- Smoke real depende de configuração válida e serviço externo disponível.

## Referências

- [Twitch OAuth client credentials](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow)
- [IGDB API](https://api-docs.igdb.com/)

Atualizar este arquivo na G-US-18. Nenhuma pendência pode ser declarada VALIDADA sem evidência correspondente.

## G-PR-05 — Front implementado, live separado (2026-10-14)

Branch feat/igdb-pr-05-front-paginacao, base 0981a79, terceira fase integrada conferida. Dependência Back fec0fa8 com G-PR-01–04, sem alteração nesta entrega. G-US-13–14 concluídas com commits RED/conclusão, 415 testes, lint, tipos e build.

- Envelope GamePageResponse validado em Front; array antigo rejeitado. Recentes release-desc, busca, sort, anterior/próxima e página resetada. Ordem dos itens vem do servidor; nenhum total inventado.
- Metadata lida na resposta HTTP e guardada separadamente de entidades por operação/versão, com limite. Stale/data original nos fluxos de catálogo/projeções; fresh/ausente não avisam. Retry sem request só para headers. 502/503/504 mantêm sessão, 401 privado limpa sessão.
- Browser determinístico: Front 5175/servidor de contrato sintético 5091, paginação/stale/fresh/erro/retry e CORS dos headers aprovados, zero chamadas externas. Não é prova de IGDB live. Front/docs/evidence/G-PR-05-contract-calls.json identifica mode sintético; captura G-PR-05-catalog-contract.png usa dados de teste.
- Contrato real de Back: binário existente bin/IgdbValidation executado temporariamente em 5083, health/OpenAPI 200, GamePageResponse e exposição CORS de X-Catalog-Stale/X-Catalog-Fetched-At confirmados. Host encerrado após diagnóstico; sem OAuth/consulta IGDB. Evidência Front/docs/evidence/G-PR-05-backend-contract.json.
- API habitual em 5080 usa binário Release antigo da terceira fase, somente Location exposto. Isso não foi declarado compatível com novo envelope. A execução integrada requer binário atualizado, origem CORS/porta corretas e configuração IGDB exclusivamente no backend para novas descobertas.
- Nenhum banco, segredo ou cliente Twitch/IGDB no Front; nenhum backend alterado. Smoke live e navegador com dados reais continuam G-PR-06/G-PR-07, não são marcados validados por testes sintéticos. E2E da terceira fase conserva cenário game-* histórico; adaptação para IDs descobertos pertence à G-US-17.

Descrição versionada: Front/docs/G-PR-05.md, TDD em Front/docs/TDD-G-PR-05.md. READY_LOCAL sem remoto/merge. Fluxos de Front implementados/validados deterministicamente; não alterar PLANEJADO de fluxo live para VALIDADO sem observação real.
