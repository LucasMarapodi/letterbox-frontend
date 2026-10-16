# Relatório de endpoints e fluxos — terceira fase

## Estado

Entrega validada em 2026-10-14: 34 funcionais observados por ações de UI em Chromium contra API real. Health/OpenAPI verificados como infraestrutura. Chamadas redigidas em Front/docs/evidence/I-PR-07-calls.json; origens 127.0.0.1:5174 e 127.0.0.1:5081, sem proxy/interceptação. READY_LOCAL, sem merge/publicação remota. Registros históricos abaixo descrevem a situação de cada PR na sua data, não pendências atuais.

## Critério de evidência e contratos

Cada entrada identifica fluxo, momento, chamador final, request/response tipados e evidência real. resposta_contrato_e_status lista o contrato completo; status_observados lista somente respostas realmente capturadas nesta jornada. Erros verificados por cliente de permissões são separados de UI.

VALIDADO exige evidência de método, rota, status e cenário na API real. Teste unitário com fetch fake, implementação de adaptador ou presença em OpenAPI não prova consumo de interface. Endpoint sem consumo deve ficar PENDENTE com justificativa e bloquear a conclusão dos funcionais.

Não registrar token, senha, Authorization, corpos secretos ou dados pessoais desnecessários. Referenciar arquivo de teste/cenário e evidência redigida. A última entrega versiona uma cópia em Front/docs.

## Inventário e leitura

- 34 endpoints funcionais da aplicação.
- GET /health: readiness e diagnóstico; sem botão artificial na UI.
- GET /openapi/v1.json: inventário e testes de contratos; não é funcionalidade de usuário.
- Origem de Front e Back devem ser distintas na validação CORS.
- Chamadas adicionais devem ter propósito real de atualização, sem executar rotas redundantes só para marcar cobertura.
- Respostas de falha de rede/CORS não possuem necessariamente status HTTP legível; não inventar status.

## Preparação de backend — I-PR-01

Em 2026-10-13, a branch `feat/integracao-pr-01-cors` de Back preparou CORS e revisou os 34 endpoints funcionais, health e OpenAPI. Evidências HTTP: `Back/tests/Tcc.Api.Tests/Validation/CorsTests.cs`, `ConsumerWireContractTests.cs`, `OpenApiTests.cs`, `PermissionMatrixTests.cs` e suítes de Identity/Opinions/Social/Feeds. Inventário, formatos e configuração estão em `Back/docs/HTTP-INTEGRATION.md` e `Back/docs/CORS.md`.

Isso verifica contratos e headers em WebApplicationFactory. Nenhuma chamada de negócio foi observada no navegador nesta PR; Front não foi alterado. Os estados de consumo abaixo permanecem PLANEJADO, inclusive a validação final de navegador com origens distintas. Esta preparação não representa consumo VALIDADO da interface.
## E01 — GET /health

- acesso: Público, infraestrutura
- fluxo: Inicialização E2E/diagnóstico
- momento_chamada: Antes de executar fluxos com API real
- request_tipado: Sem body
- resposta_contrato_e_status: 200 HealthResponse
- us_responsavel: [I-US-23](../../terceira-fase/Us/I-US-23.md)
- status_validacao: VALIDADO
- chamador_observado: Harness E2E start/readiness -> GET health (infraestrutura)
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=infrastructure; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_infrastructure: 200

## E02 — POST /api/v1/auth/register

- acesso: Público
- fluxo: Cadastro
- momento_chamada: Ao enviar formulário válido
- request_tipado: RegisterRequest {name,email,password}; somente campos permitidos, valores omitidos
- resposta_contrato_e_status: 201 PublicUserResponse; 400/409
- us_responsavel: [I-US-06](../../terceira-fase/Us/I-US-06.md)
- status_validacao: VALIDADO
- chamador_observado: RegisterPage -> AuthService.register -> http.auth.register
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 201, 409

## E03 — POST /api/v1/auth/login

