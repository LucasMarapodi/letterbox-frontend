# Evidências de execução

Todos os comandos executados em `Front`, na branch `feat/us-01-a-06-fundacao`.
O sandbox travou o Vitest; validações são executadas com a autorização concedida.

## US-01
- RED: `npm test` — 1 teste falhou: título acessível `Game Reviews` ausente no ponto de montagem vazio. Uma tentativa anterior por módulo ausente foi descartada como evidência.
- Commit RED: `test(US-01): especifica titulo acessivel da pagina inicial`.
- GREEN: `npm run check` — 1 teste aprovado; lint, tipos estritos e build aprovados.
- O ponto de montagem vazio no RED é apenas infraestrutura do teste; não contém interface funcional.

## US-02
- Refatoração sem comportamento novo: o teste existente protege a página inicial.
- `npm run check` — 1 teste aprovado; lint, tipos e build aprovados.
- Organização e responsabilidades documentadas no README. Sem RED artificial, conforme exceção da US-02.

## US-03
- RED: `npm test` — 3 testes de tipos falharam: os contratos ausentes não rejeitavam exemplos inválidos (`@ts-expect-error` não utilizado).
- Commit RED: `test(US-03): especifica contratos validos e invalidos do dominio`.
- GREEN: `npm run check` — 4 testes aprovados (3 de tipos); lint, tipos e build aprovados.
- Casos válidos com `satisfies`; casos inválidos documentados e rejeitados pelo TypeScript.

## US-04
- RED: `npm test` — 8 testes de leitura/erro/isolamento/seleção falharam nos pontos de teste não funcionais.
- Commit RED: `test(US-04): especifica leitura erro isolamento e selecao de servicos`.
- GREEN: `npm run check` — 12 testes aprovados; lint, tipos e build aprovados.
- Inclui cópias profundas das entradas/retornos, fixtures vazias e substituição do adaptador via contrato.

## US-05
- RED: `npm run check` — 10 testes falharam por ausência de links, parâmetros e mensagem de página inexistente; 12 testes anteriores verdes.
- Commit RED: `test(US-05): especifica navegacao parametros e pagina inexistente`.
- GREEN: `npm run check` — 22 testes aprovados; lint, tipos e build aprovados.
- Navegação testada com MemoryRouter, incluindo retorno à Home e IDs diferentes dos exemplos.
