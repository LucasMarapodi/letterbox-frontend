# TDD — I-PR-03

Branch feat/integracao-pr-03-sessao, base ab99e3c. Somente Front; alterações de backend não autorizadas. Não houve necessidade de alterar Back.

## I-US-06
RED: 5 falhas e 306 aprovados; commit 3f9a931. GREEN: 311 testes, lint, tipos e build. Cadastro no runtime produtivo usa HTTP, DTO retornado, body restrito, 400/409, pendência e duplo envio, erro/rede sem conta substituta e sucesso sem autenticar. Doubles da suíte legada configurados exclusivamente em tests/setup.ts; os novos testes injetam transporte na composição produtiva.
