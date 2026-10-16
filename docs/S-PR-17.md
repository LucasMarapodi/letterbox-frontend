# S-PR-17 — Formulário Completar perfil

Branch `feat/sexta-17-completar-perfil-formulario`, base `ca21b6d`. A referência antiga da branch não tinha commits exclusivos e foi atualizada antes do desenvolvimento. Entrega somente no Front, consumindo a API S-PR-16 existente.

O próprio perfil consulta GET privado `/api/v1/users/me/profile-completion`. Loading e falha têm região e retry independentes; somente uma resposta válida e incompleta mostra **Completar perfil**. Visitantes e outros usuários não consultam esse endpoint nem recebem o formulário. A edição comum permanece disponível.

O formulário abre na mesma página com país, estado/província/região, descrição em `bio`, avatarUrl opcional com prévia e todos os jogos favoritos atuais. Campos têm trim e limites 100/100/2000; avatar aceita HTTP/HTTPS até 2048 caracteres e vazio envia null. O catálogo HTTP fornece busca e paginação de jogos. Seleção por ID impede duplicação, permite mais de três e mostra contador/remoção. Cancelar não salva; validação por campo, trava síncrona e loading protegem o PUT. Falha mantém o rascunho, inclusive `storage_unavailable`.

Após salvar, a resposta confirmada atualiza conclusão, bio/avatar da sessão e perfil, e força a atualização dos favoritos compartilhados. Essa atualização invalida uma leitura anterior pendente para não restaurar a lista antiga. O botão só desaparece com confirmação de conclusão; avatar não participa da regra. Edição comum de bio reconsulta a conclusão. Retornar ao perfil após remover um favorito também consulta novamente. País e estado permanecem no DTO privado, sem alterar User público.

## TDD e validação

- RED `c9fe6a3`: dez falhas funcionais do formulário antes do código; dois cenários de privacidade já passavam.
- RED `67eb02b`: favorito pendente anterior impedia a atualização após salvar. Corrigido com invalidação da leitura anterior em `load(true)` do provider existente.
- Final: **115 testes em nove arquivos aprovados**, incluindo 16 novos e regressões de perfil, favoritos, mutações e adaptadores. Lint, TypeScript completo, build e diff sem erros. A suíte completa e os E2Es extensos não foram executados.
- A primeira regressão encontrou três testes antigos de edição com resposta genérica incompatível com o endpoint novo; a fixture daquele arquivo agora responde ao GET de conclusão. A checagem TypeScript também apontou opções inválidas nos testes e a união de estados do componente; corrigidas antes da validação final.

## Integração real

A instância antiga da API não tinha o endpoint; o executável deste workspace foi recompilado e reiniciado em localhost:5080, sem mudança no código do Back ou migration. Build do Back sem avisos/erros e OpenAPI confirmaram a dependência disponível.

Chromium com Front em 127.0.0.1:5173 e API real: foi criada a conta local de teste **12**, sem usar credenciais existentes. O fluxo buscou jogos reais do catálogo, selecionou três, salvou sem avatar e confirmou GET completo. Após recarga e novo login (a sessão do Front é em memória), o estado permaneceu completo. Remover um favorito dessa conta pela API e retornar ao perfil fez o botão reaparecer. GET público não expôs país/estado. A sessão do teste foi encerrada; a conta permanece com dois favoritos para conferência. Não foram removidos usuários ou dados de contas existentes.

Capturas verificadas em [desktop](evidence/S-PR-17-form-1280.png), [mobile](evidence/S-PR-17-form-375.png) e [revalidação](evidence/S-PR-17-revalidated.png), sem overflow. Não foi repetido o teste de reinício da API após a gravação; essa persistência já tem evidência na entrega Back S-PR-16. Os scripts temporários foram removidos; Front e API locais permanecem ativos.

Sem dependências novas, upload, wizard, rota nova, armazenamento de negócio no runtime ou alterações no backend. Front sem remoto configurado; sem publicação ou merge.
