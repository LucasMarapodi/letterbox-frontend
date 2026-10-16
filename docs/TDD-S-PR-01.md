# TDD — S-PR-01

Base 79e8c0a, branch feat/sexta-01-logout-inicio criada antes de editar. RED 2b8227d: 5 falhas funcionais de navegação e 2 cenários já aprovados; implementação apenas depois do commit.

GREEN/REFACTOR: logout chama signOut existente e navega com replace logo após a limpeza síncrona. Nenhum await de revogação para navegar e nenhuma navegação em completion antiga. Provider conserva guardas por versão, aviso de falha e cancelamento. Router real e transporte controlado cobrem sucesso em perfil/review/Comunidade, rede, respostas privadas tardias, histórico e nova sessão. Cobertura antiga adaptada à mudança de destino, sem apagar testes.

Verificação: 422 testes, lint, tipos, build e diff check. Teste manual em navegador/API local confirma perfil -> Sair -> Home visitante; captura sanitizada em docs/evidence. Cenários negativos/concorrência são testes controlados. IDs inteiros da quinta fase não estão na base; pendência explícita no documento da PR, sem alterar contratos fora do escopo.
