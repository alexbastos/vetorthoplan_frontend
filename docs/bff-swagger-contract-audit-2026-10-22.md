# Auditoria do contrato BFF — Swagger publicado em 22/10/2026

O fluxo principal está alinhado ao contrato publicado. Foram encontrados **dois defeitos reproduzidos no mapeamento de erros de autenticação**, uma inconsistência de tipagem interna e premissas que o Swagger não fecha. Esta revisão não aprova o funcionamento autenticado em produção.

## Fontes e método

- [Swagger clínico](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/docs): a página configura o Swagger UI para carregar `/openapi.json`.
- [OpenAPI clínico publicado](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/openapi.json), preservado em [snapshot da auditoria](./openapi/clinical-api.audit-2026-10-22.openapi.json).
- [OpenAPI de autenticação publicado](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/docs/authentication_api/json), preservado em [snapshot da auditoria](./openapi/authentication-api.audit-2026-10-22.openapi.json). Consultado também porque login, organizações e configurações pertencem a esse serviço.
- [Comparação estrutural e hashes](./openapi/bff-contract-comparison.audit-2026-10-22.json). Compara `paths`, `components` e segurança global com os contratos canônicos; exclui anotações descritivas, preservando nomes de propriedades de domínio.
- [Reprodução do mapeador real de erros](./openapi/bff-error-mapping.audit-2026-10-22.json). Respostas sintéticas, sem credenciais nem chamadas autenticadas remotas.

A inspeção cobriu os 40 handlers em 36 arquivos de rota do BFF e os adapters/clientes correspondentes. Foram comparados métodos, caminhos, parâmetros, corpos, cabeçalhos, respostas de sucesso, erros e validações de leitura. A existência de um handler não significa que sua operação remota foi executada. As APIs administrativas e funcionalidades não expostas pelo produto não foram tratadas como integrações faltantes.

## Diferenças entre os contratos versionados e os publicados

| Serviço | Resultado |
| --- | --- |
| Clínica 0.9.0 | 17 operações e 38 schemas. Nenhuma mudança em payloads, parâmetros ou respostas. O publicado acrescenta Bearer nas 15 operações clínicas e seu security scheme; o BFF JWT já atende a exigência. O arquivo é idêntico ao export de gateway preservado em 21/10. |
| Autenticação 1.0.0 | 65 operações, contra 64 no canônico. A única adição estrutural é `POST /authentication_api/api/v1/auth/organizations/{orgId}/token`. As operações existentes mantêm os mesmos contratos. O build informa branch `vet_auth_01`, commit `8755814`, data `22/10/2026 11:19:20`. |
| Token da organização | A publicação oficial confirma o suplemento implementado: Bearer geral, POST sem corpo, `orgId` no path e resposta com `accessToken`, `refreshToken`, `organizationId`, `expiresIn`. Os tipos gerados ainda usam o snapshot anterior; o tipo suplementar cobre a operação corretamente. |

O snapshot canônico e os tipos gerados foram preservados nesta auditoria. Promover o novo contrato e regenerar os tipos é uma atualização de proveniência; não é necessário para corrigir as chamadas já cobertas pelo suplemento.

## Achados confirmados

### P2 — Login social transforma recusas 401/403 em 503

O Swagger documenta 401 e 403 em `POST /authentication_api/api/v1/auth/login/social`. No [mapeador do BFF](../apps/web/src/lib/server/auth-bff-route.ts:292), as traduções específicas desses estados só atendem à ação `login`; `social-login` trata especificamente apenas 400.

Reprodução com o mapeador real:

| Ação | Resposta upstream sintética | Resposta BFF observada |
| --- | --- | --- |
| `social-login` | 401, `INVALID_TOKEN` | 503, `AUTHENTICATION_REQUEST_FAILED`, `retryable: false` |
| `social-login` | 403, `USER_INACTIVE` | 503, `AUTHENTICATION_REQUEST_FAILED`, `retryable: false` |
| `login`, controle | 401 | 401, `INVALID_CREDENTIALS` |
| `login`, controle | 403 | 403, `ACCOUNT_REQUIRES_ACTION` |

Os códigos usados nas duas primeiras fixtures são exemplos; o Swagger permite string no campo `code`. A incompatibilidade reproduzida é o tratamento dos status documentados, independentemente do código específico.

**Impacto:** uma recusa de acesso/token social aparece como falha genérica de serviço, dificultando a orientação ao usuário e o diagnóstico.

**Correção recomendada:** mapear 401/403 para erros públicos próprios de login social/estado da conta, preservando os status e sem expor mensagens upstream. Cobrir ambos os status e códigos não reconhecidos em testes do mapeador.

### P2 — Conflito de MFA já ativado transforma 409 em 503

O Swagger declara explicitamente `409 MFA_ALREADY_ENABLED` em `/auth/mfa/setup` e `/auth/mfa/verify-setup`. O normalizador reconhece 409 como conflito, mas a [tradução pública](../apps/web/src/lib/server/auth-bff-route.ts:308) só trata conflito na ação `register`. `MFA_ALREADY_ENABLED` também não está na lista de razões preservadas pelo normalizador.

