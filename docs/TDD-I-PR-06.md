# TDD — I-PR-06

Branch feat/integracao-pr-06-dashboard-feeds, base 8aa7b66. Sem alterações de backend; dependências novas de backend deixam a US pendente.

## I-US-19
RED: 5 falhas e 1 aprovado; commit f7824cf. GREEN: 388 testes, lint, tipos e build. Dashboard tipado usa sessão compartilhada; dados iniciais passados às seções sem GET favorites/feed duplicados. Atualizar feed consulta feed/following; rede/vazio/visitante/tardio após logout cobertos. Doubles de outros domínios isolam dashboard com agregado vazio, explicitamente desativado nos testes do próprio dashboard.

## I-US-20
RED: 4 falhas esperadas; commit bb24b98. GREEN: 392 testes, lint, tipos e build. Recentes/rankings públicos via API sem Bearer, períodos 7d/24h/30d, contagem e último comentário preservados do servidor. Review antiga permanece em ranking quando servidor retorna comentários recentes; chave de período/aba e cleanup ignoram respostas atrasadas. Rede/retry/vazio sem fixtures.

## I-US-21
RED: 6 falhas esperadas; commit c628315. GREEN: 398 testes, lint, tipos e build. Sino autenticado consulta somente ao abrir/reabrir; DTOs new-review/review-comment validados, sem geração local. Erro/retry/vazio no modal, foco contido e Escape devolve foco. Fechar ignora resultado anterior; 401 descarta sessão/modal; privados não aceitam User sem token. Testes de composição verificam sino disponível sem consulta antecipada.