- acesso: Público
- fluxo: Login
- momento_chamada: Ao enviar credenciais
- request_tipado: LoginRequest {email,password}; valores omitidos
- resposta_contrato_e_status: 200 LoginResponse token/expiresAt/user; 400/401
- us_responsavel: [I-US-07](../../terceira-fase/Us/I-US-07.md)
- status_validacao: VALIDADO
- chamador_observado: LoginPage -> SessionProvider.signIn -> AuthService.login -> http.auth.login
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E04 — POST /api/v1/auth/logout

- acesso: Autenticado
- fluxo: Sair
- momento_chamada: Ao clicar Sair, capturando token antes de limpar store
- request_tipado: Sem body; Bearer redigido
- resposta_contrato_e_status: 204; 401 quando sessão inválida
- us_responsavel: [I-US-08](../../terceira-fase/Us/I-US-08.md)
- status_validacao: VALIDADO
- chamador_observado: App -> SessionProvider.signOut -> AuthService.logout -> http.auth.logout
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 204

## E05 — GET /api/v1/auth/me

- acesso: Autenticado
- fluxo: Confirmar sessão
- momento_chamada: Após login válido e antes de liberar estado autenticado
- request_tipado: Bearer; sem body
- resposta_contrato_e_status: 200 PublicUserResponse; 401
- us_responsavel: [I-US-07](../../terceira-fase/Us/I-US-07.md)
- status_validacao: VALIDADO
- chamador_observado: AuthService.login -> http.auth.me antes de confirmar usuário
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E06 — GET /api/v1/users/{userId}

- acesso: Público
- fluxo: Perfil
- momento_chamada: Ao entrar ou atualizar perfil público
- request_tipado: ID codificado no path
- resposta_contrato_e_status: 200 PublicUserResponse; 404
- us_responsavel: [I-US-15](../../terceira-fase/Us/I-US-15.md)
- status_validacao: VALIDADO
- chamador_observado: ProfilePage -> community.getProfile -> profiles.profile/get
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E07 — PATCH /api/v1/users/me/profile

- acesso: Autenticado
- fluxo: Editar meu perfil
- momento_chamada: Ao salvar formulário do titular
- request_tipado: ProfilePatchRequest {displayName?,bio?,avatarUrl?}; omitido preserva, null remove avatar
- resposta_contrato_e_status: 200 PublicUserResponse atualizado; 400/401
- us_responsavel: [I-US-16](../../terceira-fase/Us/I-US-16.md)
- status_validacao: VALIDADO
- chamador_observado: ProfileEditor -> AuthService.editProfile -> profiles.edit
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E08 — GET /api/v1/users/{userId}/reviews

- acesso: Público
- fluxo: Reviews do perfil
- momento_chamada: Na composição/carregamento de perfil
- request_tipado: ID no path
- resposta_contrato_e_status: 200 ReviewResponse[]; 404
- us_responsavel: [I-US-15](../../terceira-fase/Us/I-US-15.md)
- status_validacao: VALIDADO
- chamador_observado: ProfilePage -> community.getProfile -> profiles.reviews
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E09 — GET /api/v1/users/{userId}/followers

- acesso: Público
- fluxo: Conexões do perfil
- momento_chamada: Ao abrir perfil e após alterar relação
- request_tipado: ID no path
- resposta_contrato_e_status: 200 PublicUserResponse[]; 404
- us_responsavel: [I-US-15](../../terceira-fase/Us/I-US-15.md)
- status_validacao: VALIDADO
- chamador_observado: ConnectionsSections -> community.getConnections -> profiles.followers
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E10 — GET /api/v1/users/{userId}/following

- acesso: Público
- fluxo: Conexões do perfil
- momento_chamada: Ao abrir perfil e após alterar relação
- request_tipado: ID no path
- resposta_contrato_e_status: 200 PublicUserResponse[]; 404
- us_responsavel: [I-US-15](../../terceira-fase/Us/I-US-15.md)
- status_validacao: VALIDADO
- chamador_observado: ConnectionsSections -> community.getConnections -> profiles.following
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E11 — GET /api/v1/games

