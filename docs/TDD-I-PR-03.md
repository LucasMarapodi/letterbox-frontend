# TDD — I-PR-03

Branch feat/integracao-pr-03-sessao, base ab99e3c. Somente Front; alterações de backend não autorizadas. Não houve necessidade de alterar Back.

## I-US-06
RED: 5 falhas e 306 aprovados; commit 3f9a931. GREEN: 311 testes, lint, tipos e build. Cadastro no runtime produtivo usa HTTP, DTO retornado, body restrito, 400/409, pendência e duplo envio, erro/rede sem conta substituta e sucesso sem autenticar. Doubles da suíte legada configurados exclusivamente em tests/setup.ts; os novos testes injetam transporte na composição produtiva.

## I-US-07
RED: 8 falhas e 311 aprovados; commit 274c07e. GREEN: 319 testes, lint, tipos e build. Sequência login/me, Bearer privado, User confirmado, falhas 400/401/contrato/identidade, token pendente invalidado e login concorrente descartado. Sem Storage; remontagem com nova composição volta a visitante.

## I-US-08
RED: 4 falhas e 319 aprovados; commit f248c63. GREEN: 323 testes, lint, tipos e build. Logout HTTP captura Bearer antes de limpar store; contexto assíncrono remove UI imediatamente, informa revogação não confirmada em falha e não restaura usuário. Store publica mudanças, 401 privado reflete visitante na UI, login pendente/me não restaura sessão revogada. API existente iniciada sem build na porta 5080 para futura validação, sem edição de Back.
