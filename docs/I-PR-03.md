# Autenticação HTTP e isolamento de sessão

Status: READY_LOCAL. Branch feat/integracao-pr-03-sessao, baseada em ab99e3c (I-PR-02). I-US-06 a I-US-09 concluídas. Nenhuma alteração de código em Back; nenhuma US precisou ser pulada. Sem merge ou publicação remota.

Cadastro agora cria a conta pela API sem autenticar. Login confirma a sessão por me antes de exibir o usuário e redirecionar para Início. Token/expiresAt vivem apenas em memória. Logout remove imediatamente usuário e estado privado, revoga o token por HTTP e comunica eventual falha sem restaurar a sessão. 401 privado atual encerra a sessão; respostas de uma sessão anterior não afetam a conta nova.

Uma versão única do store é publicada ao contexto e usada nas keys dos controles privados. As próximas integrações compartilham o mesmo cliente e sessão. Operações privadas ainda não migradas ficam bloqueadas no serviço e ocultas na entrada HTTP para impedir uso de dados mockados por contas da API. A reativação de opiniões, favoritos, relações, feed e sino acompanha suas US nas I-PR-04–06. Catálogo e consultas públicas ainda aguardam migração. A suíte legada usa doubles explicitamente em tests, mantendo regressões sem interferir no runtime produtivo.

Validação: 328 testes, lint, TypeScript estrito, build e diff sem erros de whitespace. TDD com commits RED/conclusão por US em TDD-I-PR-03.md. O navegador revelou flags descartadas pelo provider; teste RED reproduziu o defeito antes da correção.

API real existente em http://localhost:5080, Vite em http://127.0.0.1:5173, sem proxy. Navegador verificou criação de conta, duplicidade, login de duas contas, logout, credenciais ruins e reload visitante. Harness HTTP registrou somente método/status: cadastro 201/409, login/me 200, logout 204 com zero bytes e me 401 após revogação. CORS permitiu leitura pela origem do Vite; cenários restantes da aplicação e matriz completa ainda aguardam as próximas PRs.

Evidência visual: C:/Users/lucas/.codex/visualizations/2026/10/11/01a12bcf-03f3-7de1-be8e-ae1f5bf86a7a/integracao-pr03-sessao.png. A aba de validação foi deixada como visitante. API e Vite permanecem executando; .env local ignorado aponta para a porta 5080. Contas de teste são temporárias no backend em memória.

Front não possui remoto configurado. A PR remota depende de remoto/base definidos. Nenhuma PR remota foi criada.
