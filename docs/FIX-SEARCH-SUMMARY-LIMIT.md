# Limite do resumo nos resultados da pesquisa

Resultados de jogos mostram no máximo 240 caracteres de resumo, incluindo os três pontos finais quando o texto ultrapassa o limite. Textos curtos permanecem completos e resumo vazio mantém “Resumo não informado.”. O recorte é somente de apresentação na pesquisa; a página do jogo e o conteúdo recebido da API não foram alterados.

Branch `fix/search-summary-limit`, base `bef3e0c`. RED `a157b69` confirmou duas falhas nos textos acima do limite antes da implementação; casos de 239/240 caracteres já passavam. Os 15 testes de pesquisa passaram, incluindo 241/1000 caracteres e resumo vazio. Lint, TypeScript, build e diff aprovados. Sem suíte completa, testes pesados, alteração de backend ou merge.
