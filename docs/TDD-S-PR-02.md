# TDD — S-PR-02

Base `7600443`; branch `feat/sexta-02-loading-consultas` criada antes das alterações.

RED `b04c087`: 17 casos falharam pela ausência de regiões busy/status, exposição de vazio durante refresh e falta de retry na consulta de review própria. Testes commitados antes do código.

GREEN parcial: regiões de consulta reutilizam Feedback, limpam a apresentação de resultados anteriores e mantêm guardas contra respostas obsoletas. A consulta de review própria diferencia erro de resultado ausente.

Segundo RED `273e970`: cobertura complementada com feed, troca de alvo, desmontagem e opiniões. Resultado: 20 passaram e 1 falhou porque a média do jogo anterior continuava visível. Commit de testes anterior à correção de reset das opiniões.

GREEN/REFACTOR: reset de opiniões na mudança de consulta; componentes Feedback compartilham QueryRegion. Média, reviews, controles de escrita e catálogo/dashboard permanecem com estados independentes.

Validação completa: 443 testes/68 arquivos, lint, tipos e build. E2E Chromium adicional aprovado com servidor HTTP sintético e captura do loading; primeira falha do harness por duplicata StrictMode corrigida no próprio servidor de teste, sem contar como RED funcional. Ver [auditoria e limites](S-PR-02.md).

Contratos preservados; critério global de IDs inteiros pendente da migração própria. Backend não alterado. Commit final somente após verificações; sem merge/publicação remota.
