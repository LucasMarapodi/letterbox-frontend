# Troca de fornecedores de dados

`src/services/runtime.ts` reúne `ApplicationServices`: games, auth, community e notifications. `readServiceConfig` normaliza a URL e seleciona mock/custom; `createApplicationServices` constrói uma instância isolada ou exige os adaptadores custom fornecidos. O padrão da aplicação usa mocks. `VITE_API_BASE_URL`, ilustrada em `.env.example`, reserva a configuração da URL, sem produzir solicitações HTTP.

`AppRoutes` aceita `adapters: ApplicationServices`. `ServiceProvider` distribui os fornecedores e as telas usam `useServices`; login/cadastro usam o fornecedor de autenticação através da sessão. A substituição é feita na composição, mantendo a interface das telas. Para usar custom, construa os fornecedores com `createApplicationServices({ implementation: 'custom', apiBaseUrl }, adapters)` e passe o resultado a `AppRoutes`. Não se ativa HTTP apenas preenchendo uma variável de ambiente.

`tests/service-adapters.test.tsx` comprova a mesma operação com mock e fake, e renderiza a Home com um catálogo alternativo sem chamadas externas. Fachadas anteriores continuam disponíveis para compatibilidade com a suíte e a prévia de fundação.

## Operações provisórias

| Fronteira | Operações |
| --- | --- |
| Games | listar/buscar/ordenar, detalhes por ID, média e reviews |
| Auth | cadastro e login; sessão e logout no cliente mockado |
| Community | perfis, nota por usuário, publicação/edição de review, comentários, favoritos, seguir/deixar de seguir, conexões públicas, feed |
| Notifications | consulta pessoal de eventos ordenados |

Na composição mockada, cadastro e comunidade compartilham usuários, e as opiniões dos jogos são consultadas na mesma comunidade que recebe publicações e notas. Notificações permanecem fixtures previamente registradas.

## Pendências de API

Endpoints, verbos HTTP, autenticação/tokens, sessão persistente, autorização, DTOs, formatos de erro, paginação, desempate, validação e cancelamento de requisições precisam ser alinhados com o backend. A URL não constitui contrato de endpoint. IDs são opacos e o adaptador deverá preservar a codificação documentada em CONTRACTS.md. Dados externos devem entrar como unknown e ser validados.

Continuam pendentes os incrementos de estrelas, regras definitivas de cadastro/senha, opções de ordenação, privacidade de favoritos de terceiros e comentário na própria review. A geração de eventos de notificação pertence ao backend. Componentes não acessam mocks, banco ou IGDB diretamente; nenhum cliente HTTP ou endpoint definitivo foi inventado.