- acesso: Público
- fluxo: Catálogo em Início
- momento_chamada: Ao abrir Home, enviar/limpar busca, ordenar ou tentar novamente
- request_tipado: GameQuery {term?,sort?}; consulta pública sem body
- resposta_contrato_e_status: 200 GameResponse[]; 400
- us_responsavel: [I-US-10](../../terceira-fase/Us/I-US-10.md)
- status_validacao: VALIDADO
- chamador_observado: HomePage -> GameService.list -> games.list
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E12 — GET /api/v1/games/{gameId}

- acesso: Público
- fluxo: Detalhes do jogo
- momento_chamada: Ao abrir detalhes e atualizar campos afetados por nota
- request_tipado: ID codificado
- resposta_contrato_e_status: 200 GameResponse; 404
- us_responsavel: [I-US-10](../../terceira-fase/Us/I-US-10.md)
- status_validacao: VALIDADO
- chamador_observado: GameDetailsPage -> GameService.getById -> games.get
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E13 — GET /api/v1/games/{gameId}/opinions

- acesso: Público
- fluxo: Média e opiniões iniciais
- momento_chamada: Ao abrir discussão do jogo e após salvar nota
- request_tipado: ID codificado
- resposta_contrato_e_status: 200 GameOpinionsResponse; média null ou zero; 404
- us_responsavel: [I-US-10](../../terceira-fase/Us/I-US-10.md)
- status_validacao: VALIDADO
- chamador_observado: GameOpinionsSection -> GameService.getOpinions -> games.opinions
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E14 — GET /api/v1/games/{gameId}/rating/me

- acesso: Autenticado
- fluxo: Consultar minha nota
- momento_chamada: Ao abrir detalhes com sessão ou trocar usuário
- request_tipado: Bearer; ID do jogo
- resposta_contrato_e_status: 200 MyRatingResponse rating nullable; 401/404
- us_responsavel: [I-US-11](../../terceira-fase/Us/I-US-11.md)
- status_validacao: VALIDADO
- chamador_observado: RatingForm -> community.getRating -> games.myRating
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E15 — PUT /api/v1/games/{gameId}/rating/me

- acesso: Autenticado
- fluxo: Avaliar jogo
- momento_chamada: Ao salvar nota
- request_tipado: RatingRequest {value}; Bearer em memória
- resposta_contrato_e_status: 200 RatingResponse; 400/401/404
- us_responsavel: [I-US-11](../../terceira-fase/Us/I-US-11.md)
- status_validacao: VALIDADO
- chamador_observado: RatingForm -> community.rate -> games.rate
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E16 — GET /api/v1/games/{gameId}/reviews

- acesso: Público
- fluxo: Atualizar lista de reviews do jogo
- momento_chamada: Após publicação válida e em refresh específico da lista
- request_tipado: ID do jogo
- resposta_contrato_e_status: 200 ReviewResponse[]; 404
- us_responsavel: [I-US-12](../../terceira-fase/Us/I-US-12.md)
- status_validacao: VALIDADO
- chamador_observado: GameOpinionsSection após PublishReview -> community.getGameReviews -> games.reviews
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E17 — GET /api/v1/games/{gameId}/reviews/me

- acesso: Autenticado
- fluxo: Decidir publicar ou editar
- momento_chamada: Ao abrir controle de publicação e após conflito 409
- request_tipado: Bearer; ID do jogo
- resposta_contrato_e_status: 200 MyReviewResponse review nullable; 401/404
- us_responsavel: [I-US-12](../../terceira-fase/Us/I-US-12.md)
- status_validacao: VALIDADO
- chamador_observado: PublishReview -> community.findOwnReview -> games.myReview
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E18 — POST /api/v1/games/{gameId}/reviews

