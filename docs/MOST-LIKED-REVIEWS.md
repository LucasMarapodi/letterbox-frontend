# Comunidade — Reviews mais curtidas

A aba Mais curtidas consulta GET /api/v1/community/reviews/most-liked e apresenta ReviewResponse completo, com autor, jogo/capa, título, texto, nota, total de curtidas, curtidas no período e última curtida elegível. O contrato está na PR #33 do backend, integrada à main. Paginação vem da API; período e tamanho reiniciam a página. Leitura pública sem Bearer, cancelamento de respostas tardias, loading, vazio e retry preservados.

O ranking existente continua em uma seção identificada como Comentários curtidos, consumindo seu próprio endpoint. A aba de reviews não consulta o ranking de comentários.

O teste novo reproduziu a ausência da aba antes do código. Validação direcionada final: 34 testes aprovados para reviews, comentários e feed; lint e build/tipos aprovados; dois cenários Chromium de 1280/390 px aprovados com HTTP sintético. A suíte completa também foi executada; a expectativa antiga de feed visível para visitante foi corrigida para respeitar a PR #58 e revalidada no conjunto direcionado. Nenhum código de produção do feed foi alterado.

Sem pacotes novos ou alterações de dados. As verificações de SQL/HTTP do ranking pertencem ao backend; o teste sintético do navegador valida o consumidor.
