# S-PR-22 — Criar review com nota e descrição opcional

Branch `feat/sexta-22-criar-review-unificada`, base `67adaf7`. A API S-PR-21 já estava disponível no Back; esta entrega altera somente Front.

Criar review abre um único formulário na página do jogo. Se já existir review, a ação é Editar minha review. A página de detalhes da review reutiliza o mesmo formulário, somente para o autor. Nota começa sem seleção; zero precisa ser escolhido explicitamente. Estrelas permitem teclado e o campo numérico aceita a precisão da API, sem arredondar notas fracionadas existentes. Descrição é opcional, com limite de 10.000 caracteres após trim.

Criação envia um POST com rating/text; edição envia um PATCH com ambos. Não há PUT de nota seguido de publicação. O componente RatingForm foi removido; o adaptador legado continua disponível para compatibilidade, sem consumidor na interface. Cancelar não escreve. Falhas preservam rascunho; envio duplo tem trava síncrona, loading e controles desabilitados. Logout invalida respostas antigas. Conflito consulta a review própria e oferece edição sem anunciar publicação nova.

Após sucesso no jogo, informações, média, opiniões e review própria são consultadas novamente. Na página da review, a resposta confirmada atualiza o conteúdo; navegar para perfil/feed/Comunidade/favoritos consulta suas projeções. ReviewBody exibe estrelas e nota em todos esses locais e omite somente o parágrafo de descrição vazia. O resumo da Comunidade mantém o limite visual de três linhas. Reviews vazias continuam com links, comentários e favoritos disponíveis conforme suas permissões.

Review.rating é number|null: null identifica o histórico sem nota e mostra “Nota não informada (review antiga).”. A edição exige escolher uma nota. Decoder rejeita campo ausente, string e nota fora de 0–5; não inventa zero ou média. IDs e vínculos numéricos permanecem preservados. Os contratos HTTP mantêm PATCH parcial para compatibilidade, embora a UI envie nota e texto juntos.

## TDD e verificações

RED `31c2b49`: 14 falhas funcionais antes da implementação. A cobertura foi ampliada para 22 cenários de criação, edição, zero, precisão, texto vazio, legado, autoria, visitante, cancelamento, falha, conflito, envio duplo, logout, limites e listagens.

Passaram **237 casos distintos em 25 arquivos**, em três lotes pertinentes: 118 de formulários/fluxos/loading, 115 de projeções/contratos (14 cenários em comum com o primeiro lote e oito adicionais) e 18 de serviços/decoders. Os testes antigos passaram a usar o contrato unificado; a cobertura de teclado, erro e recuperação da nota foi migrada do controle removido para o formulário compartilhado. Fixtures são exclusivas dos testes. Lint, TypeScript completo, build e diff aprovados. Suíte completa, testes extensos do Back e E2E histórico de 34 endpoints não foram executados.

Um cenário Chromium sintético existente de IDs/favoritos foi adaptado e passou com `npm.cmd exec playwright test -- --config playwright.numeric-contract.config.ts`. A captura histórica regenerada por ele foi preservada na versão anterior, sem misturar evidências de outras entregas.

## API real e navegador

OpenAPI da API ativa confirmou ReviewCreateRequest com rating obrigatório e precisão double; não foi necessário reiniciar/alterar o Back nem aplicar migration. O roteiro Chromium usou Front 5173 e API 5080, com contas locais novas e sem credenciais de usuários existentes.

Na execução concluída, conta **14**, jogo **397**, review **3**: nota ausente não escreveu; zero sem texto gerou POST único e review visível no perfil e Comunidade. Favoritar e consultar no perfil preservou a nota. Dois PATCH editaram para 4.25 com texto e depois removeram o texto, preservando ID/data original e favorito. Recarga, novo login e navegação pelo aplicativo recuperaram 4.25. Consulta própria e média foram conferidas, sem review duplicada ou PUT legado. Sessão da execução concluída encerrada.

A primeira tentativa já havia criado dados na conta de teste **13**, mas o roteiro abriu uma URL com navegação completa após login e apagou a sessão em memória. O roteiro foi corrigido para navegar pelos links do aplicativo e repetido na conta 14; não houve correção de produto para esse erro do roteiro. Contas e reviews dessas verificações permanecem no banco local; nenhum dado de contas existentes foi removido. Scripts temporários foram excluídos.

Capturas conferidas em [desktop](evidence/S-PR-22-form-1280.png) e [mobile](evidence/S-PR-22-form-375.png), sem overflow horizontal. Migração/legados/transação do Back permanecem sob as evidências da S-PR-21; não foram repetidos nem alterados nesta entrega. Likes de reviews ainda dependem da US específica, sem controles novos nesta PR.

Front sem remoto configurado. Entrega local, sem publicação ou merge. Front e API habituais permanecem ativos.