- acesso: Autenticado
- fluxo: Publicar review
- momento_chamada: Ao enviar texto no jogo
- request_tipado: TextRequest {text}; Bearer em memória
- resposta_contrato_e_status: 201 ReviewResponse; 400/401/404/409
- us_responsavel: [I-US-12](../../terceira-fase/Us/I-US-12.md)
- status_validacao: VALIDADO
- chamador_observado: PublishReview -> community.publish -> games.publish
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 201
- status_verificados_api_permissoes: 409 (cliente real, não UI)

## E19 — GET /api/v1/reviews/{reviewId}

- acesso: Público
- fluxo: Ler review
- momento_chamada: Ao abrir review pelo jogo, perfil, feed ou sino
- request_tipado: ID codificado
- resposta_contrato_e_status: 200 ReviewResponse; 404
- us_responsavel: [I-US-13](../../terceira-fase/Us/I-US-13.md)
- status_validacao: VALIDADO
- chamador_observado: ReviewPage -> community.getReview -> reviews.get
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E20 — PATCH /api/v1/reviews/{reviewId}

- acesso: Autor autenticado
- fluxo: Editar review
- momento_chamada: Ao salvar texto na própria review
- request_tipado: TextRequest {text}; Bearer em memória
- resposta_contrato_e_status: 200 ReviewResponse; 400/401/403/404
- us_responsavel: [I-US-13](../../terceira-fase/Us/I-US-13.md)
- status_validacao: VALIDADO
- chamador_observado: EditReview -> community.editReview -> reviews.edit
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200
- status_verificados_api_permissoes: 403 (cliente real, não UI)

## E21 — GET /api/v1/reviews/{reviewId}/comments

- acesso: Público
- fluxo: Ler comentários
- momento_chamada: Ao abrir review, tentar novamente ou reconciliar após envio
- request_tipado: ID codificado
- resposta_contrato_e_status: 200 CommentResponse[]; 404
- us_responsavel: [I-US-14](../../terceira-fase/Us/I-US-14.md)
- status_validacao: VALIDADO
- chamador_observado: CommentsSection -> community.getComments -> reviews.comments
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E22 — POST /api/v1/reviews/{reviewId}/comments

- acesso: Autenticado
- fluxo: Comentar
- momento_chamada: Ao enviar formulário da review com sessão
- request_tipado: TextRequest {text}; Bearer em memória
- resposta_contrato_e_status: 201 CommentResponse; 400/401/404
- us_responsavel: [I-US-14](../../terceira-fase/Us/I-US-14.md)
- status_validacao: VALIDADO
- chamador_observado: CommentForm -> community.comment -> reviews.comment
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 201

## E23 — PUT /api/v1/users/{userId}/follow

- acesso: Autenticado
- fluxo: Seguir usuário
- momento_chamada: Ao clicar Seguir em outro perfil
- request_tipado: Sem body; Bearer
- resposta_contrato_e_status: 200 estado following; 400/401/404
- us_responsavel: [I-US-17](../../terceira-fase/Us/I-US-17.md)
- status_validacao: VALIDADO
- chamador_observado: FollowButton -> community.setFollowing(true) -> social.setFollowing
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E24 — DELETE /api/v1/users/{userId}/follow

- acesso: Autenticado
- fluxo: Deixar de seguir
- momento_chamada: Ao clicar Deixar de seguir
- request_tipado: Sem body; Bearer
- resposta_contrato_e_status: 204; 400/401/404
- us_responsavel: [I-US-17](../../terceira-fase/Us/I-US-17.md)
- status_validacao: VALIDADO
- chamador_observado: FollowButton -> community.setFollowing(false) -> social.setFollowing
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 204

## E25 — GET /api/v1/users/{userId}/follow/me

