# @capta/api-client

Tipos TypeScript gerados a partir do snapshot versionado da Authentication API.

## Geração

```bash
pnpm generate:api-types
```

O comando lê exclusivamente `docs/openapi/authentication-api.openapi.json` e atualiza `src/generated/authentication-api.ts`. Não edite o arquivo gerado manualmente.

## Transporte HTTP

`ApiHttpClient` é um transporte sem estado, destinado apenas a chamadas servidor-servidor. A URL base e o token Bearer, quando necessário, são sempre injetados pelo chamador; o pacote não lê cookies, não persiste tokens e não depende de React ou Next.js.

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
