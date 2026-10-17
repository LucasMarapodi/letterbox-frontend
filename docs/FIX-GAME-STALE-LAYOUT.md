# Layout do jogo com aviso de catálogo desatualizado

Branch `fix/game-stale-notice-layout`, base `9711a68`. O link da review preservava o ID correto. O problema visual surgia quando a resposta do catálogo trazia stale: CatalogNotice era filho da grade de três colunas, ocupando a largura inteira, enquanto a capa tinha linha fixa. O posicionamento automático colocava título/descrição na coluna estreita da capa e deslocava ações/reviews.

O aviso agora é irmão anterior à grade, mantendo a mensagem, data e Consultar novamente. Capa, informações, ações e discussão conservam seu layout com ou sem aviso. Mudança de quatro linhas no componente, sem alteração de CSS, roteamento, backend, contrato ou dados.

TDD: RED `1d28804` confirmou a falha visual em Chromium antes da implementação. A fixture foi ajustada antes desse commit para expor headers e manter stale durante ambas as leituras de desenvolvimento do StrictMode; as primeiras tentativas sem aviso não foram tratadas como evidência funcional do defeito.

Validação: **seis cenários Chromium** (entrada pela review e pelo Início, em 1280/768/375 px), **30 testes pertinentes em quatro arquivos**, lint, TypeScript, build e diff aprovados. Os cenários verificam aviso acima do conteúdo, capa/informações lado a lado, ausência de overflow e retry de stale para fresh sem mudar a largura/posição horizontal das informações. HTTP sintético, sem escrita na API real ou contas criadas. Suíte completa e testes do Back não executados.

Capturas inspecionadas: [desktop](evidence/FIX-game-stale-1280.png), [tablet](evidence/FIX-game-stale-768.png) e [mobile](evidence/FIX-game-stale-375.png). Reprodução permanente: `npm.cmd exec playwright test -- --config playwright.game-layout.config.ts`; reutiliza Vite local 5173 ou o inicia nessa porta e intercepta as respostas HTTP somente no teste.

Sem dependências novas, publicação ou merge. Vite já ativo aplica a correção em http://127.0.0.1:5173/jogos/13.
