# Infraestrutura HTTP — terceira fase

A I-PR-02 prepara transporte, contratos e adaptadores. Os domínios só serão ativados pelas suas US de fluxo (I-PR-03 a I-PR-06). A aplicação atual ainda usa os serviços anteriores; preencher uma URL não ativa HTTP nem constitui integração completa. A retirada final dos mocks pertence à I-PR-07.

## Composição

`runtime.ts` exporta `readHttpConfig`, `createHttpAdapters` e `createHttpSessionStore`. `readHttpConfig` recebe `apiBaseUrl` como unknown, exige URL absoluta HTTP(S), rejeita credenciais/query/fragmento e remove barras finais. A base é a origem/caminho de hospedagem, sem `/api/v1`; o cliente acrescenta esse prefixo. `.env.example` usa a porta 5207 do perfil HTTP de Back; ajustar ao endereço efetivamente executado. Configuração inválida interrompe a fábrica HTTP sem recorrer a mocks.

Uma instância de `createHttpAdapters(config, options)` cria um único cliente e uma sessão compartilhada para auth, games, reviews, profiles, social, community e notifications. `options.transport` permite doubles definidos em tests; nenhuma fixture de negócio existe nesses módulos HTTP. As telas continuam acessando serviços por `ServiceProvider`; a adaptação dos contratos da UI e ativação de cada domínio será feita na sua PR, preservando esse provider. A fábrica não instancia transportes fake nem seleciona fallback em produção.

As portas HTTP distinguem consultas do endpoint das composições da UI: `profiles.profile` consulta usuário/reviews, `profiles.connections` consulta followers/following. Não existe request com entidade User como autorização. Request DTOs são reconstruídos com campos permitidos. Relações/favoritos e logout não enviam body. PATCH de perfil preserva omitido versus avatarUrl null.

## Sessão e erros

`auth.login` devolve LoginResponse validado, sem autenticar a UI automaticamente. A I-US-07 deverá estabelecer a sessão pendente e executar `auth.me` antes de liberar o usuário conectado. Token/expiresAt permanecem separados de User e só em memória; nenhuma persistência ou autenticação de produção foi introduzida.

Operações privadas obtêm Bearer do store, nunca de um userId enviado pelo chamador; públicas não enviam token mesmo com sessão. Ausência de sessão rejeita privados antes do transporte. Clear/establish abortam requisições privadas anteriores e alteram a versão; respostas antigas não podem encerrar a sessão nova. 401 privado da versão atual limpa o store, inclusive se o corpo é inválido. 401 público de login não interfere na sessão existente.

O adaptador logout envia a operação de revogação e limpa o store mesmo se ela falhar, preservando sessão posterior. A integração do contexto/botão assíncrono, limpeza imediata da UI e mensagem de revogação não confirmada pertencem à I-US-08; ainda não estão ativadas nas telas.

HttpFailure discrimina configuration/network/http/contract/cancelled. Status e código seguro ficam disponíveis; mensagens externas, payloads, tokens e exceções de rede não são copiados para a mensagem do erro. 204 não lê JSON. Cada operação pode receber AbortSignal. Cancelamento é identificado para ser ignorado pela UI nas US de fluxo. Não há repetição automática de escritas ou fallback.

## Objetos

JSON entra como unknown. `decoders.ts` reconstrói DTOs nomeados após validar cada campo e lista, sem casts ou supressão de tipos. DTOs estruturalmente compatíveis com modelos são reutilizáveis como User/Game/Rating/Favorite/PublicComment/ReviewDetails/NotificationItem. A projeção da review preserva game.coverUrl além dos campos existentes. Perfil e conexões são composições validadas, não endpoints inventados.

Wrappers rating/review/favorite são nullable explícitos; following é boolean. Média null difere de zero, notas/médias aceitam decimais 0–5. releaseDate é DateOnly válido; instantes são strings ISO com Z ou offset e calendário/horário válidos. Notificações são discriminadas: new-review omite commentId; review-comment exige commentId. Nenhum read é introduzido. Projeções públicas não carregam email, senha/hash/token.

IDs preservam valor nos objetos e usam encodeURIComponent em cada segmento HTTP, separadamente da query URLSearchParams. `%2F` literal vira `%252F` no path. Não usar encodeRouteId da UI no backend. IDs isolados `.` e `..` não têm representação segura no path via fetch, pois o navegador normaliza dot-segments: o transporte os rejeita antes de chamar outro recurso. A API atual não gera esses IDs; eventual suporte depende de convenção explícita de roteamento no backend.

## Evidências e próximos passos

`http-client.test.ts` verifica transporte; `http-decoders.test.ts` verifica contratos; `http-adapters.test.ts` verifica as 34 operações, composições, sessão e falhas com transporte controlado. A injeção existente pelo provider e regressões de UI continuam cobertas por `service-adapters.test.tsx` e pela suíte anterior.

Esses testes não são E2E e não comprovam CORS ou consumo de negócios pelo navegador. Não houve chamada real à API nesta PR. A matriz conserva endpoints como PLANEJADO até suas validações com API real. A ativação subsequente deve mapear erros por operação/status e 404 de detalhe, confirmar sessão por me, atualizar consultas após escrita e testar duas contas. Banco/IGDB/autenticação de produção continuam fora do escopo.
