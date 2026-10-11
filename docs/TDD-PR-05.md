# TDD — PR-05

Branch feat/pr-05-perfis-favoritos, derivada de f265456, sem merge.

## US-21
RED: 6 falhas esperadas e 155 testes verdes, commit b389353. GREEN: 161 testes, lint, tipos e build aprovados. Perfil público com fallbacks, reviews por autor, ID opaco, erro e recuperação. Perfil de novo usuário pode usar os dados públicos da sessão mockada antes de sua primeira publicação.

## US-22
RED: 5 falhas esperadas e 161 testes verdes, commit 5a3b67a. GREEN: 166 testes, lint, tipos e build aprovados. Favoritar/remover jogo, estado consultado no serviço, idempotência e isolamento por usuário. Falha mantém estado, visitantes têm caminho para login.

## US-23
RED: 5 falhas esperadas e 167 testes verdes, commit 36875e2. GREEN: 172 testes, lint, tipos e build aprovados. Favoritos pessoais de reviews, isolamento, idempotência, logout, falha sem confirmação e bloqueio de envio duplicado.

## US-24
RED: 6 falhas esperadas e 172 testes verdes, commit f61efd5. GREEN: 178 testes, lint, tipos e build aprovados. Listas separadas na Home e próprio perfil, destinos corretos, vazio, erro com recuperação, remoção na próxima consulta e descarte de resposta após logout. Perfil de terceiros não consulta favoritos.
