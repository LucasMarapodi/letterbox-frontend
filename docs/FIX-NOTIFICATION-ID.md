# Fix — Notification.id numérico

Branch `fix/notification-id-numerico`, base `9270226`. O consumidor rejeitava notificações do backend porque validava o ID próprio como texto. `Notification`, `NotificationEvent` e o DTO HTTP derivado agora usam `NotificationId = LocalId`; o decodificador aceita inteiros positivos até 2.147.483.647, sem converter texto em número. Os dois eventos existentes mantêm suas referências numéricas e união discriminada.

Fixtures HTTP e doubles usam IDs numéricos. O desempate por ID no double compara números. O sino já utiliza o ID apenas como chave React, e seus links continuam apontando para reviewId; não foi necessária alteração de interface, endpoint ou Backend. Tokens continuam textuais.

TDD: commit RED `62e98d2`, com duas falhas funcionais reproduzidas antes da correção: rejeição do ID numérico e aceitação indevida de texto. Após o fix, 136 testes em dez arquivos passaram, cobrindo limites do ID, ambos os eventos, adapters HTTP, sino, foco/reabertura, falhas/retry, 401 e isolamento de sessão. Lint, TypeScript, build e diff check aprovados. A primeira execução focada foi impedida por acesso aos temporários do Vitest no sandbox; a repetição fora dele passou. A suíte completa e o E2E não foram repetidos neste fix. Sem escrita em dados reais.

Entrega local, sem publicação ou merge.
