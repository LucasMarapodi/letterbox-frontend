# TDD — PR-09

Branch feat/pr-09-comunidade-rankings, baseada em c0ba6b7, sem merge.

## US-32
RED: 3 falhas e 218 testes aprovados; commit 1087918. GREEN: 221 testes, lint, tipos e build aprovados. Rota pública, navbar distinta, teclado, acesso direto, sessão autenticada e retorno ao catálogo.

## US-33
RED: 3 falhas e 221 testes aprovados; commit 081add9. GREEN: 224 testes, lint, tipos e build. Reviews públicas de todos os autores por publicação/ID, dados clonados, links e carregamento/erro/recuperação/vazio. Edição e comentário não mudam a ordenação.

## US-34
RED: 5 falhas e 224 testes aprovados; commit 896361d. GREEN: 229 testes, lint, tipos e build. Períodos restritos, padrão 7d, escolha compartilhada, Recentes independente. Relógio fixo e comparação por instante normalizado, limites inclusivos, exclusão de antes/futuro. Testes integrados longos receberam limite de 15s após timeout sob carga da suíte, sem alterar expectativas.

## US-35
RED: 4 falhas e 229 aprovados; commit 03eb3b1. GREEN: 233 testes, lint, tipos e build. Contagem por comentário elegível, reviews antigas, desempates, estados e resposta atrasada descartada.