- acesso: Autenticado
- fluxo: Estado de seguir
- momento_chamada: Ao abrir perfil alheio com sessão
- request_tipado: Bearer; ID do perfil
- resposta_contrato_e_status: 200 wrapper following; 401/404
- us_responsavel: [I-US-17](../../terceira-fase/Us/I-US-17.md)
- status_validacao: VALIDADO
- chamador_observado: FollowButton -> community.isFollowing -> social.isFollowing
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E26 — GET /api/v1/favorites

- acesso: Autenticado
- fluxo: Favoritos do próprio perfil
- momento_chamada: Ao abrir seção de favoritos do perfil e após invalidar alterações
- request_tipado: Bearer; sem body
- resposta_contrato_e_status: 200 FavoriteListsResponse; 401
- us_responsavel: [I-US-18](../../terceira-fase/Us/I-US-18.md)
- status_validacao: VALIDADO
- chamador_observado: FavoritesSections no próprio perfil -> community.getFavorites -> social.favorites
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E27 — GET /api/v1/favorites/{kind}/{targetId}

- acesso: Autenticado
- fluxo: Estado de favorito
- momento_chamada: Ao abrir jogo/review com sessão
- request_tipado: kind game/review e ID; Bearer
- resposta_contrato_e_status: 200 FavoriteStatusResponse favorite nullable; 400/401/404
- us_responsavel: [I-US-18](../../terceira-fase/Us/I-US-18.md)
- status_validacao: VALIDADO
- chamador_observado: FavoriteButton -> community.getFavorite -> social.favorite
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E28 — PUT /api/v1/favorites/{kind}/{targetId}

- acesso: Autenticado
- fluxo: Favoritar jogo/review
- momento_chamada: Ao clicar Favoritar
- request_tipado: Sem body; kind/ID e Bearer
- resposta_contrato_e_status: 200 FavoriteResponse; 400/401/404
- us_responsavel: [I-US-18](../../terceira-fase/Us/I-US-18.md)
- status_validacao: VALIDADO
- chamador_observado: FavoriteButton -> community.setFavorite(true) -> social.setFavorite
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E29 — DELETE /api/v1/favorites/{kind}/{targetId}

- acesso: Autenticado
- fluxo: Remover favorito
- momento_chamada: Ao clicar Remover favorito
- request_tipado: Sem body; kind/ID e Bearer
- resposta_contrato_e_status: 204; 400/401/404
- us_responsavel: [I-US-18](../../terceira-fase/Us/I-US-18.md)
- status_validacao: VALIDADO
- chamador_observado: FavoriteButton -> community.setFavorite(false) -> social.setFavorite
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 204

## E30 — GET /api/v1/dashboard

- acesso: Autenticado
- fluxo: Home pessoal
- momento_chamada: Ao entrar em Início com sessão e invalidar composição pessoal
- request_tipado: Bearer; sem body
- resposta_contrato_e_status: 200 DashboardResponse favorites/feed; 401
- us_responsavel: [I-US-19](../../terceira-fase/Us/I-US-19.md)
- status_validacao: VALIDADO
- chamador_observado: DashboardHome -> DashboardService.get -> community.dashboard
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200, 401
- status_verificados_api_permissoes: 401 (cliente real, não UI)

## E31 — GET /api/v1/feed/following

- acesso: Autenticado
- fluxo: Atualizar feed pessoal
- momento_chamada: Ao clicar Atualizar feed e em refresh necessário após relação/publicação
- request_tipado: Bearer; sem body
- resposta_contrato_e_status: 200 ReviewResponse[]; 401
- us_responsavel: [I-US-19](../../terceira-fase/Us/I-US-19.md)
- status_validacao: VALIDADO
- chamador_observado: FeedSection ao atualizar -> community.getFeed -> community.feed
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200, 401

## E32 — GET /api/v1/community/reviews/recent

- acesso: Público
- fluxo: Comunidade Recentes
- momento_chamada: Ao abrir Comunidade/aba Recentes e tentar novamente
- request_tipado: Sem body
- resposta_contrato_e_status: 200 ReviewResponse[]
- us_responsavel: [I-US-20](../../terceira-fase/Us/I-US-20.md)
- status_validacao: VALIDADO
- chamador_observado: CommunityRecent -> community.getRecentReviews -> community.recent
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E33 — GET /api/v1/community/reviews/most-commented

