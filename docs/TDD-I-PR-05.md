# TDD — I-PR-05

Branch feat/integracao-pr-05-perfil-social, base 78e7177. Sem alterações de backend; US que exigirem backend permanecem pendentes conforme orientação do usuário.

## I-US-15
RED: 5 falhas esperadas; commit 59e93ee. GREEN: 366 testes, lint, tipos e build. Perfil público composto por usuário e reviews; somente 404 do usuário vira ausência. Falha de lista preserva distinção de erro; conexões públicas e links com IDs opacos, listas vazias válidas.

## I-US-16
RED: 7 falhas e 1 aprovado; commit 68cb661. GREEN: 374 testes, lint, tipos e build. Formulário do titular, PATCH mínimo/omissão/null, validação, rascunho em 400/rede, navbar sincronizada sem trocar token/versão. 401 remove sessão/editor; PATCH tardio após logout é cancelado. Double de perfil declarado como DTO para permitir avatar nullable sem casts.
