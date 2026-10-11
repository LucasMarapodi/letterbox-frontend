# Autenticação provisória e mockada

Credenciais exclusivamente fictícias: `ana@example.com` / `teste123` (usuária Ana).

O adaptador é selecionado em `src/services/auth.ts`. Formulários e sessão consomem somente `AuthService`, que pode ser substituído ou injetado nos testes.

Sessão centralizada em `SessionProvider`, exclusivamente em memória. Nenhuma senha fica no contexto de sessão; o serviço retorna somente o usuário público. Recarregar remove a sessão. Não há tokens, cookies, acesso ao backend ou garantia de segurança/autorização real.

E-mails dos mocks são comparados ignorando espaços externos e caixa; senhas são comparadas literalmente. Campos obrigatórios não definem política de senha. Login válido mostra sucesso e oferece retorno ao catálogo, sem redirecionamento automático.
