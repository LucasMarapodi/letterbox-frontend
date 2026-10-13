# TDD — I-PR-03

Branch feat/integracao-pr-03-sessao, base ab99e3c. Somente Front; alterações de backend não autorizadas. Não houve necessidade de alterar Back.

## I-US-06
RED: 5 falhas e 306 aprovados; commit 3f9a931. GREEN: 311 testes, lint, tipos e build. Cadastro no runtime produtivo usa HTTP, DTO retornado, body restrito, 400/409, pendência e duplo envio, erro/rede sem conta substituta e sucesso sem autenticar. Doubles da suíte legada configurados exclusivamente em tests/setup.ts; os novos testes injetam transporte na composição produtiva.

## I-US-07
RED: 8 falhas e 311 aprovados; commit 274c07e. GREEN: 319 testes, lint, tipos e build. Sequência login/me, Bearer privado, User confirmado, falhas 400/401/contrato/identidade, token pendente invalidado e login concorrente descartado. Sem Storage; remontagem com nova composição volta a visitante.

## I-US-08
RED: 4 falhas e 319 aprovados; commit f248c63. GREEN: 323 testes, lint, tipos e build. Logout HTTP captura Bearer antes de limpar store; contexto assíncrono remove UI imediatamente, informa revogação não confirmada em falha e não restaura usuário. Store publica mudanças, 401 privado reflete visitante na UI, login pendente/me não restaura sessão revogada. API existente iniciada sem build na porta 5080 para futura validação, sem edição de Back.

## I-US-09
RED: 3 falhas e 324 aprovados; commit fcbb12a. GREEN inicial: 327 testes, lint, tipos e build. Store compartilhado, versão na UI, dados tardios A descartados em B, visitante sem consultas privadas e métodos privados não migrados bloqueados. Navegador encontrou flags perdidas pelo provider: RED adicional 1 falha e 327 aprovados; commit 2dc34cd. GREEN final: 328 testes, lint, tipos e build. Provider preserva composição completa e controles privados remountam pela versão.

## API real e navegador
Em 2026-10-13, skill computer-use usada para validar Vite 127.0.0.1:5173 consumindo API existente localhost:5080 (sem build/edição de Back), origens distintas e sem proxy. Navegador verificou cadastro sem login automático, duplicidade, login Ana e conta nova, me antes da UI, logout, senha incorreta e reload visitante. A correção do provider removeu ações privadas não migradas e mensagens de falha indevidas da Home. Screenshot integracao-pr03-sessao.png na pasta de visualizações da conversa; viewport observado sem overflow horizontal (1265/1265); aba deixada como visitante.

Harness HTTP real, sem imprimir corpos ou headers secretos: POST register 201 e duplicado 409; POST login 200; GET me 200; POST logout 204/zero bytes; GET me após revogação 401. Headers CORS em register/me liberaram a origem do Vite. 400 e payloads incompatíveis/rede/logout pendente/401 tardio permanecem evidenciados em testes controlados; não foram inventadas verificações de navegador para esses casos. Nenhuma US pulada e nenhum código de Back alterado. Demais endpoints permanecem planejados para integração.
