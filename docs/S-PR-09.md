# S-PR-09 — Curtir e descurtir reviews

Branch `feat/sexta-09-review-likes-ui`, base `258b731`. Implementação exclusiva do Front, usando o contrato existente da S-PR-08.

Reviews exibem contagem pública e ação de curtir independente da estrela de favorito nos detalhes, jogo, perfil, favoritos, feed e Comunidade. Visitantes recebem convite para login ao tentar curtir, sem consultas privadas ou escritas. Usuários autenticados têm botão com aria-pressed após confirmação do estado pessoal, loading e trava síncrona compartilhada por review.

O contrato exige likeCount inteiro de 0 a 2147483647 nas projeções públicas. GET privado `/api/v1/reviews/{id}/like/me` aceita apenas likedByMe booleano. PUT/DELETE `/api/v1/reviews/{id}/like` enviam Bearer e nenhum corpo; após 204, o Front consulta estado pessoal e GET público da review para confirmar a contagem. Não existe endpoint separado de count no contrato. A consulta inicial aproveita a contagem da projeção e agrupa a leitura pessoal por ID, mesmo quando a review aparece duas vezes na página.

Falhas mantêm a última contagem confirmada com aviso e recuperação somente por GET, evitando repetir uma escrita que pode ter sido concluída. Estado compartilhado é descartado por rota/sessão; respostas de consultas e escritas antigas não atualizam a nova sessão. Likes não escrevem favoritos, notificações ou rankings de comentários.

## TDD e validação

RED `97704fe`: 18 falhas funcionais confirmadas e commitadas antes da implementação. Cobertura nova ampliada para 20 cenários, incluindo contratos, visitante, teclado, duplicação na tela, concorrência, falhas após 204 e respostas antigas após logout/troca de conta.

Passaram **180 testes distintos em 18 arquivos**, em dois lotes pertinentes (121 + 59), sem erros de tipos. Lint, TypeScript completo, build e diff aprovados. Fixtures de Review passaram a informar likeCount explicitamente. Suíte completa, testes extensos do Back e E2Es históricos não foram executados.

## API real e navegador

A API habitual em 5080 ainda executava o contrato anterior, e o Back continha desenvolvimento paralelo da S-PR-32. Esse processo e os arquivos de backend foram preservados. O código existente foi compilado em saída separada, com zero avisos/erros, e iniciado em 5089; OpenAPI confirmou o novo endpoint e likeCount inteiro. Nenhuma alteração de código do Back, dependência ou migration foi feita nesta entrega.

Chromium com Front 5175/API 5089 e PostgreSQL reais verificou visitante, teclado, duas contas curtindo, remoção preservando a curtida da outra conta, favorito independente e troca de conta no mesmo navegador. Contas locais de teste **16/17**, review existente **4**: contagem inicial 0, depois 1 e 2; vínculos de curtida/favorito criados pelo teste removidos e contagem final 0. As contas de teste permanecem; nenhum dado de contas existentes foi removido. Requisições de escrita confirmadas sem corpo/Content-Type. Scripts temporários excluídos.

Capturas conferidas em [desktop](evidence/S-PR-09-likes-1280.png) e [mobile](evidence/S-PR-09-likes-375.png), sem overflow horizontal. Para testar esta entrega, instâncias separadas permanecem em **http://127.0.0.1:5175/** e **http://localhost:5089**; o Front habitual 5173 continua apontando para a API antiga e exige atualização dessa API para este contrato.

Front sem remoto configurado. Entrega local, sem publicação ou merge.
