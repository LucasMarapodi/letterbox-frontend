# S-PR-02 — Loading nas consultas

Branch `feat/sexta-02-loading-consultas`, base `7600443`. Ajuste específico pronto para revisão local. Sem merge; Front não tem remoto configurado. Backend não alterado.

Consultas pendentes agora identificam a região ocupada com `aria-busy` e mensagem `role=status`, reutilizando Feedback. Uma nova consulta oculta lista/vazio anteriores até sucesso ou erro. Guardas de descarte existentes impedem respostas obsoletas de atualizar a interface. O carregamento é restrito aos dados consultados: catálogo e dashboard são independentes; atualizar reviews não oculta a média; atualizar dados do jogo preserva os controles de publicação/nota.

Consultar a review própria agora distingue erro de ausência: falha oferece retry e não libera o formulário como se nenhuma review existisse. Notificações continuam exclusivamente no sino/modal, preservando foco e Escape.

## Auditoria

| Área | Região/consulta e tratamento |
| --- | --- |
| Início/catálogo | Jogos: loading inicial, busca, ordenação, página e retry; lista/vazio somente após sucesso. |
| Jogo | Informações do jogo; opiniões; atualização isolada de Reviews do jogo. Nota, favorito e consulta da review própria têm regiões independentes. |
| Review/comentários | Conteúdo da review e Comentários: pendência, erro/retry e ausência/vazio após resposta válida. |
| Perfil | Informações e reviews do perfil; editor preservado durante refresh. Conexões, relação pessoal e favoritos têm loading próprio. |
| Dashboard/feed | Agregado Seu dashboard e atualização de Feed de reviews; catálogo continua independente. |
| Comunidade | Reviews recentes, mais comentadas e jogos em discussão; mudança de período e retry substituem resultado antigo por loading. |
| Notificações | Dados de notificações no modal: loading, erro/retry e vazio; sem página adicional. |

As consultas mantêm cleanup por flag ativa e, nos serviços privados, invalidação de sessão existente. Não foi introduzido cache de resultado antigo nem fallback de negócio no runtime.

## Evidências e limites

- TDD: `b04c087`, 17 falhas funcionais antes do código; `273e970`, novo RED de troca de opiniões (1 falha/20 aprovados). Ambos commits de teste precedem a respectiva correção. [Registro TDD](TDD-S-PR-02.md).
- `npm.cmd run check`: 443 testes em 68 arquivos, lint, TypeScript e build aprovados.
- `npm.cmd exec playwright test -- --config playwright.loading.config.ts`: 1 E2E aprovado no Chromium, com HTTP/CORS reais contra servidor sintético exclusivo do teste. Cobre loading inicial, vazio, nova busca sem vazio antigo, erro e retry até sucesso. [Captura inspecionada](evidence/S-PR-02-catalog-loading.png). Não comprova IGDB live; não usa o backend habitual.
- `tests/query-loading.test.tsx`: 17 consultas com resposta controlada verificam busy/status e conclusão; mais 4 cenários cobrem troca de opiniões, descarte/desmontagem de comentários, refresh isolado de reviews e retry da review própria. A suíte anterior mantém cobertura de filtros/períodos, erros, sessão e navegação.

A primeira execução E2E detectou uma falha no servidor do teste: uma resposta duplicada do StrictMode podia chegar depois da liberação do lote. O servidor agora mantém a resposta da etapa para atender duplicatas tardias; nenhuma espera fixa ou alteração no runtime foi usada para mascarar o caso.

O requisito genérico de IDs inteiros da quinta fase permanece pendente, como em S-PR-01: a base Front/API usa IDs opacos string. Esta alteração preserva contratos tipados e não converte IDs silenciosamente. Migração de contratos/banco está fora deste ajuste de loading e da autorização para alterar somente Front.
