# S-PR-33 — Modal único Editar perfil

Branch `feat/sexta-33-modal-editar-perfil`, base `3ee18b0`. Dependência Back S-PR-32 concluída em `f0086ce`; contrato conferido no código, relatório e OpenAPI da API local 5089. Esta entrega altera somente Front.

O dono encontra Editar perfil à direita do nome, tanto com perfil completo quanto incompleto. Os formulários expandidos e a sincronização entre dois editores foram removidos; ProfileCompletion deixou de ter consumidor e foi excluído. O modal único reúne nome, país/estado, descrição, avatar opcional com prévia e jogos favoritos. Visitantes e outros usuários não veem a edição nem consultam localização privada.

País e estado são selects na mesma linha, sem seleção automática. Os labels persistidos são Brasil → São Paulo/Rio de Janeiro/Minas Gerais; Estados Unidos → Califórnia/Nova York; China → Taiwan/Hubei. A definição está centralizada em models/profileLocations.ts, sem novos IDs ou serviço externo. Mudar país limpa estado no rascunho; limpar país envia ambos como null. Valores legados são identificados, preservados quando não editados e não oferecidos como opção válida para outra seleção.

Favoritos existentes são recuperados da consulta compartilhada, com capa/nome, sem GET por jogo. Nenhum truncamento para três/cinco: três é o mínimo para conclusão; cinco é somente o limite das sugestões. Busca usa trim, três caracteres, debounce 300 ms e GET /search com mode=suggestions/scope=games. Requisições anteriores são canceladas/ignoradas, erro tem retry e capa reutiliza GameCover com fallback. Clique ou setas/Enter adicionam ao rascunho, sem navegação, escrita imediata ou submissão acidental; duplicatas ficam selecionadas.

Salvar envia somente os campos alterados em um PATCH /users/me/profile, com trava síncrona e loading, incluindo favoriteGameIds quando o conjunto muda. O decoder valida usuário e completion na mesma resposta, IDs inteiros, contagem/conclusão coerentes e bio/avatar consistentes. Não há PUT de conclusão ou escritas separadas de favoritos no fluxo novo. O adaptador legado permanece disponível para compatibilidade, sem formulário próprio.

Em sucesso, sessão e cabeçalho recebem o usuário confirmado, favoritos compartilhados são revalidados, modal fecha e mostra feedback. Reabertura consulta os dados persistidos/conclusão. Salvar incompleto é permitido, sem exigir localização, descrição, avatar ou três favoritos; o progresso informa o que falta. Falhas mantêm rascunho e oferecem nova tentativa; 401 limpa sessão, storage_unavailable recebe mensagem específica. Cancelar, X e Escape descartam; fechamento e envio concorrente são impedidos durante a escrita.

Modal usa portal e padrões já existentes no projeto, título acessível, foco inicial no nome, Tab restrito, fundo inert, bloqueio de rolagem e retorno de foco ao botão. Conteúdo rola dentro do modal em mobile. Nenhuma biblioteca ou framework novo.

## TDD e verificações

RED `3a23c34`: 11 falhas funcionais, com dois testes de privacidade já passando, antes do código. A cobertura do modal foi ampliada para 16 cenários. Testes antigos de edição foram adaptados ao modal; expectativas de conclusão obrigatória e edição expandida foram substituídas pelas regras da S-US-28. Validações privadas do resumo/IDs continuam em profile-completion.test.tsx, incluindo omissão, duplicatas, coerência e legado.

Passaram **156 testes distintos em 13 arquivos** de modal/conclusão, perfil, favoritos, mutações, busca, decoders, adaptadores e isolamento de sessão. Lint, TypeScript completo, build e diff aprovados. Suíte completa e testes extensos do Back não foram executados.

## API real e Chromium

Front **http://127.0.0.1:5175/** e API **http://localhost:5089** já estavam ativos e expõem S-PR-32. A API habitual 5080/processos existentes foram preservados; nenhum reinício, compilação ou migration do Back foi necessário nesta entrega.

Fluxo Chromium com PostgreSQL/API reais, sem mock de respostas: contas locais novas **18/19**, seis favoritos existentes preservados ao salvar somente nome em perfil incompleto, troca Brasil/São Paulo → China com estado limpo, sugestões com capa/nome e até cinco resultados, seleção por setas/Enter sem escrita, cancelamento descartando os campos/jogos, PATCH único com localização/bio/remoção de favorito, conclusão com cinco jogos, logout/novo login recuperando os dados. No roteiro, uma sétima seleção foi adicionada ao rascunho e descartada ao cancelar; não houve favorito persistido extra. Duas escritas do modal por execução, sem PUT legado. A segunda execução confirmou também o carregamento das capas e regenerou as capturas com o topo do modal visível.

Foco inicial, ciclo Tab, Escape/retorno ao botão, selects na mesma linha em 375 px e ausência de overflow horizontal conferidos. [Desktop 1280](evidence/S-PR-33-modal-1280.png) e [mobile 375](evidence/S-PR-33-modal-375.png) inspecionados. Campos opcionais e vínculos de favoritos das contas de teste foram limpos ao final; contas permanecem com seus nomes de teste, sessões encerradas. Nenhum dado de outros usuários foi removido. Scripts temporários excluídos.

Sem alterações no código do Back, dependências ou schema. Front sem remoto configurado: entrega local, sem publicação ou merge. Evidências históricas da S-US-16/S-PR-17 permanecem preservadas.

Correção posterior do feedback: sucesso passou a ser popup fixo em portal, fora da linha do nome/botão, removido automaticamente após quatro segundos. RED d32ab67 reproduziu o deslocamento. 25 testes de edição, lint/tipos/build aprovados.