- acesso: Público
- fluxo: Comunidade Mais comentadas
- momento_chamada: Ao selecionar aba ou mudar período
- request_tipado: RankingPeriod: period=24h/7d/30d
- resposta_contrato_e_status: 200 RankedReviewResponse[]; 400
- us_responsavel: [I-US-20](../../terceira-fase/Us/I-US-20.md)
- status_validacao: VALIDADO
- chamador_observado: CommunityRankedReviews -> community.getMostCommented -> community.mostCommented
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E34 — GET /api/v1/community/games/in-discussion

- acesso: Público
- fluxo: Comunidade Jogos em discussão
- momento_chamada: Ao selecionar aba ou mudar período
- request_tipado: RankingPeriod: period=24h/7d/30d
- resposta_contrato_e_status: 200 RankedGameResponse[]; 400
- us_responsavel: [I-US-20](../../terceira-fase/Us/I-US-20.md)
- status_validacao: VALIDADO
- chamador_observado: CommunityRankedGames -> community.getGamesInDiscussion -> community.gamesInDiscussion
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E35 — GET /api/v1/notifications

- acesso: Autenticado
- fluxo: Sino/modal
- momento_chamada: Ao abrir ou reabrir sino; não por rota de página
- request_tipado: Bearer; sem body
- resposta_contrato_e_status: 200 NotificationResponse[]; 401
- us_responsavel: [I-US-21](../../terceira-fase/Us/I-US-21.md)
- status_validacao: VALIDADO
- chamador_observado: NotificationBell/NotificationModal -> notifications.list -> http.notifications.list
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=browser; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_browser: 200

## E36 — GET /openapi/v1.json

- acesso: Público, infraestrutura
- fluxo: Inventário/contratos
- momento_chamada: Durante validação de contratos e relatório
- request_tipado: Sem body
- resposta_contrato_e_status: 200 documento OpenAPI
- us_responsavel: [I-US-02](../../terceira-fase/Us/I-US-02.md)
- status_validacao: VALIDADO
- chamador_observado: Harness E2E -> request GET OpenAPI -> inventário (infraestrutura)
- cenario_teste_e_evidencia: Front/tests/e2e/integration.spec.ts, jornada 34 endpoints; Front/docs/evidence/I-PR-07-calls.json, source=infrastructure; Front/docs/I-PR-07.md. DTOs/decoders: Front/src/services/http/dtos.ts e decoders.ts; regressões http-*.test.tsx.
- status_observados_infrastructure: 200

## Resumo final — I-PR-07

- 34/34 funcionais com sucesso observado na UI; zero endpoints funcionais sem consumo.
- health/OpenAPI: infraestrutura, 200 reais; sem botões artificiais de produto.
- CORS: respostas do navegador, preflights POST/PATCH/PUT/DELETE e origem rejeitada, sem proxy.
- Duas contas, escrita/leitura, favoritos, relações, feed, notificações e nota recuperada verificados.
- 409 de cadastro e 401 de sessão revogada na UI; 403 de autoria e 409 de review no cliente de permissões real. Não declarar essas duas últimas falhas como captura de UI.
- API própria desligada: erro de nova busca, sem status HTTP inventado ou fallback. Reinício recupera catálogo e revoga token antigo. Latência CDP em consulta real verifica cancelamento no logout.
- 401 testes/lint/tipos/build aprovados; Playwright 1.64.1, jornada E2E aprovada. Sem mudanças de Back nesta PR.
- Lacunas nesta fase: nenhuma de consumo dos 34 endpoints. Limitações: Back em memória, token simulado, IGDB fake, sessão Front sem persistência. Não são entregues SQL/JWT/IGDB externa.
- I-PR-01 Back: CORS/contratos. I-PR-02 Front: transporte/DTOs. I-PR-03: auth/sessão. I-PR-04: jogos/opiniões. I-PR-05: perfil/social. I-PR-06: dashboard/Comunidade/sino. I-PR-07: runtime HTTP exclusivo, E2E e relatório.
- Publicação remota pendente: Front não possui remoto configurado. Branch feat/integracao-pr-07-entrega preparada localmente, sem merge.
## Infraestrutura de Front — I-PR-02 (2026-10-13)

