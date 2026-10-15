# TDD — S-PR-03

Branch `feat/sexta-03-acoes-sem-duplicidade` criada da base `676452b` antes dos testes/código.

1. RED `1148576`: matriz de 10 mutações aprovadas com transporte HTTP pendente, clique/submits concorrentes, disabled até resposta, erro, campos preservados e retry. Três falhas funcionais: comentário e edição mantinham sucesso anterior; logout não mostrava revogação pendente. Tipos sem erros.
2. RED `6f1d46e`: extensão do cenário de logout mostra duas invocações do serviço no mesmo ciclo de interação. O transporte já evitava segundo POST por limpar o token; faltava impedir a segunda invocação/invalidação. Commit anterior ao código.
3. GREEN: trava síncrona por operação no SessionProvider e status no App; `finally` libera andamento somente da operação correspondente. Novo login desvincula a revogação anterior. Comentário/edição limpam sucesso ao enviar.
4. Complemento de regressão: alvos independentes e logout sucesso/erro seguido de nova sessão. Ajustado um matcher de teste que não aceitava comparação assimétrica em `toHaveValue`; usado valor exato, sem mudança no comportamento exigido. Essa falha de asserção não foi contada como RED funcional.
5. Verificação: 16 cenários novos; 459 testes/69 arquivos, lint, tipos, build e diff check. E2E Chromium/HTTP sintético adicional confirma Enter repetido, retry com campos preservados e andamento do logout sem bloquear navegação.

Nenhum backend alterado. Marcar notificações não existe no contrato atual; IDs inteiros seguem pendentes de migração própria. [Auditoria e limites](S-PR-03.md). Sem merge/publicação remota.
