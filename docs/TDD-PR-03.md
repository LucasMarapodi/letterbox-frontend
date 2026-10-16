# TDD — PR-03

Branch `feat/pr-03-autenticacao-mockada`, derivada da PR-02 no commit `f952f24`. A branch anterior estava limpa e commitada; nenhum merge realizado.

## US-12
- RED: `npm run check` — 8 falhas esperadas por login/validação/sessão ausentes, 87 testes verdes.
- Commit RED: `test(US-12): especifica login validacao e sessao centralizada`.
- GREEN: `npm run check` — 95 testes aprovados; lint, tipos e build aprovados.

## US-13
- RED: 8 falhas esperadas e 95 testes aprovados; commit 6b44b64.
- GREEN: 103 testes, lint, tipos e build aprovados.

## US-14
- RED: 3 falhas esperadas e 103 testes aprovados; commit c855d49.
- GREEN: 106 testes, lint, tipos e build aprovados.

## Revisão US-05 — notificações sem página
- RED: 2 falhas esperadas e 104 testes verdes; commit fb8dd3a.
- GREEN: 106 testes, lint, tipos e build aprovados. Rota e link removidos; testes antigos de acesso ajustados ao novo escopo.

## Revisão US-14 — acesso sem rota de notificações
Proteção de ações existente revalidada sem alteração funcional: visitante recebe link de login, usuário autenticado executa ação e logout remove a ação e restabelece o caminho de login. Testes independem de notificações. Não há RED artificial para comportamento já implementado. Verificação completa: 106 testes, lint, tipos e build aprovados. Sino, modal e descarte de dados no logout/troca de conta permanecem para US-28.

## Dashboard — ajuste visual solicitado
- RED: 1 falha esperada e 106 testes verdes; commit cd63b97.
- GREEN: 107 testes, lint, tipos e build aprovados.
- Layout escuro centralizado, marca no topo, introdução com acesso ao cadastro, busca compacta, bordas arredondadas e adaptação para telas pequenas. CSS sem dependências adicionais. Visual conferido no navegador.

## Correção — login pendente e logout
RED: 1 falha esperada e 151 testes verdes, commit f512629. GREEN: 152 testes, lint, tipos e build aprovados. Logout invalida respostas anteriores; login novo continua funcional.
