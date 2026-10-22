# Nova origem oficial da API clínica

**Consulta atualizada:** a [auditoria de 22/10/2026](./bff-swagger-contract-audit-2026-10-22.md) confirma que o export clínico segue idêntico a este e que a troca de token por organização passou a constar no Swagger de autenticação. Este documento preserva a comparação histórica de 21/10.

Consulta em **21/10/2026**, somente leitura:

- Base do BFF: `https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com`.
- [Swagger](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/docs).
- [OpenAPI](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/openapi.json), preservado [neste snapshot](./openapi/clinical-api.gateway-2026-10-21.openapi.json).

Export preservado: 39.809 bytes, SHA-256 `a1e2e615368fd55e95dd3dc51dab6a36cecb01a248514120b2128514437f4fde`. A identificação do commit implantado não foi informada no OpenAPI.

## Diferenças verificadas

Comparação estrutural com o snapshot canônico 0.9.0 de 20/10/2026:

- A versão continua **0.9.0**; 14 paths, 17 operações e 38 schemas.
- Nenhum schema de payload foi adicionado, removido ou alterado.
- As 15 operações clínicas passaram a declarar `security: [{HTTPBearer: []}]`; as duas operações de saúde permanecem públicas.
- Novo `components.securitySchemes.HTTPBearer` (`type: http`, `scheme: bearer`). A descrição geral agora menciona JWT da `authentication_api` e isolamento por tenant.
- Fora de `security`, nenhuma propriedade das operações mudou. O endpoint de exclusão mantém 204, 404 e 409 e os mesmos bloqueios.

## Consequência para o frontend

**Atualização posterior:** a tarefa 10 integrou JWT e organização após receber o [contrato suplementar da troca](./organization-token-contract.md). O parágrafo abaixo preserva a situação no momento da primeira comparação; veja o [estado atual da conexão](./clinical-remote-integration-status.md).

A tarefa 8 usa os payloads existentes e pode ser implementada com o contrato canônico atual. Sua origem/proveniência histórica foi preservada; este novo export não substitui silenciosamente os tipos gerados.

O adapter clínico atual aceita somente `CLINICAL_API_IDENTITY_MODE=local` em desenvolvimento/teste e não envia Bearer. Portanto, **não foi trocado o ambiente local ativo automaticamente**. A nova origem está registrada no exemplo de ambiente e no plano. Conectar o ambiente publicado depende de adaptar o BFF ao JWT (tarefa 13/AUTH-01), confirmar emissor/audiência/tenant e validar o fluxo em conjunto com a tarefa 10. A declaração OpenAPI não comprova a configuração efetiva do servidor.

Nenhuma criação, exclusão, chamada clínica autenticada, transferência de arquivo ou consulta de dados de pacientes foi executada nessa verificação. Disponibilidade de storage, CORS e worker continuam pendentes do teste integrado.
