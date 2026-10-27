# @vetorthoplan/api-client

Tipos TypeScript gerados a partir dos snapshots versionados da Authentication API e da API clínica VetOrthoPlan.

## Geração

```bash
pnpm generate:api-types
```

O comando lê `docs/openapi/authentication-api.openapi.json` e `docs/openapi/clinical-api.openapi.json` e atualiza os respectivos arquivos em `src/generated/`. Não edite arquivos gerados manualmente. Para atualizar só um contrato, use `pnpm --filter @vetorthoplan/api-client generate:authentication` ou `pnpm --filter @vetorthoplan/api-client generate:clinical`.

O snapshot canônico usado para gerar os tipos clínicos é a versão **0.9.0**, consultada em **27/10/2026**, com 18 caminhos, 23 operações e 54 schemas; sua proveniência e checksum estão em `docs/openapi/clinical-api.snapshot.json`. A cópia original recebida está em `clinical-api.published-2026-10-27.openapi.json`. A versão declarada permaneceu igual, embora o contrato tenha evoluído; consulte a [revisão de 27/10](../../docs/swagger-update-review-2026-10-27.md). O export anterior à 0.9.0 permanece em `docs/openapi/openapi (1).json`, com metadados em `clinical-api.0.8.0.snapshot.json`. Os tipos gerados seguem o snapshot canônico, não definem as respostas públicas do BFF e não implementam a autenticação.

Os nomes curtos de requisições, parâmetros e respostas estão em `@vetorthoplan/api-client/clinical-contract`. Cada tipo é derivado de uma operação em `@vetorthoplan/api-client/clinical`, sem copiar os campos do schema. `ClinicalResponse<Operacao, Status>` preserva o corpo declarado para cada status. Na criação de caso, `CreateCaseHeaders`, `CreateCaseIdempotencyConflict` e `CreateCaseValidationError` representam o cabeçalho e as respostas do contrato clínico atual.

Na 0.9.0, `ReadyHealthResponse`, `CreateImageUploadHeaders`, `GetImageIngestionJobResponse` e `RetryIngestionJobResponse` representam prontidão, cabeçalho obrigatório de sessão, consulta por imagem e retry. Cancelamento/exclusão têm aliases dos parâmetros de caminho; sucesso 204 não possui corpo JSON. Os fluxos estão integrados no BFF; aceite real e pendências por tarefa estão no [plano 0.9.0](../../docs/clinical-api-0.9.0-execution-plan.md).

O contrato de 27/10 também gera aliases para protocolo TPLO, parâmetros/resposta
da tabela de rotação, finalização e consulta dos relatórios. Esses aliases
preparam a tipagem; os novos fluxos BFF/UI ainda pertencem às etapas seguintes.
A calibração aceita e preserva os novos campos do documento do plano sem
permitir sua edição pelo comando público de calibração.

A evidência geométrica de 23/10 mantém seu hash, contrato e código de backend
originais. O teste verifica a compatibilidade dos schemas de calibração com o
contrato atual, sem reatribuir os cálculos antigos a um backend novo.

Após atualizar o snapshot e regenerar os tipos, atualize os checksums em `docs/openapi/clinical-api.snapshot.json` e execute `corepack pnpm --filter @vetorthoplan/api-client verify:clinical`. A verificação confere versão, contagens, referências locais, hashes, `status_counts`, sexo obrigatório, idade com origem/referência, vínculo de job, novos estados, idempotência de sessão e operações novas. O BFF valida dados recebidos em runtime; os tipos TypeScript não fazem essa validação.

## Transporte HTTP

`ApiHttpClient` é um transporte sem estado, destinado apenas a chamadas servidor-servidor. O parâmetro genérico escolhe os paths do OpenAPI; sem ele, o cliente mantém os tipos da Authentication API. O BFF instancia `ApiHttpClient<ClinicalPaths>` a partir de `@vetorthoplan/api-client/http-client` para a API clínica. A URL base e o token Bearer, quando necessário, são sempre injetados pelo chamador; o pacote não lê cookies, não persiste tokens e não depende de React ou Next.js.

No modo remoto `jwt`, o BFF resolve a organização e obtém dela um token clínico separado; o [contrato suplementar](../../docs/organization-token-contract.md) e o [status remoto](../../docs/clinical-remote-integration-status.md) registram esse fluxo e seu aceite real pendente. O modo explícito `local`/`test` não envia token nem IDs de tenant/ator: o backend resolve ambos por configuração própria. O BFF só permite esse modo em `development`/`test`; ele não exercita AUTH-01.

