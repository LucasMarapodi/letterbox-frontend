# Composição dos serviços

createDefaultApplicationServices é a única fábrica produtiva. Ela constrói serviços HTTP explícitos para games, auth, community, dashboard e notifications, sobre um cliente e HttpSessionStore compartilhados. readHttpConfig exige VITE_API_BASE_URL absoluta HTTP(S), sem credenciais/query/fragmento. Não há createApplicationServices/readServiceConfig, seletor mock/custom ou fallback.

AppRoutes aceita ApplicationServices para composição tipada. ServiceProvider distribui useServices; SessionProvider recebe AuthService. Componentes não executam fetch nem importam doubles. A substituição de serviços/transporte é restrita à suíte de testes; tests/setup.ts e tests/doubles não são executados pelo aplicativo Vite.

JSON externo é unknown até validação em decoders.ts. Requests são DTOs com os campos permitidos; objetos User não são enviados como autorização. Token em memória é usado somente em consultas/escritas privadas. A versão do store e AbortSignal descartam solicitações/dados da sessão anterior. Detalhes em [HTTP-INTEGRATION](HTTP-INTEGRATION.md).

| Serviço | Fonte real |
| --- | --- |
| Games | catálogo/detalhes/opinions pela API |
| Auth | register/login/me/logout e edição de perfil |
| Community | perfis/conexões, notas/reviews/comentários, relações/favoritos, feed e rankings |
| Dashboard | GET dashboard agregado |
| Notifications | GET notifications ao abrir/reabrir sino |

Ordenação, médias, relações e geração de eventos são responsabilidade de Back. O Front exibe respostas validadas, sem motor de negócio local. Antigos motores/fixtures em tests/doubles preservam testes isolados; contratos HTTP, fluxos e regras autoritativas de Back têm cobertura separada. A evidência de consumo real é o [E2E e relatório final](I-PR-07.md), não a execução desses doubles.
