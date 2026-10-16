# Troca de fornecedores de dados

Terceira fase: [HTTP-INTEGRATION.md](HTTP-INTEGRATION.md) descreve a infraestrutura e a autenticação ativada na I-PR-03. A entrada produtiva createDefaultApplicationServices usa AuthService HTTP e publica capacidades/versão da sessão pelo provider. O padrão mock/custom abaixo permanece para domínios públicos pendentes e doubles; privados pendentes são bloqueados na composição produtiva. Não há fallback HTTP -> mock.

`src/services/runtime.ts` reúne `ApplicationServices`: games, auth, community e notifications. `readServiceConfig` normaliza a URL e seleciona mock/custom; `createApplicationServices` constrói uma instância isolada ou exige os adaptadores custom fornecidos. O padrão da aplicação usa mocks. `VITE_API_BASE_URL`, ilustrada em `.env.example`, reserva a configuração da URL, sem produzir solicitações HTTP.

`AppRoutes` aceita `adapters: ApplicationServices`. `ServiceProvider` distribui os fornecedores e as telas usam `useServices`; login/cadastro usam o fornecedor de autenticação através da sessão. A substituição é feita na composição, mantendo a interface das telas. Para usar custom, construa os fornecedores com `createApplicationServices({ implementation: 'custom', apiBaseUrl }, adapters)` e passe o resultado a `AppRoutes`. Não se ativa HTTP apenas preenchendo uma variável de ambiente.

`tests/service-adapters.test.tsx` comprova a mesma operação com mock e fake, e renderiza a Home com um catálogo alternativo sem chamadas externas. Fachadas anteriores continuam disponíveis para compatibilidade com a suíte e a prévia de fundação.

## Operações provisórias

| Fronteira | Operações |
| --- | --- |
| Games | listar/buscar/ordenar, detalhes por ID, média e reviews |
| Auth | cadastro e login; sessão e logout no cliente mockado |
| Community | perfis, nota por usuário, publicação/edição de review, comentários, favoritos, seguir/deixar de seguir, conexões públicas, feed, reviews recentes e rankings por review/jogo |
| Notifications | consulta pessoal de eventos ordenados |

Na composição mockada, cadastro e comunidade compartilham usuários, e as opiniões dos jogos são consultadas na mesma comunidade que recebe publicações e notas. Notificações permanecem fixtures previamente registradas.

Comentários exigem a sessão interna compartilhada entre auth/community, estabelecida por credenciais válidas. O argumento de usuário é comparado com essa sessão; não concede autorização. Logout revoga essa sessão e o formulário. Adaptadores custom devem implementar revogação e autorização reais; o método opcional logout mantém compatibilidade com fornecedores anteriores. O armazenamento interno em memória é um recurso de teste, não uma fronteira de segurança de produção.

Comunidade consulta getRecentReviews, getMostCommented e getGamesInDiscussion. Rankings aceitam apenas 24h/7d/30d e usam relógio injetável, janela móvel inclusiva e contagem de comentários. Os desempates usam atividade mais recente e ID. As telas descartam respostas de períodos anteriores. As fixtures padrão têm datas históricas e podem produzir rankings vazios; um comentário mockado novo aparece ao reabrir o ranking. Não há atualização em tempo real.

## Pendências de API

Endpoints, verbos HTTP, autenticação/tokens, sessão persistente, autorização, DTOs, formatos de erro, paginação, desempate, validação e cancelamento de requisições precisam ser alinhados com o backend. A URL não constitui contrato de endpoint. IDs são opacos e o adaptador deverá preservar a codificação documentada em CONTRACTS.md. Dados externos devem entrar como unknown e ser validados.

Continuam pendentes os incrementos de estrelas, regras definitivas de cadastro/senha, opções de ordenação, privacidade de favoritos de terceiros e comentário na própria review. A geração de eventos de notificação pertence ao backend. Componentes não acessam mocks, banco ou IGDB diretamente; nenhum cliente HTTP ou endpoint definitivo foi inventado.