I-US-03–05 preparadas em feat/integracao-pr-02-http, base c0de574. Transporte e DTOs refletem os contratos C# atuais. 306 testes, lint, tipos e build aprovados. Fontes: Front/src/services/http/client.ts, dtos.ts, decoders.ts e adapters.ts; descrição em Front/docs/I-PR-02.md. Testes RED antecedem implementação; evidências em Front/docs/TDD-I-PR-02.md.

Os chamadores abaixo são portas HTTP preparadas; não são chamadas observadas de interface. Todos os status_validacao dos endpoints permanecem PLANEJADO. O fluxo/momento de ativação continua nas US de I-PR-03–06. Não houve API real/E2E ou validação de CORS pelo navegador nesta PR.

| Endpoints | Portas preparadas | Evidência de transporte controlado |
| --- | --- | --- |
| E02–E05 | auth.register/login/logout/me | Front/tests/http-adapters.test.ts |
| E06–E10 | profiles.get/edit/reviews/followers/following e composições profile/connections | Front/tests/http-adapters.test.ts |
| E11–E18 | games.list/get/opinions/myRating/rate/reviews/myReview/publish | Front/tests/http-adapters.test.ts |
| E19–E22 | reviews.get/edit/comments/comment | Front/tests/http-adapters.test.ts |
| E23–E29 | social.setFollowing/isFollowing/favorites/favorite/setFavorite | Front/tests/http-adapters.test.ts |
| E30–E34 | community.dashboard/feed/recent/mostCommented/gamesInDiscussion | Front/tests/http-adapters.test.ts |
| E35 | notifications.list | Front/tests/http-adapters.test.ts |
| E01/E36 | paths raiz suportados pelo transporte; diagnóstico real pendente | Front/tests/http-client.test.ts verifica health com double; OpenAPI real não observado |

Transporte distingue rede/HTTP/contrato/cancelamento e trata 204; nenhum fallback de API para fixtures. DTOs/wrappers/datas/null/zero/união de eventos são validados em Front/tests/http-decoders.test.ts. Sessão compartilhada exige Bearer em privados e exclui token de públicos. Store revogado em logout/401 atual; resposta antiga não revoga sessão nova. Objetos de usuário não são enviados como autorização.

Limites: o runtime das telas não foi migrado nesta preparação; os mocks existentes serão retirados conforme a sequência planejada. IDs isolados . e .. são rejeitados antes de fetch pela normalização do navegador; a API atual não os gera. Não afirmar suporte a esses IDs em HTTP sem convenção adicional de backend. Nenhum token/credencial real foi usado ou registrado. Sem remoto de Front, publicação da PR permanece pendente; nenhum merge.

## Autenticação integrada — I-PR-03 (2026-10-13)

Branch feat/integracao-pr-03-sessao, base ab99e3c de Front. I-US-06–09 concluídas com TDD e 328 testes/lint/tipos/build aprovados. Back não foi editado; nenhuma US pulada. API existente executada sem build em localhost:5080, Vite em 127.0.0.1:5173, origens distintas sem proxy. CORS permitiu os fluxos de autenticação no navegador.

