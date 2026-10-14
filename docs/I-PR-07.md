# I-PR-07 — Runtime HTTP e entrega final

Branch feat/integracao-pr-07-entrega, base e270e33. READY_LOCAL: I-US-22–24 concluídas, relatório consolidado dos 34 funcionais e health/OpenAPI em [RELATORIO-ENDPOINTS.md](RELATORIO-ENDPOINTS.md). Sem merge e sem remoto configurado.

## Executar a validação

Requer Node 24, .NET 10 e o binário existente Back/src/Tcc.Api/bin/Release/net10.0/Tcc.Api.dll. O E2E não compila nem modifica Back. Caso o binário não exista ou esteja desatualizado, preparar Back separadamente antes de executar.

```sh
npm ci
npx playwright install chromium
npm run check
npm run test:e2e
```

O runner inicia Vite em 5174 e sua própria API em 5081, a partir do binário Release existente. Ambas as portas devem estar livres. Origens CORS são passadas ao processo por ambiente; não há proxy. Dados das duas contas são efêmeros. Readiness usa health; OpenAPI fornece a comparação de 34 operações. A API desta suíte é encerrada/reiniciada e finalizada pelo próprio teste. A instância habitual de desenvolvimento não é parada.

## Evidências e limites

[Chamadas observadas](evidence/I-PR-07-calls.json): source=browser significa resposta em ação real de UI; infrastructure identifica health/OpenAPI; permissions identifica verificações diretas de autorização. Estas categorias não são intercambiáveis. Todas as 34 operações funcionais tiveram sucesso observado por browser. Cadastro duplicado 409 e sessão revogada 401 também foram observados pela UI. 403 de autoria e duplicidade 409 de review foram verificados diretamente na API real, pois os controles correspondentes ficam corretamente ocultos na UI.

[Notificações reais](evidence/I-PR-07-notifications.png) e [catálogo após recuperação](evidence/I-PR-07-public.png). A suíte não intercepta API. Para resposta pendente, CDP adiciona latência de rede e o logout aborta a consulta real. Nova busca com host desligado mostra erro sem fallback; reinício recupera dados públicos e rejeita token anterior. Escrita/leitura e ausência de estado pessoal da outra conta são verificadas.

401 testes unitários/regressão, lint, tipos e build aprovados; E2E real aprovado. A fonte produtiva e o bundle não importam mocks, doubles ou FoundationPreview. Doubles preservados em tests; regras de negócio autoritativas permanecem nas suítes existentes de Back.

Limites da fase: backend em memória, token simulado e catálogo IGDB fake de Back. Sessão do navegador permanece apenas em memória. SQL, JWT de produção e IGDB externa não foram introduzidos. Resultados internos de falha do Playwright não são distribuídos; somente chamadas redigidas e screenshots explícitas sem credenciais são versionadas.

## Revisão final

Retirada de mocks evita dados locais em falhas de API; os doubles preservam regressões isoladas fora de src. E2E real verifica as 34 operações por método/rota, duas contas e isolamento. Relatório distingue contratos, status observados e provas de UI/infraestrutura/permissões; nenhum funcional fica pendente. Limitações de memória/token simulado/IGDB fake e ausência de remoto são explícitas. Não houve alteração de Back, merge ou publicação remota.
