# G-PR-05 — Catálogo paginado e metadata no Front

READY_LOCAL na branch feat/igdb-pr-05-front-paginacao, base 0981a79 de Front. G-US-13–14 implementadas com TDD. Dependência Back em fec0fa8 inclui G-PR-01–04; nenhum arquivo de Back foi alterado. Sem merge e sem publicação remota (Front não possui remoto).

A API deixou de devolver array de jogos: GameService/DTO/decoder agora consomem items/page/pageSize/hasNextPage. Home mostra Recentes (release-desc), busca implícita name-asc, opções name-asc/name-desc, página e anterior/próxima conforme resposta. Busca/sort/limpar resetam página 1; ordenação explicitamente escolhida é preservada. Não há ordenação local para simular ordem global, total fabricado ou acesso à IGDB pelo Front. IDs opacos e capas ausentes preservados.

Cliente HTTP lê X-Catalog-Stale/X-Catalog-Fetched-At sem request adicional. Metadata fica fora das entidades em store tipado por operação, com limite e proteção contra respostas anteriores. Aviso discreto e timestamp original quando válido; nenhuma data inferida de agora. Catálogo/detalhe e projeções de jogos em review/perfil/favoritos/dashboard/feed/Comunidade sinalizam stale. Fresh/ausência não avisa. Consultar novamente e retry refazem consultas da API. Erros de integração 502/503/504 mantêm login; 401 da plataforma mantém limpeza de sessão.

## Verificação

- RED b1929d0, GREEN G-US-13 95925bc, 404 testes + lint/tipos/build.
- RED G-US-14 340cb73 e 024bd11, GREEN final: 415 testes + lint/tipos/build.
- npm run test:e2e:catalog: Chromium aprovado com servidor de contrato sintético, sem chamadas externas; evidências [captura](evidence/G-PR-05-catalog-contract.png) e [chamadas](evidence/G-PR-05-contract-calls.json). Este teste não comprova IGDB live.
- [Contrato/CORS real do backend](evidence/G-PR-05-backend-contract.json): host temporário do binário existente G-PR-04, health/OpenAPI, GamePageResponse e headers expostos. Não consulta jogos/OAuth/IGDB.
- Source/bundle sem mocks produtivos, VITE secrets ou cliente Twitch/IGDB; teste de runtime permanece na suíte. Nenhum banco ou nova dependência.

## Executar e limitações

```sh
npm run check
npm run test:e2e:catalog
```

O E2E determinístico inicia Vite em 5175 e servidor sintético em 5091; portas livres e Chromium instalado são necessários. Os dados ficam apenas em tests e no processo de teste. A configuração habitual VITE_API_BASE_URL continua apontando exclusivamente à API do projeto.

Para testar a aplicação com G-PR-04, executar o binário atualizado de Back e configurar sua origem CORS/porta correspondente. O processo habitual em localhost:5080 ainda tem o contrato antigo (array e somente Location exposto); usar essa versão com este Front gera erro de contrato, sem compatibilidade falsa ou fallback. A validação separada em 5083 usou bin/IgdbValidation e foi encerrada, preservando a instância habitual.

Descoberta de jogos reais exige configuração IGDB exclusiva do processo Back. Não foram lidas/copiadadas credenciais, adquirido token live ou realizadas chamadas externas nesta entrega. Smoke live é G-PR-06; jornada real de quarta fase é G-PR-07. npm run test:e2e mantém o cenário histórico da terceira fase com game-* e precisa da adaptação planejada na G-US-17 para jogos descobertos, não representa validação do catálogo IGDB nesta PR.
