# TDD — S-PR-14

Branch `feat/sexta-14-cadastro-login` criada da base `7005f71` antes de testes/código. PRs intermediárias exigem backend ou contratos ausentes; puladas conforme orientação vigente, sem declarar entrega.

RED `1b7e063`: 10 cenários com Router/HTTP, 6 falhas funcionais porque cadastro confirmado continuava em `/cadastro` e 4 testes aprovados de validação/estado não confirmado. Tipos sem erros. Commit dos testes anterior à implementação.

GREEN: RegisterPage navega com replace após confirmação válida, mantendo limpeza de senha, trava/finally e tratamento de erros. LoginPage valida estado unknown e exibe confirmação apenas pelo sinal booleano, sem transferir credenciais. Nenhuma alteração nos serviços ou criação de sessão.

Regressões antigas adaptadas ao destino automático. Um teste de status foi estabilizado aguardando o formulário Login; o texto de andamento podia aparecer antes da navegação. Isso não foi tratado como RED funcional adicional.

Validação: 479 testes/71 arquivos, lint, tipos, build e diff check. E2E Chromium com servidor HTTP sintético confirma 409, retry 201, login sem sessão e Voltar; captura inspecionada. O E2E integrado histórico teve o passo de cadastro duplicado atualizado, mas não foi executado (limitações de catálogo/IDs já existentes). [Descrição e limites](S-PR-14.md).

Backend preservado. IDs inteiros seguem pendentes de migração própria. Sem merge/publicação remota.
