# TDD — contratos numéricos

Branch: `fix/login-identidade-numerica`. Sem merge.

## RED registrado antes das correções

1. `dac176b`: identidade numérica e armazenamento indisponível; seis falhas funcionais reproduzidas entre 17 testes, sem erros de compilação.
2. `9a75e88`: falha de armazenamento na confirmação `auth/me`; reproduzida retenção indevida do token provisório.
3. `f75e0ca`: jogos locais numéricos separados da IGDB; quatro falhas funcionais entre 15 testes, sem erros de compilação.

## GREEN

Validadores passaram a aceitar números locais válidos e rejeitar strings, zero, negativos, frações e valores fora de int32. `igdbId` é validado separadamente. Rotas convertem somente decimais canônicos válidos. Referências de usuário/jogo foram propagadas pelos serviços e UI, preservando IDs próprios textuais.

O reconhecimento de `storage_unavailable` preserva a limpeza da sessão e o tratamento de email duplicado. A suíte existente recebeu fixtures compatíveis com o contrato novo, mantendo os cenários de autorização, navegação, notificações, favoritos e publicação.

Validação final: 519 testes/74 arquivos, lint, tipos e build. E2E Chromium sintético aprovado, cobrindo cadastro/login/dashboard e a diferença entre ID local e externo. Não representa validação de gravações no PostgreSQL com conta real.
