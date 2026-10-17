# Feed da Comunidade somente para usuários autenticados

Branch `fix/feed-comunidade-apenas-autenticado`, sobre a S-PR-40 (`90e39ad`). Aba e conteúdo do Feed dependem de sessão e feature habilitada. Visitante não recebe aba nem convite para entrar no feed; nenhuma consulta privada é disparada. Uma seleção que deixe de ser permitida apresenta Recentes.

Login mantém consulta sob demanda. Logout conserva o redirecionamento existente para o Início; ao voltar à Comunidade, o visitante encontra Recentes e não vê o Feed.

RED `9239ed8` antes do código. 25 testes pertinentes em cinco arquivos aprovados em execuções focadas, incluindo visitante e fluxo autenticado/login/logout. Lint, tipos/build e diff-check aprovados. Sem suíte completa, teste pesado, alteração de Back, publicação ou merge.

A S-PR-40 permanece concluída separadamente na branch `feat/sexta-40-review-contexto-jogo`, commit `90e39ad`; [relatório e capturas](S-PR-40.md).
