# S-PR-14 — Login após cadastro

Branch `feat/sexta-14-cadastro-login`, base `7005f71`. Ajuste de Front pronto para revisão local, sem merge. Front não possui remoto configurado; sem publicação. Backend não alterado.

Após `authService.register` confirmar uma resposta válida, RegisterPage limpa a senha e navega para `/login` com `replace`. LoginPage mostra `Conta criada. Entre para continuar.` somente quando o estado de navegação contém o sinal booleano confirmado. O estado carrega apenas `{ registrationComplete: true }`, sem e-mail, senha, token ou usuário. Não há autenticação automática nem segunda chamada ao navegar; campos do login começam vazios.

Validação local, e-mail duplicado, rede, erro HTTP ou resposta incompatível mantêm `/cadastro`, mensagem de erro, campos úteis e possibilidade de tentar novamente. Trava síncrona, disabled e andamento existentes foram preservados. Voltar não reabre o formulário concluído; acesso posterior comum ao login não apresenta mensagem de cadastro de outra navegação.

## Validação

- RED `1b7e063`: 6 falhas funcionais de redirecionamento e 4 cenários já aprovados, sem erros de tipos; commit de testes anterior ao código. [TDD](TDD-S-PR-14.md).
- `tests/registration-navigation.test.tsx`: Router e transporte HTTP controlados cobrem sucesso pendente, dois submits/um POST, replace/Voltar, estado sem credenciais, ausência de login/sessão, validação, 400/409/500, rede, corpo inválido, retry e estado não confirmado no login.
- Regressões de cadastro/integracão foram adaptadas para aguardar o formulário de login em vez do antigo link manual. Um seletor antigo de status podia capturar `Criando conta…` antes da transição; passou a aguardar a rota/formulário de destino. O teste integrado E2E antigo também reabre explicitamente o cadastro para verificar duplicidade; não foi executado nesta entrega, pois depende das adaptações de catálogo/IDs já documentadas anteriormente.
- `npm.cmd run check`: 479 testes/71 arquivos, lint, TypeScript e build aprovados.
- `npm.cmd exec playwright test -- --config playwright.registration.config.ts`: 1 E2E Chromium aprovado com servidor HTTP/CORS sintético exclusivo do teste. Cobre Enter repetido, 409, campos preservados, retry 201, login visitante com senha vazia, somente POSTs de cadastro e histórico com replace. Não é validação live da API habitual. [Captura inspecionada](evidence/S-PR-14-registration-login.png).

## Ordem de execução e pendências

A orientação vigente limita o trabalho ao Front e manda pular US que exigem backend. S-PR-05/07/08/10/12 pertencem ao Back. S-PR-06 depende das opções/filtros da S-PR-05; S-PR-09/11/13 dependem de likes/ranking das S-PR-08/10/12. A base inspecionada não tem `/games/filters`, parâmetros genreId/platformId, endpoints de likes ou ranking de comentários curtidos. Essas PRs foram puladas nesta execução, permanecem pendentes e não são declaradas entregues. S-PR-14 é a próxima alteração de Front independente.

O critério genérico de IDs inteiros da quinta fase continua pendente como nas PRs anteriores. Contratos tipados e IDs opacos existentes foram preservados, sem migração, conversão silenciosa, `any`, GUID/UUID ou mocks no runtime.
