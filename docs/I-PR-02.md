# Cliente HTTP, DTOs e composição de adaptadores

Status: READY_LOCAL. Repositório: Front. Branch: feat/integracao-pr-02-http. Base local: c0de574. Dependência: I-PR-01 de Back existente, consultada sem alterações no backend. Sem merge.

O frontend dispõe de transporte fetch comum e portas HTTP tipadas para os 34 endpoints funcionais. URL, query e IDs são codificados por segmento; JSON e Bearer são enviados por operação; 204 não tenta ler JSON. Falhas de rede, HTTP, contrato e cancelamento são distintas e não usam fallback.

DTOs reconstruídos de unknown preservam null/zero, decimais, datas, wrappers e notificações discriminadas. Os adaptadores compartilham base URL e sessão em memória, limitam campos dos requests e descartam respostas privadas de sessões anteriores. 401 atual revoga a sessão; login inválido não invalida outra sessão. Logout limpa o store mesmo quando a revogação falha.

A entrega prepara a infraestrutura, conforme I-US-03 a I-US-05. As telas permanecem nos serviços anteriores até ativação por suas US de fluxo; login/me, contexto de logout, atualização de consultas e validação com API real não foram antecipados. `HTTP-INTEGRATION.md` documenta composição e limites.

Validação: 306 testes, lint, TypeScript estrito e build. Commits RED: 1b39be5 (transporte), 94daebb (DTOs), 3230f3d (adaptadores), 7d0b65e (lacunas de 401/horário). Evidências em TDD-I-PR-02.md. Nenhuma chamada de negócio ou CORS foi observada no navegador nesta PR; matriz permanece PLANEJADO para consumo de interface.

Limitação de IDs: dot-segments isolados . e .. são rejeitados pelo cliente para evitar normalização da URL; a API não os gera. Eventual suporte requer convenção adicional de backend. Os demais IDs são tratados como opacos, inclusive percentuais literais.

Front não possui remoto configurado. Esta descrição prepara a PR local; publicação depende de remoto/base de destino definidos. Nenhuma PR remota criada.
