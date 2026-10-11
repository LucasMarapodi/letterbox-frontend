# TDD — PR-02

Branch `feat/pr-02-catalogo-publico`, criada diretamente de `feat/us-01-a-06-fundacao` no commit `695fb5b`. Nenhum merge realizado; a branch anterior estava limpa e todas as alterações estavam commitadas.

## US-07
- RED: `npm run check` — 6 falhas por ausência da listagem/estados; 45 testes verdes. A primeira execução com mock incompleto foi descartada como evidência e corrigida antes do RED válido.
- Commit RED: `test(US-07): especifica listagem publica e estados do catalogo`.
- GREEN: `npm run check` — 51 testes aprovados; lint, tipos e build aprovados.

## US-08
- RED: `npm run check` — 4 falhas: campo de busca/ações ausentes e mock sem filtro; 51 testes anteriores verdes.
- Commit RED: `test(US-08): especifica busca limpeza e respostas fora de ordem`.
- GREEN: `npm run check` — 55 testes aprovados; lint, tipos e build aprovados.

## US-09
- RED: `npm run check` — 4 falhas: seletor/ordenação ausentes e requisições sem sort; 53 testes verdes.
- Commit RED: `test(US-09): especifica ordenacao mantendo busca e dados originais`.
- GREEN: `npm run check` — 57 testes aprovados; lint, tipos e build aprovados.

## US-10
- RED: `npm run check` — 7 testes falharam pela ausência de dados, carregamento, mensagem de inexistência e consulta pelo ID; 57 testes anteriores verdes.
- Commit RED: `test(US-10): especifica detalhes publicos ausencia erro e consulta por ID`.
- GREEN: `npm run check` — 64 testes aprovados; lint, tipos e build aprovados.
