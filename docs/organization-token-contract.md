# Troca de token por organização — contrato suplementar

Fonte: confirmação da implementação fornecida pela equipe de backend ao frontend em **21/10/2026**. A operação continua ausente do OpenAPI público consultado; este registro não é apresentado como export oficial.

## HTTP

`POST /authentication_api/api/v1/auth/organizations/{orgId}/token`

- `Authorization: Bearer <accessToken geral>`.
- Sem corpo; não enviar `{}` ou inventar parâmetros de audiência/escopo.
- `orgId`: string de 1 a 255 caracteres, obtida do `id` de `GET /authentication_api/api/v1/organizations`. Não pressupor UUID.
- 200: `{ accessToken, refreshToken, organizationId, expiresIn }`.
- O access token é emitido para `vetorthoplan-api`; o refresh token é vinculado à organização.
- Erros: 400 de parâmetro, 401 de credencial, 403 de associação, 404 de organização ausente/inativa e 429 de limite. Envelope: `statusCode`, `error`, `code`, `message`.

Tipos locais: [organization-token-contract.ts](../packages/api-client/src/organization-token-contract.ts). A extensão cobre somente a rota faltante e reaproveita a lista de organizações dos tipos gerados. Não alterar o snapshot nem os tipos gerados para fingir publicação upstream.

## Decisões do frontend

- Apenas uma organização **ativa**: selecionar automaticamente. Várias: pedir escolha; nenhuma: informar ausência de acesso. Nunca selecionar silenciosamente a primeira dentre várias.
- Troca feita exclusivamente pelo BFF, após a resolução da sessão geral (incluindo a renovação existente).
- Validar `organizationId` retornado contra o escolhido. O backend permanece responsável pela assinatura JWT, emissor, audiência e autorização clínica.
- Guardar somente o access token clínico em cookie cifrado HttpOnly, com duração limitada ao menor valor entre `expiresIn` e 15 minutos. Antecipar renovação em 15 segundos. Vincular o cache a usuário, organização, papel atual, sessão geral e origens configuradas.
- Renovar o acesso clínico por **nova troca com o token geral válido**. O refresh token de organização retornado é descartado; não sobrescreve o refresh token geral nem é enviado ao endpoint de refresh geral. Isso mantém os contextos separados sem presumir um contrato de renovação clínica não detalhado.
- Conferir associação/atividade a cada requisição clínica. Mudança de papel/sessão invalida a reutilização do token. Logout apaga os cookies clínicos.
- 401/403 da clínica limpa o access token clínico; não repetir automaticamente a operação clínica, principalmente POST/PUT/DELETE.
- O navegador só recebe nomes/IDs/papéis das organizações autorizadas. Nenhum token é devolvido no JSON, colocado em storage do navegador ou enviado ao object storage.

## Rotas BFF e contexto

- `POST /api/cases/context`, sem corpo: resolver contexto e, quando possível, preparar acesso clínico. Estados: `ready`, `selection_required`, `no_organizations`.
- `PUT /api/cases/context`, JSON `{ organizationId }`: conferir lista atual, emitir acesso e persistir a seleção. Mutações validam origem, tipo e tamanho de corpo.
- As chamadas clínicas recebem `X-Clinical-Organization` como **expectativa de contexto**, comparada com a escolha validada pelo BFF. Esse cabeçalho não concede acesso e não é repassado como tenant ao backend. Divergência retorna 409 `CLINICAL_CONTEXT_CHANGED` antes de chamar a clínica.
- O acesso às telas de casos é preparado antes da montagem dos formulários/consultas. Cada organização ganha um QueryClient próprio; sair/trocar cancela leituras e descarta o cache. Respostas tardias da organização anterior não alimentam o novo contexto.
- A troca de organização fica disponível na listagem, onde não há upload/formulário ativo. Divergência entre abas interrompe as consultas e pede atualização do acesso.

## Aceite pendente no ambiente real

Testar login normal/MFA, uma/várias/nenhuma organização, perda de associação, mudança de papel, expiração/renovação, logout e tentativas cruzadas entre tenants. Os testes automatizados usam contas/tokens sintéticos e HTTP simulado; não comprovam a implantação da rota, configuração JWT do servidor, CORS ou worker.