Corpos JSON usam `request`; uploads `multipart/form-data` usam `requestFormData`, que preserva o `FormData` sem serialização e deixa o runtime definir corretamente o boundary do `Content-Type`.

Parâmetros de query também são derivados do OpenAPI e serializados pelo transporte. Respostas de redirecionamento nunca são seguidas automaticamente: o `ApiHttpClient` usa `redirect: "manual"` para que o BFF valide explicitamente o status e o header `Location` antes de redirecionar o navegador.

## Erros de autenticação

`normalizeAuthenticationError` preserva a categoria HTTP segura da resposta malsucedida (`400`, `401`, `403`, `409`, `429` ou `5xx`) para que o BFF possa traduzi-la conforme a ação. Para MFA, ele também preserva somente motivos documentados em uma allowlist; códigos desconhecidos e mensagens remotas continuam descartados. Essa tradução é responsabilidade do BFF: ela usa códigos públicos sem expor mensagens remotas, detalhes técnicos ou informações que permitam enumeração de contas.

`getApiErrorLogContext` retorna apenas metadados mínimos para logs do BFF (status, código, categoria e request ID da API). Ele descarta a mensagem remota e o corpo da requisição. Esse contexto é exclusivo do servidor e nunca deve ser serializado para o navegador.

## Endpoints de autenticação

`AuthenticationApiClient` concentra os endpoints consumidos pelo BFF: autenticação, perfil e avatar, segurança da conta, sessões, contas sociais e MFA/2FA. Ele recebe uma instância de `ApiHttpClient`; tokens Bearer são sempre argumentos explícitos dos métodos autenticados e nunca são lidos, armazenados ou retornados por estado interno.

Os métodos `login` e `socialLogin` preservam a resposta discriminada da Authentication API. O BFF recebe uma sessão concluída ou um desafio `mfa_required` e só grava os tokens de sessão em cookies depois da conclusão de todos os fatores.

Os métodos `register`, `forgotPassword`, `resetPassword` e `changePassword` também seguem diretamente os corpos e status do contrato gerado. O pacote não tenta validar complexidade de senha, interpretar a existência de uma conta ou administrar cookies: a validação em runtime, a resposta anti-enumeração e o descarte da sessão local pertencem ao BFF e à aplicação web.

## OAuth 2.0

`authorize` envia os parâmetros tipados do Authorization Code Flow com PKCE à
Authentication API, e `consent` registra a decisão autenticada para os scopes
solicitados. Ambos recebem somente o access token da sessão interna como
argumento explícito e deixam a resposta completa sob controle do BFF.

A fachada não expõe o endpoint `/oauth/token`. O código de autorização,
`code_verifier`, segredo do cliente e tokens OAuth da aplicação terceira devem
ser trocados diretamente entre o cliente externo e a Authentication API; eles
não atravessam nem são persistidos pelo BFF do navegador.

## Sessões

`refresh` recebe o token opaco de renovação e preserva a resposta rotacionada
do contrato. `logout` envia somente o Bearer interno exigido pela Authentication
API; o campo legado de refresh token não faz parte da requisição. A decisão de
persistir ou descartar as credenciais retornadas pertence ao BFF.

`getActiveSessions` lista os metadados das sessões do usuário autenticado, e
`revokeActiveSession` revoga uma delas pelo identificador. O pacote conserva
status e corpos para o chamador server-side, mas não administra cookies, cache,
confirmação destrutiva ou validação em runtime das respostas públicas.

## Perfil e avatar

`getCurrentUser` obtém o perfil autenticado, enquanto `updateCurrentUser` aceita
somente os campos editáveis pelo próprio usuário. A URL do avatar não pertence
ao corpo de atualização do perfil.

O upload passa por `uploadCurrentUserAvatar` como `multipart/form-data`, usando o
campo `avatar`. O contrato aceita PNG ou JPEG de até 5 MB e retorna uma URL
pré-assinada válida por sete dias, renovável por uma nova chamada a
`getCurrentUser`. A remoção por `deleteCurrentUserAvatar` é idempotente em `200`;
`404` significa que o usuário autenticado não existe mais.

As respostas, inclusive as malsucedidas, permanecem disponíveis ao BFF para que ele registre o contexto interno com `getApiErrorLogContext` e devolva ao navegador somente a tradução pública apropriada ao fluxo.
