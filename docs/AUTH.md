# Autenticação HTTP

Cadastro usa RegisterRequest e retorna usuário público sem login automático. Login usa LoginRequest, recebe token/expiresAt/user e confirma identidade com auth/me antes de publicar usuário à UI e redirecionar para Home. Credenciais e token não fazem parte do modelo público User, não são persistidos no navegador e não entram nas evidências de entrega.

createHttpAuthService, HttpSessionStore e SessionProvider compartilham versão/cancelamento. Login novo invalida anteriores; logout captura token, limpa estado e aborta requests privados imediatamente, depois solicita revogação real. Falha de revogação é informada sem restaurar sessão. 401 privado atual limpa usuário e componentes pessoais; resposta antiga não desfaz logout ou encerra uma conta nova.

User passado aos contratos legados não concede autorização: privados usam exclusivamente Bearer do store confirmado. auth/me confirma usuário do login; DTO incompatível não estabelece identidade. Públicas não recebem Bearer. A navbar autenticada oferece avatar/perfil, sino e Sair, sem cadastro/login; Home não oferece criação de conta ao usuário conectado.

Limites: token da API atual é simulado e dados ficam na memória de Back. Reload do navegador retorna visitante; reinício da API revoga tokens. JWT de produção, SQL e persistência da sessão não foram implementados. Testes http-login/logout/session-isolation e E2E real verificam esses fluxos. Veja [entrega](I-PR-07.md) e [relatório](RELATORIO-ENDPOINTS.md).
