# Infraestrutura HTTP — terceira fase

A I-PR-02 prepara transporte, contratos e adaptadores. A I-PR-03 ativou autenticação HTTP e a I-PR-04 ativou catálogo e opiniões no runtime produtivo. Perfis/social e Dashboard/Comunidade/sino serão ativados nas I-PR-05 e I-PR-06; a retirada final dos mocks pertence à I-PR-07. Isso não constitui integração completa da aplicação.

## Autenticação ativada — I-PR-03

createDefaultApplicationServices é a entrada produtiva. Cadastro envia somente o request permitido e retorna usuário validado, sem sessão automática. Login envia credenciais, mantém token pendente em memória e consulta me com Bearer antes de divulgar User à UI. A identidade de me deve coincidir com a do login. Cada tentativa invalida anteriores; não há localStorage/sessionStorage.

O store publica mudanças sem divulgar credenciais a componentes. AuthService expõe apenas usuário confirmado, subscribe e versão; SessionProvider limpa UI em logout/401. Logout é assíncrono: captura token, limpa sessão e aborta requests privados imediatamente, depois tenta revogação. Falha de revogação é informada sem restaurar usuário. Respostas antigas não removem conta nova.

Contexto e store compartilham versão; componentes privados usam essa versão nas suas keys para descartar estado anterior. O provider preserva toda a composição, inclusive flags e acesso ao mesmo conjunto HTTP. Capacidades individuais rating/publishReview/editReview/comments estão ativadas; favoritos, relações, feed e notificações privados continuam bloqueados e seus serviços rejeitam acesso. Consultas públicas antigas de outros domínios ficam disponíveis até migração, sem receber identidade da sessão para fabricar perfil local.

## Jogos e opiniões ativados — I-PR-04

GameService consulta catálogo com term/sort, detalhe e opinions públicos sem Bearer. 404 válido no detalhe/review vira ausência; rede, 500 e contrato inválido continuam erro. Capas null, datas sem hora, média null e zero são válidos.

CommunityService possui pontes HTTP para nota pessoal, review própria/publicação/lista, leitura/edição de review e comentários. User recebido pelo contrato legado não autoriza requests: a sessão compartilhada fornece Bearer. Escritas enviam somente value ou text. Ratings e review própria desembrulham os objetos nullable da API.

PUT de nota atualiza nota local validada e consulta jogo/opinions. POST de review atualiza lista por GET reviews; 409 consulta reviews/me para oferecer edição. PATCH retorna projeção validada, mantendo ID/createdAt e atualizando texto/updatedAt; novas visitas consultam a API. POST de comentário refresca a lista sem inserção otimista. 403/404/rede na edição e 400/404/rede no comentário preservam rascunho com mensagens distintas. Logout/401 desmontam formulários e invalidam requests privados anteriores.

Validação: 361 testes, lint, tipos e build; navegador sem interceptações com duas contas, nota cinco ao reabrir, publicação/edição, comentário visível para visitante e origem de API indisponível sem fallback. Harness real redigido verifica status e CORS; detalhes e limites em [I-PR-04](I-PR-04.md).

Cada próxima US deve reutilizar a mesma fábrica/store, implementar a ponte HTTP de seus métodos e habilitar sua capacidade somente após verificar o fluxo. Doubles legados são selecionados apenas em tests/setup.ts; App em execução não usa essa configuração de testes. createApplicationServices/mock continua temporariamente disponível para a suíte/consultas públicas, sem fallback de autenticação.

Validação de navegador em 13/10/2026: Vite http://127.0.0.1:5173 e API existente http://localhost:5080, origens distintas e sem proxy. Conta nova criada/duplicada, login de Ana e da nova conta, credenciais inválidas, logout, reload visitante e navbar sem dados privados mockados. Harness HTTP real verificou 201/409 no cadastro, 200 login/me, 204 logout com zero bytes e 401 do token revogado; headers CORS liberaram a origem do Vite. Nenhum código de Back foi alterado. .env local ignorado foi configurado para a porta de validação.

## Composição

`runtime.ts` exporta `readHttpConfig`, `createHttpAdapters` e `createHttpSessionStore`. `readHttpConfig` recebe `apiBaseUrl` como unknown, exige URL absoluta HTTP(S), rejeita credenciais/query/fragmento e remove barras finais. A base é a origem/caminho de hospedagem, sem `/api/v1`; o cliente acrescenta esse prefixo. `.env.example` usa a porta 5207 do perfil HTTP de Back; ajustar ao endereço efetivamente executado. Configuração inválida interrompe a fábrica HTTP sem recorrer a mocks.

