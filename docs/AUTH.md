# Autenticação provisória e mockada

Credenciais exclusivamente fictícias: `ana@example.com` / `teste123` (usuária Ana).

O adaptador é selecionado em `src/services/auth.ts`. Formulários e sessão consomem somente `AuthService`, que pode ser substituído ou injetado nos testes.

Sessão centralizada em `SessionProvider`, exclusivamente em memória. Nenhuma senha fica no contexto de sessão; o serviço retorna somente o usuário público. Recarregar remove a sessão. Não há tokens, cookies, acesso ao backend ou garantia de segurança/autorização real.

E-mails dos mocks são comparados ignorando espaços externos e caixa; senhas são comparadas literalmente. Campos obrigatórios não definem política de senha. Login válido mostra sucesso e oferece retorno ao catálogo, sem redirecionamento automático.

Cadastro: nome, e-mail e senha são provisórios. E-mail exige formato básico e unicidade sem diferenciar caixa/espaços externos. Não há política de senha nem login automático. ID e username são gerados apenas para preencher o modelo mock; contas ficam na memória da instância.

RequireSession protege conteúdo e ações da interface e oferece o caminho /login a visitantes. Notificações usa essa proteção; o conteúdo será implementado na US-28. Logout remove a sessão e revoga imediatamente o acesso. As ações das próximas US deverão reutilizar a proteção e os testes de visitante, autenticado e logout.
