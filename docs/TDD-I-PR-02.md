# TDD — I-PR-02

Branch feat/integracao-pr-02-http, base c0de574 de Front. Back I-PR-01 existente foi apenas consultado; nenhum arquivo de Back alterado.

## I-US-03
RED: 16 falhas e 241 aprovados (257 casos); commit 1b39be5. GREEN: 257 testes, lint, tipos e build aprovados. Transporte central, URL/query codificada, JSON/Bearer por operação, 204 sem parser, erros seguros de rede/HTTP/contrato/cancelamento e nenhuma repetição automática. O double clona respostas para permitir múltiplas leituras independentes.

IDs percentuais e barras são codificados por segmento. Identificadores isolados . e .. são rejeitados antes do fetch: o navegador normaliza dot-segments mesmo codificados. Sem convenção adicional do backend não existe representação segura desses dois IDs em path; não são gerados pela API atual. Não reutilizar a convenção ~ da rota interna de UI no endpoint HTTP.
