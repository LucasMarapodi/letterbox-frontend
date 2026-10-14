# S-PR-01 — Início após logout

Branch feat/sexta-01-logout-inicio, base 79e8c0a de Front. Implementação específica pronta para revisão local; sem merge/remoto. Backend não alterado, incluindo mudanças alheias existentes no seu working tree.

## Comportamento entregue

Sair limpa a sessão local e navega imediatamente para / com replace, inclusive em perfil, review ou Comunidade. A revogação HTTP continua em andamento, sem bloquear a navegação. Em falha de rede, o aviso existente de revogação não confirmada aparece no Início e a sessão permanece encerrada. A resposta desse logout não executa navegação, portanto não pode redirecionar sobre login/navegação posteriores.

A implementação permanece em App.tsx, usando signOut existente e useNavigate. SessionProvider, invalidação de requests, autorização e contratos da API foram preservados. Voltar no histórico não recupera a entrada substituída nem dados privados; respostas antigas são ignoradas e novos requests públicos não enviam o token anterior.

## TDD e validação

RED 2b8227d: cinco falhas de navegação esperadas; dois cenários de logout antigo após novo login já aprovados. Testes commitados antes do código. A verificação completa também identificou dois argumentos de tipos indevidos nos novos seletores, corrigidos sem casts/supressões; não foram usados como evidência de RED funcional.

GREEN: 422 testes, lint, tipos e build. Router real com transporte HTTP controlado cobre três rotas, rejeição de rede na revogação pendente, replace/Voltar, resposta privada tardia abortada, ausência de Bearer antigo e sucesso/erro tardio sem afetar a nova sessão. Três regressões anteriores foram adaptadas para reabrir a review como visitante após retornar à Home; cobertura de comentário público/favorito privado preservada.

Navegador com API local existente, sem mock: conta fictícia de desenvolvimento entrou, abriu /perfil/user-1 e Sair voltou a / como visitante, sem editor/perfil/sino na navbar. [Captura da Home após logout](evidence/S-PR-01-logout-home.png). Erro de rede, outras rotas, concorrência e histórico foram verificados em testes controlados; não declarar esses cenários como observação live.

## Pendência do checklist

O checklist genérico da PR exige IDs inteiros da quinta fase, mas a base Front e a API de teste ainda usam IDs opacos/string. O comportamento desta US não depende de migrar IDs e seu escopo é exclusivamente logout. Não foram introduzidos GUID/UUID, conversões de IDs ou mudanças de contrato. O critério global de IDs inteiros permanece não verificado/pendente de uma migração própria; não é declarado cumprido por esta entrega.

Publicação remota não realizada: Front não tem remoto configurado. Revisão local contém somente redirecionamento, testes relacionados e documentação/evidência.
