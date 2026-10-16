# TDD — I-PR-04

Branch feat/integracao-pr-04-reviews, base 0c58697 de Front. Código de Back não será alterado; dependências de backend deixam a US pendente conforme orientação do usuário.

## I-US-10
RED focado: 5 falhas e 3 aprovados, sem erros de tipos; commit 33cb323. GREEN: 332 testes, lint, tipos e build. Catálogo, filtros, percentuais literais, detalhes e opiniões HTTP; 404 válido vira null, rede/500/contrato não viram ausência. Zero/data sem hora/capa null e erro/recuperação/vazio na interface. Cenários de autenticação foram isolados do GET público novo por double de catálogo em tests; visitante agora consulta apenas catálogo público sem Bearer.

## I-US-11
RED: 8 falhas esperadas; commit 0738b61. GREEN: 340 testes, lint, tipos e build. Notas pessoais HTTP, wrappers null/zero/decimal, corpo somente value e Bearer da sessão (User recebido não autoriza), 400/401/404 e visitante rejeitado. Estrelas recuperam decimal e preservam resposta salva; PUT atualiza jogo e opiniões por consultas HTTP. Capacidades separadas permitem ativação individual dos fluxos.
## I-US-12
RED: 5 falhas esperadas; commit 62b709e. GREEN: 345 testes, lint, tipos e build. Publicação com text/Bearer, review própria por wrapper, conflito 409 consulta registro existente, falha preserva rascunho e sucesso atualiza a lista pública por GET reviews sem duplicar ou sobrescrever a média.
## I-US-13
RED: 7 falhas esperadas; commit 2cb5507. GREEN: 352 testes, lint, tipos e build. Leitura HTTP pública, PATCH somente text, projeção validada, ID/createdAt preservados; edição exclusiva do autor na UI e autorização Bearer no servidor. Mensagens distintas para 403, 404 e rede sem perder rascunho. Ajustadas as esperas da navegação e a seleção do texto público no teste.
## I-US-14
RED: 9 falhas esperadas; commit 39d5f29. GREEN: 361 testes, lint, tipos e build. Leitura pública, POST somente text/Bearer, 201 refresca lista sem duplicar, visitante não possui formulário, logout/401 revogam escrita. 400/404/rede preservam texto sem sucesso fictício. O double de 400 foi alinhado ao code validation_failed do contrato real antes da verificação final.
