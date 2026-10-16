# S-PR-34 — Paginação das listas do perfil

Branch `feat/sexta-34-paginacao-perfil`, base `ec2961b`. Entrega exclusiva do Front, sobre as coleções completas dos contratos atuais.

Cinco páginas locais independentes: três jogos favoritos, duas reviews publicadas, duas reviews favoritas, seis seguidores e seis pessoas seguindo. O controle abaixo de cada lista mostra Anterior, Página N de M e Próxima, com botões nas extremidades e desabilitados nos limites. Zero e limite exato não mostram controles; reviews favoritas vazias continuam ocultas. Ordem da API e páginas parciais são preservadas.

Um hook pequeno recorta com slice e ajusta apenas páginas inválidas para a última disponível. As coleções armazenadas não são truncadas, e o modal continua recebendo todos os favoritos. Revalidação de conexões passou a usar uma revisão de consulta, preservando as páginas válidas, em vez de remontar as duas listas. Perfil/sessão diferentes reiniciam os estados pelo mecanismo de keys existente.

Alternar página não consulta novamente perfil/reviews/favoritos/conexões, não usa overlay global nem chama scrollTo. As ações das reviews mantêm o comportamento existente, incluindo a leitura pessoal de curtida quando uma review ainda não consultada fica visível. Não é paginação SQL nem contrato novo da API.

Conforme pedido adicional, removidos os textos Entrar para favoritar, inclusive nas estrelas das listagens, e Entrar para criar review. Favoritos são oferecidos somente a autenticados; o botão Criar review do visitante abre o login diretamente, sem convite intermediário nem escrita. Curtidas mantêm seu fluxo independente.

## TDD e verificações

RED `2cd8247`: seis falhas antes do código, com dois cenários de zero/limite já passando. A cobertura de paginação foi ampliada para dez cenários: cinco limites, independência, ordem, extremos/parcial, remoção com ajuste, coleção completa no modal, revalidação independente de conexões, troca de perfil/sessão e privacidade. RED `3e1829c` registrou a mudança dos convites antes de sua implementação.

Passaram **103 testes distintos em 12 arquivos**: lote de 95 de paginação, modal, perfil, favoritos, publicação e seguir; mais oito de conexões/fluxo HTTP. Lint, TypeScript completo, build e diff aprovados. Suíte completa e testes do Back não executados.

Chromium em **1280 e 375 px**, Front local 5173 com respostas HTTP sintéticas: cinco listas independentes, navegação por Enter, rolagem preservada na troca de jogos, ausência de novas consultas das coleções, remoção da última review favorita da última página ajustando somente sua lista e layout sem overflow. Nenhuma conta ou escrita no banco real. Scripts temporários removidos. [Desktop](evidence/S-PR-34-profile-1280.png) e [mobile](evidence/S-PR-34-profile-375.png) inspecionados.

Sem alterações de backend, dependências, migrations ou permissões. Front sem remoto configurado; entrega local, sem publicação ou merge. Front/API habituais continuam ativos, com Vite aplicando as mudanças na porta 5173.
