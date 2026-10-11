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

## US-36
RED: 4 falhas e 233 aprovados; commit bd9aa27. GREEN: 237 testes, lint, tipos e build. Soma entre reviews, períodos, desempates por atividade/ID, capa ausente, link completo, erro/retry/vazio e resposta atrasada.

## US-37
RED: 3 falhas e 237 aprovados, sem erros de tipos; commit 4a79f26. GREEN: 240 testes, lint, tipos e build. Identidade arbitrária rejeitada, credenciais válidas, identidade divergente, revogação por logout no serviço e no botão da interface. Os testes anteriores de comentários agora preparam sessão interna para isolar validação de texto e destino.

Navegador real em 11/10/2026: entrada por teclado, abas por Enter, seletor por ArrowDown e persistência entre rankings; larguras 320 e 1280 sem overflow horizontal (clientWidth/scrollWidth iguais). Visitante abriu review sem editor, Ana entrou e publicou no editor existente, logout removeu editor, comentário permaneceu público e apareceu nos dois rankings. Override de viewport restaurado. Suíte existente cobre catálogo, estrelas, favoritos, seguir/feed e sino/modal.

Evidência visual: C:/Users/lucas/.codex/visualizations/2026/10/11/01a12bcf-03f3-7de1-be8e-ae1f5bf86a7a/pr09-comunidade.png.