| Endpoint | Fluxo/momento observado | Evidência |
| --- | --- | --- |
| E02 POST auth/register | Formulário cria conta sem sessão; duplicidade mostra erro | Navegador: conta nova e duplicado. Harness real: 201 e 409. http-registration.test.tsx cobre 400/409/201/pendência/contrato/rede |
| E03 POST auth/login | Ao enviar credenciais, sem Bearer no request público | Navegador: Ana e conta nova, senha errada. Harness real: 200. http-login.test.tsx cobre 400/401/DTO/concorrência |
| E05 GET auth/me | Depois de login e antes de divulgar User à interface | Navegador: navbar corresponde à conta confirmada. Harness real: 200 com token válido e 401 após revogação. http-login.test.tsx verifica sequência/header/identidade |
| E04 POST auth/logout | Sair remove usuário imediatamente e revoga token capturado | Navegador: retorna visitante. Harness real: 204/zero bytes; me posterior 401. http-logout.test.tsx cobre falha de revogação/401/pendência |

A ausência de persistência foi verificada por reload no navegador. Concorrência e respostas fora de ordem foram verificadas em transporte controlado; não alegar simulação de atrasos ou expiração no navegador. Header CORS de register/me no harness real liberou http://127.0.0.1:5173. A validação de todos os domínios e cenários de CORS continua na I-PR-07.

E02–E05 agora possuem fluxo HTTP ativo e verificação com API real; demais estados de consumo permanecem planejados. A matriz não declara catálogo, opiniões, perfil, favoritos, relações, feed, Comunidade ou sino integrados. Privados não migrados são bloqueados/ocultos para não usar mocks com identidade real; serão habilitados junto às suas US. Todas as futuras portas reutilizam cliente/store/versão da sessão. Evidência visual e descrição em Front/docs/I-PR-03.md, sem credenciais ou tokens em relatório. Sem remoto e sem merge.

## Validação de consumo — I-PR-04

E11–E22 ativados na branch feat/integracao-pr-04-reviews, base 0c58697. Navegador Vite 127.0.0.1:5173/API localhost:5080, sem proxy ou interceptações: catálogo/filtros/detalhes, cinco estrelas recuperadas, publicação/edição, comentário por outra conta e leitura pública após logout. Harness HTTP real verifica 200/201/400/401/403/404/409 e CORS. Falha real de conexão testada com origem temporariamente indisponível, restaurada após validação. Status negativos vêm do harness; mensagens de erro da UI também têm doubles tipados, sem alegar cenários reais não executados. Evidências completas em Front/docs/I-PR-04.md; 361 testes, lint, tipos e build. Nenhuma mudança de Back feita nesta entrega; demais endpoints permanecem planejados.

## Validação de consumo — I-PR-05

E06–E10 e E23–E29 ativados em Front na branch feat/integracao-pr-05-perfil-social, base 78e7177. Navegador 127.0.0.1:5173/API localhost:5080 sem proxy/interceptações: perfil editado e navbar sincronizada, seguir/deixar de seguir com listas atualizadas, favoritos dos dois tipos, remoção refletida em nova visita e dados pessoais isolados entre Bia/Ana. Harness com duas contas novas observou 200/204/400/401/404 e CORS. Limpeza de avatar/omissão verificada no harness e formulário em teste HTTP; no navegador foi editado nome/bio. Falhas/rascunhos/tardios de UI são doubles tipados, sem inventar erros no navegador real. 382 testes, lint, tipos e build. Home/dashboard/Comunidade/sino aguardam I-PR-06; não há GET favorites duplicado na Home. Back não recebeu alterações desta entrega.

## Validação consolidada — I-PR-06 e I-PR-07

I-PR-06 concluiu E30–E35 com 398 testes e evidências de UI/API em Front/docs/I-PR-06.md. I-PR-07 removeu mocks de src, preservou doubles em tests e aprovou 401 testes. Seu E2E observado em 2026-10-14 compara exatamente as 34 operações funcionais de OpenAPI ao conjunto de sucessos browser, com health/OpenAPI separados. Capturas não contêm corpos, tokens, senhas ou headers. Uma nova execução substitui evidências de contas efêmeras; a API de desenvolvimento não é encerrada.
