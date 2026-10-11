# Contratos provisórios

Estes tipos descrevem somente a necessidade dos clientes mockados. Não são DTOs definitivos da API REST e não espelham a IGDB.

- Identificadores são strings opacas. Não converter para números nem presumir sequências.
- Datas das fixtures são strings ISO; datas de lançamento, capas, fotos e médias podem estar ausentes (`null`).
- Gêneros e plataformas são nomes para exibição. Mapeamento dos dados da IGDB pertence ao backend.
- `Rating` e `Review` são independentes. Não exigir nota para texto ou texto para nota.
- A faixa prevista da nota é 0–5; o tipo numérico não define incrementos nem substitui validação em runtime.
- `Favorite` distingue jogos e reviews. Não existe like.
- `Comment` pertence a uma review; não há comentários encadeados.
- `Notification` distingue publicação de review e comentário em review. Não define autorização nem transporte real.
- Dados públicos em `User` não incluem senha nem contrato de cadastro.

Pendentes: incrementos das estrelas, relação entre nota e texto, campos de cadastro, ordenação, visibilidade dos favoritos, comentário na própria review, paginação, autenticação e erros da API real.
