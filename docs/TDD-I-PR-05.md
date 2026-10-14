# TDD — I-PR-05

Branch feat/integracao-pr-05-perfil-social, base 78e7177. Sem alterações de backend; US que exigirem backend permanecem pendentes conforme orientação do usuário.

## I-US-15
RED: 5 falhas esperadas; commit 59e93ee. GREEN: 366 testes, lint, tipos e build. Perfil público composto por usuário e reviews; somente 404 do usuário vira ausência. Falha de lista preserva distinção de erro; conexões públicas e links com IDs opacos, listas vazias válidas.

## I-US-16
RED: 7 falhas e 1 aprovado; commit 68cb661. GREEN: 374 testes, lint, tipos e build. Formulário do titular, PATCH mínimo/omissão/null, validação, rascunho em 400/rede, navbar sincronizada sem trocar token/versão. 401 remove sessão/editor; PATCH tardio após logout é cancelado. Double de perfil declarado como DTO para permitir avatar nullable sem casts.

## I-US-17
RED: 4 falhas esperadas; commit d98b9c6. GREEN: 378 testes, lint, tipos e build. following false/true, PUT repetido idempotente, DELETE 204, corpos ausentes e token da sessão; resposta controla botão, conexões refrescadas e erro preserva estado. Cobertura dos privados ainda bloqueados foi limitada aos domínios pendentes.

## I-US-18
RED: 4 falhas esperadas; commit 3cf10e2. GREEN: 382 testes, lint, tipos e build. Favoritos pessoais, wrappers null, PUT/DELETE sem body, dois tipos e DELETE 204. Lista consultada novamente ao visitar próprio perfil após inclusão/remoção, sem cache de dashboard ou GET favorites na Home. Resposta de A após troca para B cancelada. Doubles do perfil fornecem listas vazias válidas para isolar cenários de edição.
