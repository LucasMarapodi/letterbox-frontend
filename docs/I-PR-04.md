# I-PR-04 — Catálogo, reviews e comentários via API

Preparada localmente na branch `feat/integracao-pr-04-reviews`, base `0c58697` (I-PR-03). I-US-10–14 entregues; nenhum merge. Front não possui remoto configurado, portanto nenhuma PR remota foi publicada.

## Comportamento entregue

As telas consultam jogos, opiniões, notas, reviews e comentários pela API existente. Requests privados usam exclusivamente o token da sessão em memória, com corpos mínimos value/text. 404 público é ausência; rede/contrato inválido produzem erro. Notas pessoais são recuperadas ao reabrir; alterações atualizam média/jogo. Publicação refresca GET reviews, conflito consulta reviews/me, edição mantém identidade/data original e comentários refrescam sem duplicação. Erros preservam os rascunhos e não criam dados locais fictícios.

## TDD e verificações

| US | Commit RED | Commit GREEN | Testes no GREEN |
| --- | --- | --- | --- |
| I-US-10 | 33cb323 | e6e0b41 | 332 |
| I-US-11 | 0738b61 | e4a25b6 | 340 |
| I-US-12 | 62b709e | 133ebfe | 345 |
| I-US-13 | 2cb5507 | 4d07339 | 352 |
| I-US-14 | 39d5f29 | 53faa55 | 361 |

Cada GREEN passou por npm run check: testes, lint, TypeScript e build. [Registro TDD](TDD-I-PR-04.md). Testes de comportamento: http-catalog-flow, http-rating-flow, http-publication-flow, http-edit-flow e http-comment-flow; transporte e sessão mantêm cobertura de cancelamento/401 da PR anterior.

## Navegador e API reais

Validação em 13/10/2026, horário local (gravações UTC aparecem como 14/10 na interface). Vite `http://127.0.0.1:5173` e Back existente `http://localhost:5080`, sem proxy ou interceptações. Contas sintéticas Bia PR3 e Ana:

- Visitante abriu catálogo, Atlas de Cinzas, review da API e comentários existentes em ordem.
- Bia filtrou Aurora, ordenou Z–A, salvou cinco estrelas e publicou em Circuito Aurora. Lista e média atualizaram; edição alterou texto na mesma review.
- Ao voltar à Home e reabrir, Bia recuperou cinco estrelas e review editada. Ana recebeu nota pessoal zero/ausente, sem herdar a de Bia; leu a review editada, sem editor, e publicou comentário.
- Logout removeu o formulário; o comentário apareceu uma única vez, inclusive em nova visita pública.
- Origem temporária `localhost:5199` indisponível produziu erro no catálogo e botão de tentativa, sem fixtures. Configuração local restaurada para 5080 e catálogo recuperado. O processo de Back foi mantido; esse teste comprova falha real de conexão, sem alegar desligamento físico da API.

Evidência visual: `integracao-pr04-reviews.png` e `integracao-pr04-api-indisponivel.png` na pasta de visualizações da conversa. Viewport normal de 1280; DOM com largura útil/scrollWidth 1265, sem overflow horizontal na review.

## Status observados no harness HTTP real

`tests/manual/pr04-api.ps1` usa duas contas novas, IDs reais e saída limitada a método/rota/status. Executar com PowerShell 7: `./tests/manual/pr04-api.ps1 -ApiBase http://localhost:5080`. Cria registros sintéticos na memória da API; não grava credenciais em arquivo.

| Endpoint (prefixo /api/v1) | Status observados e cenário |
| --- | --- |
| GET games?term=Aurora&sort=name-desc | 200, filtro/ordenação |
| GET games/{id} | 200 existente; 404 inexistente |
| GET games/{id}/opinions | 200, agregado público |
| GET games/{id}/rating/me | 200 wrapper null; 401 visitante |
| PUT games/{id}/rating/me | 200 decimal 4.5; 400 valor 6 |
| GET games/{id}/reviews/me | 200 null inicial e review publicada |
| POST games/{id}/reviews | 201; 409 segunda publicação |
| GET games/{id}/reviews | 200 lista pública após publicação |
| GET reviews/{id} | 200; 404 inexistente |
| PATCH reviews/{id} | 200 autor, ID/createdAt preservados e updatedAt definido; 403 outra conta; 404 inexistente |
| GET reviews/{id}/comments | 200 antes/depois, ID novo uma vez |
| POST reviews/{id}/comments | 201 outra conta; 400 texto vazio; 404 inexistente; 401 visitante e token revogado |

Todas essas respostas incluíram Access-Control-Allow-Origin para a origem real do Vite. Status de erro acima foram medidos pelo harness, sem atribuí-los a cenários de navegador não executados. Rede/500/DTO inválido e mensagens específicas de falha na UI são cobertos por doubles tipados; não há alegação de 500 provocado no backend real.

## Limites e próximas entregas

Nenhum arquivo de Back foi editado ou commitado nesta PR. Alterações locais encontradas nesse repositório durante a validação foram preservadas. Nenhuma US precisou de alteração de backend ou foi ignorada. Perfis/social e Dashboard/Comunidade/sino continuam para I-PR-05/06; mocks públicos desses domínios ainda aguardam retirada final na I-PR-07. Links temporários de exemplo podem levar a registros inexistentes na API. Banco, JWT e IGDB real permanecem fora de escopo.
