# Handoff frontend — VetOrthoPlan

Referências visuais sincronizadas com o contrato OpenAPI `0.7.0`:

- [Criar caso](./criar-caso-v1.png)
- [Listar e consultar casos](./casos-listagem-detalhe-v2.png)
- [Criar sessão e enviar radiografia](./upload-radiografia-v1.png)
- [Confirmar upload](./confirmacao-upload-v1.png)
- [Processar e consultar imagem](./processamento-imagem-v1.png)

O cliente TypeScript é gerado a partir de `docs/openapi/vetorthoplan-backend.openapi.json`. O BFF clínico, a lista/detalhe de casos, o polling de imagens e o viewer com calibração, medições e simulação TPLO estão implementados em `apps/web/src/features/clinical`. A identidade continua local no backend até o fechamento do AUTH-01.
