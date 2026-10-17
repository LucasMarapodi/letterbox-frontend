# Comunidade — prévia de comentários

Branch `feat/comunidade-previa-comentarios`, sobre `6d1742a` (remoção do aviso de catálogo da Comunidade), sem merge ou alteração de Back.

Em Mais comentadas, cada review com comentários carrega a consulta pública existente e mostra até dois itens, na ordem da API, com avatar, autor e texto. Os textos longos ficam limitados visualmente a três linhas. A prévia tem divisor e fundo próprio, sem esconder a review. Não foram adicionadas consultas de comentários em Recentes, Feed ou outras listas.

Quando houver mais de dois comentários, Ver mais abre `/reviews/{reviewId}#comentario-{id}` no primeiro comentário não exibido, aproveitando o destaque e o foco já existentes. Não existe rota separada de detalhe de comentário. Com um ou dois itens, não há Ver mais desnecessário; lista vazia não cria conteúdo artificial. Falha oferece retry local, sem ocultar a review; retorno após sair da aba é ignorado.

Sem endpoint ou contrato novo. A consulta atual retorna a lista completa; o Front limita a prévia a dois itens, sem alegar paginação HTTP. Nenhuma escrita ou alteração de nota/curtida/favorito foi adicionada.

## Verificação

- RED `f511fe5`: cinco falhas funcionais antes do código, com o caso vazio já correto.
- 46 testes pertinentes em seis arquivos aprovados: limite/ordem, link e foco no terceiro comentário, listas curtas/vazias, falha/retry e resposta após desmontagem, além das regressões de Comunidade e ausência do aviso.
- Dois Chromium 1280/390 px aprovados: prévia dentro do card, sem overflow, aviso ausente e navegação por Enter até o comentário correto.
- Lint, tipos/build e diff-check aprovados. Sem suíte completa ou testes pesados de Back. Navegador com HTTP sintético, sem nova comprovação de persistência.

```powershell
npm.cmd run test:e2e -- --config playwright.comment-preview.config.ts
```

- [Desktop](evidence/community-comment-preview-desktop.png)
- [Mobile](evidence/community-comment-preview-mobile.png)

O aviso anterior foi removido em `6d1742a`, na branch `fix/comunidade-sem-aviso-catalogo`, após RED `8de7650`. Remoção em Recentes, Mais comentadas, Jogos em discussão e Feed. As falhas de consulta continuam oferecendo retry; avisos do catálogo/detalhes não foram alterados. Nessa etapa, 29 testes pertinentes, lint e build passaram. Entregas locais, sem publicação ou merge.
