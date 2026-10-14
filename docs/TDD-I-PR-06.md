# TDD — I-PR-06

Branch feat/integracao-pr-06-dashboard-feeds, base 8aa7b66. Sem alterações de backend; dependências novas de backend deixam a US pendente.

## I-US-19
RED: 5 falhas e 1 aprovado; commit f7824cf. GREEN: 388 testes, lint, tipos e build. Dashboard tipado usa sessão compartilhada; dados iniciais passados às seções sem GET favorites/feed duplicados. Atualizar feed consulta feed/following; rede/vazio/visitante/tardio após logout cobertos. Doubles de outros domínios isolam dashboard com agregado vazio, explicitamente desativado nos testes do próprio dashboard.

## I-US-20
RED: 4 falhas esperadas; commit bb24b98. GREEN: 392 testes, lint, tipos e build. Recentes/rankings públicos via API sem Bearer, períodos 7d/24h/30d, contagem e último comentário preservados do servidor. Review antiga permanece em ranking quando servidor retorna comentários recentes; chave de período/aba e cleanup ignoram respostas atrasadas. Rede/retry/vazio sem fixtures.