Uma instância de `createHttpAdapters(config, options)` cria um único cliente e uma sessão compartilhada para auth, games, reviews, profiles, social, community e notifications. `options.transport` permite doubles definidos em tests; nenhuma fixture de negócio existe nesses módulos HTTP. As telas continuam acessando serviços por `ServiceProvider`; a adaptação dos contratos da UI e ativação de cada domínio será feita na sua PR, preservando esse provider. A fábrica não instancia transportes fake nem seleciona fallback em produção.

As portas HTTP distinguem consultas do endpoint das composições da UI: `profiles.profile` consulta usuário/reviews, `profiles.connections` consulta followers/following. Não existe request com entidade User como autorização. Request DTOs são reconstruídos com campos permitidos. Relações/favoritos e logout não enviam body. PATCH de perfil preserva omitido versus avatarUrl null.

## Sessão e erros

O adaptador de transporte `http.auth.login` devolve LoginResponse; a ponte HTTP de AuthService implementada na I-US-07 estabelece sessão pendente e executa me antes de devolver User à UI. Token/expiresAt permanecem separados de User e só em memória; nenhuma persistência ou autenticação de produção foi introduzida.

Operações privadas obtêm Bearer do store, nunca de um userId enviado pelo chamador; públicas não enviam token mesmo com sessão. Ausência de sessão rejeita privados antes do transporte. Clear/establish abortam requisições privadas anteriores e alteram a versão; respostas antigas não podem encerrar a sessão nova. 401 privado da versão atual limpa o store, inclusive se o corpo é inválido. 401 público de login não interfere na sessão existente.

O adaptador logout captura o token e limpa o store imediatamente antes da revogação, preservando sessão posterior. Contexto/botão assíncrono e mensagem de revogação não confirmada foram ativados na I-US-08.

HttpFailure discrimina configuration/network/http/contract/cancelled. Status e código seguro ficam disponíveis; mensagens externas, payloads, tokens e exceções de rede não são copiados para a mensagem do erro. 204 não lê JSON. Cada operação pode receber AbortSignal. Cancelamento é identificado para ser ignorado pela UI nas US de fluxo. Não há repetição automática de escritas ou fallback.

## Objetos

JSON entra como unknown. `decoders.ts` reconstrói DTOs nomeados após validar cada campo e lista, sem casts ou supressão de tipos. DTOs estruturalmente compatíveis com modelos são reutilizáveis como User/Game/Rating/Favorite/PublicComment/ReviewDetails/NotificationItem. A projeção da review preserva game.coverUrl além dos campos existentes. Perfil e conexões são composições validadas, não endpoints inventados.

Wrappers rating/review/favorite são nullable explícitos; following é boolean. Média null difere de zero, notas/médias aceitam decimais 0–5. releaseDate é DateOnly válido; instantes são strings ISO com Z ou offset e calendário/horário válidos. Notificações são discriminadas: new-review omite commentId; review-comment exige commentId. Nenhum read é introduzido. Projeções públicas não carregam email, senha/hash/token.

IDs preservam valor nos objetos e usam encodeURIComponent em cada segmento HTTP, separadamente da query URLSearchParams. `%2F` literal vira `%252F` no path. Não usar encodeRouteId da UI no backend. IDs isolados `.` e `..` não têm representação segura no path via fetch, pois o navegador normaliza dot-segments: o transporte os rejeita antes de chamar outro recurso. A API atual não gera esses IDs; eventual suporte depende de convenção explícita de roteamento no backend.

## Evidências e próximos passos

`http-client.test.ts` verifica transporte; `http-decoders.test.ts` verifica contratos; `http-adapters.test.ts` verifica as 34 operações, composições, sessão e falhas com transporte controlado. A injeção existente pelo provider e regressões de UI continuam cobertas por `service-adapters.test.tsx` e pela suíte anterior.

Os testes isolados da I-PR-02 não são E2E e não comprovam CORS ou consumo pelo navegador. Na I-PR-03, autenticação foi exercitada com API real e duas contas conforme as evidências acima; os demais endpoints permanecem PLANEJADO. A ativação subsequente deve mapear erros por operação/status e 404 de detalhe, reutilizar a sessão confirmada, atualizar consultas após escrita e testar duas contas em cada domínio. Banco/IGDB/autenticação de produção continuam fora do escopo.
