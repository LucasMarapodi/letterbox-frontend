# S-PR-03 — Ações sem duplicidade

Branch `feat/sexta-03-acoes-sem-duplicidade`, base `676452b`. Ajuste do Front para revisão local, sem merge. Front não possui remoto configurado; publicação não realizada. Backend não alterado.

Dois disparos síncronos de logout antes do próximo render chamavam o serviço duas vezes. A sessão agora mantém uma trava síncrona identificada pela operação, informa `Encerrando sessão…` até a revogação terminar e libera a trava em `finally`. Limpeza local e navegação para `/` continuam imediatas. Iniciar novo login desvincula o andamento do logout anterior; resposta antiga não muda sessão, aviso nem trava da operação atual. Navegação e login continuam disponíveis.

Comentário e edição de review limpam o aviso de sucesso anterior ao começar uma nova tentativa. Em erro, conservam o rascunho e liberam o formulário; não mantêm indicação de sucesso sobre a tentativa fracassada.

## Auditoria das mutações

| Operação | Proteção e evidência |
| --- | --- |
| Login/cadastro | Trava `useRef` existente, campos/botão desabilitados, texto de andamento e `finally` preservados. Transporte pendente cobre clique + submits simultâneos, erro, campos preservados e retry. |
| Logout | Trava por operação no SessionProvider; uma chamada ao serviço e um POST. Sair desaparece ao limpar a sessão; status permanece na Home até conclusão. Erro mantém visitante e aviso, sem restaurar sessão. Nova sessão pode sair novamente. |
| Salvar perfil | Trava e disabled existentes preservados; PATCH pendente, erro/retry e callback único testados. |
| Publicar/editar review | ReviewTextForm conserva trava síncrona, disabled e `finally`. POST/PATCH, falha/retry e callback único cobertos. Edição limpa sucesso anterior. |
| Salvar nota | Trava por controle/alvo, fieldset/botão desabilitados e texto de andamento existentes; PUT único, erro/retry e callback cobertos. |
| Comentar | ReviewTextForm bloqueia duplicatas, mantém rascunho no erro e limpa campo somente após sucesso; novo envio limpa sucesso anterior. |
| Favoritar jogo/review | Travas por controle/alvo existentes; PUT, falha e retry cobertos para ambos os tipos. Duas ações em alvos diferentes enviam uma chamada cada e finalizam independentemente. Remoção permanece coberta pela suíte anterior. |
| Seguir | Trava, disabled e `finally` existentes; PUT único, erro/retry e callback cobertos. Deixar de seguir permanece coberto pela suíte anterior. |
| Marcar notificações | Não existe essa ação na interface nem método de escrita no contrato NotificationService/adapters; apenas `list`/GET. Não foi inventado endpoint nem alterado Back. Marcação fica pendente de contrato próprio. |

## Verificação

RED `1148576`: 3 falhas funcionais e 10 cenários já aprovados. RED complementar `6f1d46e`: prova que logout invocava o serviço duas vezes. Commits de testes anteriores à implementação. [TDD](TDD-S-PR-03.md).

`tests/mutation-pending.test.tsx` contém 16 cenários. Além da matriz de mutações, cobre sucesso anterior, alvos independentes, logout com sucesso/erro, novo login durante revogação e descarte da resposta antiga. Submits disparados no mesmo `act` verificam a trava antes do render de disabled; E2E usa Enter real.

Validação: `npm.cmd run check` com 459 testes em 69 arquivos, lint, TypeScript e build. `npm.cmd exec playwright test -- --config playwright.mutations.config.ts`: 1 E2E Chromium aprovado, com servidor HTTP/CORS sintético exclusivo do teste. Enter repetido gera um POST de login por tentativa; erro mantém campos e libera retry; logout pendente retorna à Home com navegação livre. Não é evidência de backend/IGDB live.

## Pendências explícitas

Marcação de notificações depende de contrato ausente e não faz parte do comportamento disponível nesta base. Likes futuros devem implementar a mesma proteção em suas próprias US.

O requisito genérico de IDs inteiros da quinta fase continua pendente, como nas S-PR-01/02. A base usa IDs opacos string; contratos tipados e IDs foram preservados, sem conversão silenciosa, `any`, GUID/UUID ou mocks no runtime. A revisão local se limita às mutações disponíveis no Front e mantém essas limitações visíveis.
