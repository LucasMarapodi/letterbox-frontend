# TDD — S-PR-15

Branch `fix/sexta-15-limpar-busca-vazia` criada da base `8c99eff` antes de testes/código.

RED `08410ea`: 9 cenários, 8 falhas funcionais e 1 regressão aprovada, sem erros de tipos. Antes de medir chamadas extras, os cenários prontos aguardam a primeira resposta. Em página 3, dois cliques indevidos aumentaram o total de 5 para 7 consultas. Loading inicial/rascunho/erro e remoção de busca aplicada também demonstraram chamadas extras. Commit dos testes anterior ao código.

GREEN: duas guardas em clearSearch, usando apenas term/query existentes. Sem termo aplicado nem digitado, não altera estado; com apenas rascunho, limpa campo e retorna. Limpeza de busca aplicada e descarte de respostas obsoletas permanecem no fluxo existente. 53 testes focados aprovados.

Verificação final: 488 testes/72 arquivos com `--maxWorkers=2`, lint, tipos, build e diff check. A primeira execução completa teve três timeouts em testes antigos durante execução concorrente do navegador; repetida com dois workers, sem elevar timeout ou mudar configuração. Causa exata não demonstrada. E2E Chromium HTTP sintético aprovado; captura inspecionada com página 3 preservada. Interação no Front local confirma preservação do estado de erro sem API disponível; não foi declarado catálogo live. [Descrição e limites](S-PR-15.md).

Nenhuma alteração de Back, contrato/ID, abstração nova ou ação Limpar filtros. Commit de conclusão depois das verificações; sem merge/publicação remota.
