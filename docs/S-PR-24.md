# S-PR-24 — Ícone de favorito à direita do nome do jogo

Front na branch `feat/sexta-24-favorito-jogo-nome`, sobre `6e11512` (S-PR-37), sem merge. Nenhum código, contrato ou dado do Back foi alterado.

Nome à esquerda e estrela no extremo direito do seu container, alinhada à primeira linha, no catálogo, detalhe, jogos favoritos do próprio perfil e Jogos em discussão. Grid simples reserva espaço para o botão de 44 × 44 px; nomes longos quebram sem sobreposição. A estrela é sempre visível, preenchida quando salva, com tooltip, nome específico, aria-pressed e foco visível. O botão antigo do detalhe foi removido. Referências a jogos dentro de reviews continuam apenas links, sem controles duplicados.

O provider existente compartilha um único GET `/api/v1/favorites` por página/sessão entre jogos e reviews. PUT/DELETE usam o ID local numérico, sem body e sem GET por alvo. Travas distinguem jogo e review com o mesmo ID, sincronizam cartões repetidos e revalidam as listas após as escritas. Falhas preservam a seleção confirmada; loading não inventa estado; erros permitem nova tentativa. Respostas de uma sessão encerrada não contaminam a próxima. Visitante usa a estrela para abrir login, sem chamadas privadas nem texto adicional na página.

Remover o terceiro jogo favorito é permitido. A lista do perfil atualiza, e abrir Editar perfil consulta novamente a conclusão, com os dois jogos restantes. Favoritar não navega, não publica review e não altera nota. O link do nome continua independente. A Home conserva somente o catálogo, sem seções de favoritos ou feed.

## Verificação

- RED funcional: `87f675b`, 12 falhas antes da implementação.
- RED de geometria: `ca5c20f`, falhas reais de alinhamento horizontal em Chromium antes do CSS; medições de retângulos e primeira linha, sem usar classes como prova visual.
- 110 testes pertinentes aprovados em 13 arquivos: estados, payloads, retry, clique duplo, instâncias repetidas, IDs iguais entre tipos, troca de sessão e perfil/conclusão, além de regressões de catálogo, Comunidade e favoritos de reviews. Testes antigos foram adaptados aos nomes específicos dos botões e ao único GET compartilhado das estrelas da Home.
- Dois cenários Chromium (1280/390 px) cobrem os quatro contextos com nome longo e palavra sem espaços, medem alinhamento/área de toque/overflow e acionam a estrela com Enter/Espaço, preservando a navegação do nome.
- Lint, TypeScript, build e diff-check aprovados. Sem suíte completa ou testes de Back.

```powershell
npm.cmd run test:e2e -- --config playwright.game-favorite.config.ts
```

O navegador usa o Front real na porta 5185 com HTTP interceptado pelo teste. Isso verifica o consumidor; não é uma nova comprovação de persistência PostgreSQL. A dependência de migration de títulos da S-PR-37 continua documentada separadamente e não foi alterada por esta entrega.

Entrega pronta localmente, sem publicação ou merge. Remoto do Front conferido; base é a S-PR-37 ainda local.

## Capturas

| Contexto | Desktop | Mobile |
| --- | --- | --- |
| Catálogo | [Captura](evidence/S-PR-24-desktop-catalogo.png) | [Captura](evidence/S-PR-24-mobile-catalogo.png) |
| Detalhe | [Captura](evidence/S-PR-24-desktop-detalhe.png) | [Captura](evidence/S-PR-24-mobile-detalhe.png) |
| Perfil | [Captura](evidence/S-PR-24-desktop-perfil.png) | [Captura](evidence/S-PR-24-mobile-perfil.png) |
| Discussão | [Captura](evidence/S-PR-24-desktop-discussao.png) | [Captura](evidence/S-PR-24-mobile-discussao.png) |
