# TDD — PR-04

Branch feat/pr-04-avaliacoes-reviews-comentarios, derivada de 6deabcd, sem merge.

## US-15
RED: 10 falhas esperadas e 107 testes verdes, commit 8764620. GREEN: 117 testes, lint, tipos e build aprovados. Notas independentes de texto; opções inteiras provisórias, serviço aceita números finitos na faixa.

## US-16
RED: 7 falhas esperadas e 118 testes verdes, commit 719971c. GREEN: 125 testes, lint, tipos e build aprovados. Publicação, unicidade por usuário/jogo e preservação do texto. Opiniões públicas compartilham o estado do serviço de escrita.

## US-17
RED: 4 falhas esperadas e 125 testes verdes, commit a2460aa. GREEN: 129 testes, lint, tipos e build aprovados. Leitura pública com autor/jogo/data, IDs opacos, inexistência, carregamento e recuperação de erro.

## US-18
RED: 5 falhas esperadas e 131 testes verdes, commit 09ba8e3. GREEN: 136 testes, lint, tipos e build aprovados. Formulário compartilhado por publicação e edição; autoria no serviço, ID/quantidade/data de criação preservados, falha mantém rascunho. Matcher de valor corrigido durante GREEN.

## US-19
RED: 4 falhas esperadas e 136 testes verdes, commit 1fbdaf7. GREEN: 140 testes, lint, tipos e build aprovados. Lista pública plana por review com autor/texto/data, vazio e recuperação de erro.

## US-20
RED: 7 falhas esperadas e 140 testes verdes, commit 3a2831b. GREEN: 147 testes, lint, tipos e build aprovados. Publicação de comentários em review alheia, validação, falha preserva texto, bloqueio síncrono de duplo envio e logout remove formulário. Comentar a própria review permanece pendente; nenhum fluxo de publicação própria foi antecipado.

## US-15 — integração com média pública
RED: 1 falha esperada e 147 testes verdes, commit 6ced071. GREEN: 148 testes, lint, tipos e build aprovados. Sucesso na nota recarrega opiniões; falha de envio é verificada e mantém a escolha.
