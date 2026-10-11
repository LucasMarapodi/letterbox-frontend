# Contratos provisórios

Estes tipos descrevem somente a necessidade dos clientes mockados. Não são DTOs definitivos da API REST e não espelham a IGDB.

- Identificadores são strings opacas. Não converter para números nem presumir sequências.
- Links codificam o ID com `encodeURIComponent` uma única vez. Nas rotas atuais, `useOpaqueRouteId` lê o último segmento do pathname original e decodifica uma única vez, preservando a distinção entre `game/42` e o texto literal `game%2F42`. Não usar o valor de `useParams` diretamente para consultas por ID: o roteador pode converter `%2F` literal em `/`. O hook considera barra final opcional; deve ser adaptado se o ID deixar de ser o último segmento da rota.
- Datas das fixtures são strings ISO; datas de lançamento, capas, fotos e médias podem estar ausentes (`null`).
- Gêneros e plataformas são nomes para exibição. Mapeamento dos dados da IGDB pertence ao backend.
- `Rating` e `Review` são independentes. Não exigir nota para texto ou texto para nota.
- A faixa prevista da nota é 0–5; o tipo numérico não define incrementos nem substitui validação em runtime.
- `Favorite` distingue jogos e reviews. Não existe like.
- `Comment` pertence a uma review; não há comentários encadeados.
- `Notification` distingue publicação de review e comentário em review. Não define autorização nem transporte real.
- Dados públicos em `User` não incluem senha nem contrato de cadastro.

Pendentes: incrementos das estrelas, relação entre nota e texto, campos de cadastro, ordenação, visibilidade dos favoritos, comentário na própria review, paginação, autenticação e erros da API real.

## Serviços de leitura

`GameService.list(): Promise<Game[]>` e `getById(id): Promise<Game | null>` são a fronteira desta fase. Um ID inexistente retorna `null`. A opção `error` do factory mock permite simular rejeição das leituras. Não há latência artificial nem persistência após reload.

`src/services/index.ts` centraliza a seleção. `createServices({ games: outraImplementacao })` permite fornecer outro adaptador com o mesmo contrato. Nenhuma tela importa fixtures ou factories mockados, regra verificada pelo lint. As operações de escrita e os demais serviços serão ampliados apenas nas US correspondentes.

Cada factory clona as entradas e cada leitura retorna uma cópia independente, inclusive listas de gêneros e plataformas. Os jogos padrão são fictícios; a modelagem desta fase não exigiu dúvidas sobre campos da IGDB nem consulta a dados externos.

## Busca provisória — PR-02

`GameService.list(query?: GameQuery)` recebe `term` opcional. O mock procura trecho do nome sem diferenciar maiúsculas e ignora espaços nas extremidades; termo vazio restaura todos os jogos. A Home envia o termo ao submeter o formulário (Enter ou botão), sem debounce nem rede real. Essas escolhas são provisórias e não constituem regras da API definitiva.

`GameQuery.sort` permite somente `name-asc` e `name-desc`, opções provisórias dos mocks. A comparação usa locale pt-BR. Sem sort o serviço conserva a ordem da fixture; a Home escolhe nome crescente inicialmente. Alterar a ordem mantém o termo da busca submetida; limpar o termo mantém a ordem escolhida. O componente não ordena dados nem filtra jogos.
