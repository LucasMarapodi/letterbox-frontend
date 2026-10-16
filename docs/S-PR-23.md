# S-PR-23 — Estrela de favorito nas listagens de reviews

Branch `feat/sexta-23-favorito-review-listagem`, base `f7745cc`. Implementa S-US-21 no Front, com os serviços e contratos existentes, sem dependências novas ou alterações no Back. Entrega local, sem remoto configurado, publicação ou merge.

Estrela vazada/preenchida nas reviews de Comunidade (recentes/ranking), feed, opiniões do jogo, reviews publicadas e favoritas do perfil. O botão fica separado dos links, oferece nome acessível e `aria-pressed`, suporta teclado e permite favoritar a própria review. Reviews sem descrição continuam presentes. Visitantes recebem convite de login, sem consultas privadas.

Dois componentes pequenos compartilham favoritos por página/sessão: um provider e o botão. Uma leitura de `/favorites` atende às estrelas e às listas do perfil, sem GET por review. O dashboard reutiliza o payload agregado. Uma trava síncrona por ID impede escrita duplicada; cópias da mesma review compartilham seleção e estado pendente. Falha de escrita preserva a seleção confirmada e informa erro. Leitura inicial mostra estado desconhecido; falha oferece retry. Logout/troca de conta invalida respostas anteriores. Após a mutação, a lista é revalidada; remover a última review favorita oculta a seção, preservando Jogos favoritos.

O controle da página de detalhe permanece. As seções de favoritos continuam fora do Início. A S-PR-22 não está implementada nesta base; esta entrega não adiciona o formulário unificado de nota/review nem muda seus DTOs.

## TDD e validação

- RED `23933e8`: 11 falhas funcionais antes da implementação, pela ausência da estrela.
- GREEN: 623 testes em 81 arquivos aprovados, sem erros de tipos; lint, TypeScript, build e `git diff --check` aprovados.
- 63 testes focados aprovados: todas as listagens, reutilização de leitura, falhas/retry, concorrência por ID, sincronização, privacidade, troca de sessão e regressões de login.
- A primeira suíte completa identificou expectativas antigas de contagem de consultas e remontagem indevida do login durante autenticação. As expectativas refletem a leitura compartilhada necessária às estrelas; a chave do provider visitante permanece estável, preservando formulário e erro de login. A suíte final passou após essas correções.
- Um cenário Chromium aprovado com HTTP/CORS sintético: leitura compartilhada, Space/Enter, seleção, remoção da última favorita e preservação da navegação. Capturas de [Comunidade](evidence/S-PR-23-community-stars.png) e [perfil](evidence/S-PR-23-profile-last-removed.png) inspecionadas. Sem escrita em dados reais ou validação com IGDB live.

Para repetir o cenário, com portas 5091/5175 livres:

```sh
npm exec playwright test -- --config playwright.review-list-favorites.config.ts
```
