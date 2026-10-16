# Correções de feedback do perfil e ações da review

O sucesso do perfil era um terceiro item na linha flex do nome e de Editar perfil, deslocando o botão até recarregar a página. A branch `fix/sexta-33-feedback-perfil` corrigiu isso em `234a941`, após RED `d32ab67`: mensagem em portal fora do cabeçalho, posição fixa, role=status e remoção automática após quatro segundos, sem roubar foco ou bloquear cliques. 25 testes de edição, lint, tipos e build aprovados.

A branch seguinte `fix/review-action-layout` inclui essa correção, sem merge. Nos detalhes da review, curtir, favoritar e editar estavam em blocos separados com margens e tamanhos distintos. Agora compartilham uma barra acessível antes dos comentários, com altura/espaçamento consistentes e quebra natural no mobile. Ao editar, o formulário ocupa uma linha inteira. As listagens continuam usando ReviewBody com curtida por padrão; o detalhe posiciona essa mesma ação na barra, sem duplicá-la. Regras de autoria, favoritos e curtidas permanecem sob os testes existentes.

RED `284a0fc` confirmou ausência do grupo de ações antes do código. Validação final: **71 testes em cinco arquivos**, cobrindo curtidas, edição/leitura/formulário de reviews e modal do perfil; lint, TypeScript e build aprovados. Suíte completa e testes do Back não foram executados.

Chromium em 1280/375 px, com respostas HTTP sintéticas e Front local 5173: posição do botão Editar perfil igual antes/depois do PATCH, popup fixo fora do cabeçalho, três ações da review na barra, botões alinhados e com alturas iguais no desktop, quebra sem overflow no mobile, abertura/cancelamento do formulário. Nenhuma escrita na API real ou conta criada nessa conferência. Quatro capturas inspecionadas:

- [Perfil desktop](evidence/FIX-profile-toast-1280.png)
- [Perfil mobile](evidence/FIX-profile-toast-375.png)
- [Review desktop](evidence/FIX-review-actions-1280.png)
- [Review mobile](evidence/FIX-review-actions-375.png)

Sem dependências novas, alteração de backend, publicação ou merge. Front e API existentes permanecem ativos; Vite aplica as correções na porta 5173.
