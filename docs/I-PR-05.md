# I-PR-05 — Perfis, conexões e favoritos integrados

Perfis e ações sociais passam a consumir a API existente. O próprio perfil oferece edição de nome/biografia/avatar, sincronizada com o menu; relações e favoritos dependem do token, sem identidade no corpo. Leitura pública distingue usuário inexistente de falha nas listas.

Preparada localmente na branch `feat/integracao-pr-05-perfil-social`, base `78e7177` (I-PR-04). I-US-15–18 concluídas. Nenhum merge ou publicação remota: Front não tem remoto configurado.

## TDD e verificações

| US | Commit RED | Commit GREEN | Testes |
| --- | --- | --- | --- |
| I-US-15 | 59e93ee | 86840dd | 366 |
| I-US-16 | 68cb661 | 322e1a7 | 374 |
| I-US-17 | d98b9c6 | 2f1ba92 | 378 |
| I-US-18 | 3cf10e2 | d3950a0 | 382 |

Cada GREEN passou pelo npm run check: testes, lint, tipos e build. [Registro TDD](TDD-I-PR-05.md). Testes http-profile-flow, http-profile-edit, http-follow-flow e http-favorite-flow cobrem DTOs/projeções, erro parcial, 404 versus rede, omissão/null, alteração da sessão sem recriar token, cancelamento tardio, 204, requests mínimos e isolamento.

## API real e navegador

Validação em 13/10/2026, horário local. Vite `http://127.0.0.1:5173` e API existente `http://localhost:5080`, origens distintas, sem proxy/interceptações.

- Visitante abriu perfil de Ana, review e conexões públicos, sem editor/favoritos pessoais.
- Bia alterou nome para Bia PR5 e biografia; página e menu atualizaram. Novo login recuperou os dados persistidos. Próprio perfil não mostrou ação de seguir a si mesmo.
- Bia abriu Ana sem editor, seguiu/deixou de seguir e listas atualizaram; voltou a seguir para verificar a relação entre contas.
- Bia favoritou Atlas de Cinzas e review de Ana. Ambos apareceram no próprio perfil. Remover jogo alterou botão e nova visita mostrou lista vazia, mantendo a review favorita.
- Logout removeu editor e listas pessoais. Ana entrou, encontrou favoritos próprios vazios e Bia entre seus seguidores; abriu perfil editado de Bia sem editor/favoritos da outra conta. Ao sair, perfil/reviews/conexões continuaram públicos.

Capturas na pasta de visualizações da conversa: integracao-pr05-perfil-proprio.png (editor/menu e favorito de review após remoção do jogo) e integracao-pr05-perfil-publico.png (visitante). Perfil público verificado sem overflow: clientWidth/scrollWidth 1265 no viewport normal de 1280.

## Métodos e status observados no harness

`tests/manual/pr05-api.ps1` cria duas contas sintéticas e imprime somente método/caminho/status. Executar em PowerShell 7: `./tests/manual/pr05-api.ps1 -ApiBase http://localhost:5080`. Credenciais ficam transitórias na memória; registros de contas permanecem na API em memória até reinício.

| Endpoint, relativo a /api/v1 | Status e cenário |
| --- | --- |
| GET users/{id} | 200 imediatamente após cadastro, antes de visita/review; 404 ausente, sem segredo no DTO |
| GET users/{id}/reviews | 200 lista inicial vazia |
| GET users/{id}/followers e following | 200 vazio e relação presente uma vez após PUT repetido |
| PATCH users/me/profile | 200 campos permitidos, PATCH apenas avatar null preserva nome/bio; 400 nome vazio/FTP; 401 visitante |
| GET users/{id}/follow/me | 200 following false/true/false |
| PUT users/{id}/follow | 200 repetição idempotente; 400 própria conta; 401 visitante |
| DELETE users/{id}/follow | 204, inclusive repetição |
| GET favorites | 200 listas com game/review e segunda conta vazia; 401 visitante/token revogado |
| GET favorites/{kind}/{id} | 200 wrapper null nos dois tipos; 404 alvo ausente; 400 kind inválido |
| PUT favorites/{kind}/{id} | 200 game/review; PUT game repetido preserva ID |
| DELETE favorites/{kind}/{id} | 204 game/review; GET posterior confirma remoção |

Todas as respostas verificadas incluíram Access-Control-Allow-Origin para a origem do Vite. Status negativos são do harness; falhas de rede/erro parcial/rascunhos e resposta tardia na UI têm doubles tipados. Não se afirma que esses erros foram provocados no navegador/API real. Remoção de avatar foi verificada no harness e pelo formulário em teste HTTP; no navegador foi alterado nome/biografia.

## Limites

400/rede preservam os campos do editor. 401 não declara sucesso e desmonta o editor ao limpar sessão, seguindo a regra global de descarte de dados privados; não se mantém formulário editável para visitante nem se transfere rascunho a outra conta.

Listas de favoritos não são cacheadas: após ação, a próxima montagem consulta dados atuais. Dashboard ainda não tem cache ou consumo ativo; sua Home permanece sem GET favorites duplicado até I-PR-06. Feed/notificações e consultas públicas da Comunidade aguardam essa PR; retirada final de mocks na I-PR-07. SQL, JWT e IGDB real fora do escopo.

Nenhum arquivo de Back foi editado ou commitado nesta entrega; alterações locais externas existentes foram preservadas. Nenhuma US precisou de alteração no backend ou foi ignorada. Planejamento e matriz foram atualizados em terceira-fase.