Reprodução: tanto `mfa-setup` quanto `mfa-verify-setup`, ao receberem 409 com esse código, devolvem 503 com `AUTHENTICATION_REQUEST_FAILED`, `retryable: false`.

**Impacto:** configuração concorrente em outra aba ou uma segunda tentativa com MFA já ativo perde a informação de conflito. O usuário recebe uma mensagem genérica em vez de atualizar o estado de MFA.

**Correção recomendada:** incluir uma razão/código público limitado para o estado já habilitado, preservar o 409 e reconciliar o status consultando a operação de MFA existente. Cobrir setup e verify-setup.

### P3 — Tipagem de sucesso de senha e revogação de sessão

O [cliente de configurações](../apps/web/src/features/settings/services/settings-bff-client.ts:34) declara `request<undefined>` para alteração de senha e revogação de sessão. Os handlers retornam JSON `{ success: true }` por `createSuccessResponse()`, em vez de corpo ausente.

**Impacto:** o TypeScript informa `undefined` para um valor que, em execução, é objeto. Os consumidores atuais verificam `ok`, portanto não foi encontrado defeito de interface decorrente disso.

**Correção recomendada:** tipar o retorno real no cliente, mantendo a adaptação atual do BFF, ou padronizar deliberadamente o corpo/status de sucesso em ambos os lados.

## Premissas a fechar

- **Conta inativa:** `/users/me` documenta 200 com `status: ACTIVE | INACTIVE`. O [resolvedor de sessão](../apps/web/src/lib/server/session.ts:357) aceita ambos e considera a sessão autenticada após um perfil válido. Confirmar se desativar conta revoga os tokens e faz `/users/me` retornar 401. Se um perfil inativo continuar sendo retornado com 200, o BFF não bloqueia esse estado por conta própria. Não houve reprodução autenticada de uma conta desativada; isto não foi classificado como bypass confirmado.
- **OAuth:** o BFF exige `error: consent_required` no 403, `client_id` correspondente e escopos compatíveis. O Swagger não especifica esse valor de `error` nem declara o cabeçalho `Location` da resposta 302. Documentar essas invariantes; não flexibilizar as verificações do BFF para aceitar dados arbitrários.
- **Peso na leitura clínica:** o schema de resposta permite string/null, mas o BFF aplica o domínio decimal documentado pelo frontend. Não foi encontrado payload real válido do domínio rejeitado. Formalizar o formato decimal no Swagger reduz a ambiguidade sem retirar validações.
- **415 em produção:** o Swagger upstream não descreve o trajeto navegador → proxy → BFF. O ajuste local anterior aceita JSON apenas quando o corpo é vazio. A origem da alteração do cabeçalho e a publicação efetiva desse ajuste precisam ser conferidas na infraestrutura/produção.

## Cobertura alinhada

| Área | Verificação |
| --- | --- |
| Casos e imagens | As 13 operações clínicas integradas usam os métodos/caminhos corretos; criação, listagem, detalhe, sessões de upload, confirmação, cancelamento, leitura/exclusão de imagem, prévia, descoberta/leitura de job e retry. Headers de idempotência, estados e nullabilidade conferidos. |
| Identidade clínica | Lista de organizações, seleção ativa, troca sem corpo, token clínico separado do geral e validação de contexto no BFF. |
| Autenticação | Cadastro, login normal/social, verificação de email, recuperação, MFA, refresh/logout e sessão; `challengeToken` local é traduzido para `mfaToken` upstream. Achados de erro descritos acima. |
| Configurações | Perfil, atualização, senha, avatar multipart, sessões/revogação, histórico, contas sociais e setup/status/verificação de MFA. Requests e respostas de sucesso alinhados. |
| Rotas de leitura via POST | POST local em perfil/sessão/contexto é uma adaptação intencional: pode renovar cookies ou emitir token antes de consultar upstream. Não precisa copiar o método GET upstream. |

Planos GET/PUT continuam fora da integração clínica entregue. Desativação de MFA e regeneração dos códigos existem no cliente de API, mas não têm fluxo nas configurações; histórico usa a primeira página padrão e não tem consumidor de interface identificado. Estes são limites de cobertura, não divergências das chamadas implementadas.

## Validação executada e limites

- Download público dos dois contratos e do HTML do Swagger; comparação estrutural e preservação de hashes/snapshots.
- Reprodução sintética dos quatro erros acima usando o mapeador real, com controles de login normal.
- `verify:clinical`: passou, incluindo proveniência, hashes e 99 referências locais resolvidas.
- Typecheck do pacote `@vetorthoplan/api-client`: passou.
- A suíte web de 242 testes e o typecheck web haviam passado na etapa imediatamente anterior, após a correção dos POSTs vazios. Não foram reexecutados como prova de cobertura dos novos achados; os cenários reproduzidos mostram lacunas nessa cobertura.
- Nenhuma conta foi criada, nenhum token real foi usado e nenhuma operação clínica autenticada, upload ou mudança em produção foi executada nesta auditoria. Os dois defeitos de erro foram registrados para correção; não foram alterados no runtime por esta revisão.
