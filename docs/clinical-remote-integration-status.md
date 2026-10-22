# Tarefa 10 — conexão remota e token clínico

Verificação pública em **21/10/2026**. **Atualização:** contrato da troca recebido e integração JWT implementada. A configuração ativa agora aponta à API remota; o aceite autenticado e storage continuam pendentes da jornada final.

## Resultado observado

Base oficial: `https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com`.

| Verificação | Resultado |
| --- | --- |
| `GET /health/live` | 200, `status: ok` |
| `GET /health/ready` | 200, `status: ready`, `database: ok` |
| `GET /health/authentication_api` | 200 |
| OpenAPI clínico `/openapi.json` | Igual ao export do API Gateway já preservado; 0.9.0, com Bearer nas operações clínicas. |
| OpenAPI de autenticação `/docs/authentication_api/json` | Login, MFA e lista de organizações documentados. A troca de token informada pelo time não está listada. |
| `POST /authentication_api/api/v1/auth/organizations/00000000-0000-4000-8000-000000000001/token`, sem credenciais, corpo `{}` | 404. Sonda com UUID sintético, sem login ou emissão de token. Isoladamente, esse status não comprova ausência da rota: pode haver comportamento de proxy/autorização. Confirmar caminho, implantação e contrato. |

O readiness atual comprova a verificação do banco publicada pelo backend; não publica teste de storage, CORS ou worker. HTTP 200 não valida essas dependências nem a troca de token.

Fontes: [contrato clínico](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/openapi.json), [contrato de autenticação](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/docs/authentication_api/json) e explicação fornecida pela equipe na conversa.

O [novo snapshot de autenticação](./openapi/authentication-api.published-2026-10-21.openapi.json) tem 118.266 bytes e SHA-256 `354a80edfabe18edb3950d4451bbf648c0423ffb08156b95b9629d6adca6512c`. Versão 1.0.0, commit documentado `83af3aa`, build documentado `14/09/2026 20:37:17`. As operações e `components` são idênticos ao snapshot canônico; a descrição do build mudou. Não houve necessidade de regenerar os tipos existentes.

## Fluxo conectado no código

1. Navegador chama o BFF de login/MFA da mesma origem, como já ocorre.
2. BFF autentica na Authentication API e mantém access/refresh tokens nos cookies cifrados HttpOnly existentes.
3. Com sessão resolvida e organização ativa definida, BFF solicita o token da organização usando o access token de autenticação.
4. BFF chama `/api/v1/...` com o token clínico recebido. O token geral de login não é usado como substituto.
5. Binários e prévias continuam usando os destinos temporários de storage devolvidos pela API. Nenhum token Bearer de autenticação ou clínico acompanha essas chamadas.

Não será copiado para o navegador o exemplo que acessa tokens em JavaScript. Ele descreve o protocolo upstream; nosso BFF já oferece o limite apropriado para essa troca.

## Resposta recebida do backend

**Endpoint informado:** `POST /authentication_api/api/v1/auth/organizations/{orgId}/token`.

- Sem corpo; path `orgId` string de 1 a 255 caracteres.
- 200 com `accessToken`, `refreshToken`, `organizationId`, `expiresIn`. Access token destinado a `vetorthoplan-api`; refresh vinculado à organização.
- Erros 400/401/403/404/429 com envelope próprio da Authentication API.
- `orgId` vem de `GET /authentication_api/api/v1/organizations`. Uma ativa pode ser escolhida automaticamente; com várias é necessária escolha explícita.
- Não existe organização ativa padrão ou endpoint que a escolha automaticamente.

O [contrato suplementar e as decisões da integração](./organization-token-contract.md) preservam a resposta. Publicação no OpenAPI e implantação efetiva seguem como verificação operacional; a sonda histórica sem credenciais não substitui teste autenticado. Não foram solicitadas credenciais, senhas ou tokens pessoais.

## Configuração e trabalho entregue

- `AUTHENTICATION_API_BASE_URL` deve receber somente a origem, sem `/authentication_api/api/v1/auth`; o cliente existente já inclui o caminho. O `.env` ativo já aponta à origem correta.
- `.env.example` e as duas variáveis clínicas do `.env` ativo atualizados: origem oficial e `CLINICAL_API_IDENTITY_MODE=jwt`. Demais valores/segredos preservados. Reiniciar o frontend após a alteração. Login/MFA existentes foram preservados.
- Integração feita nas rotas clínicas pelo wrapper comum do BFF. Modo local explícito permanece disponível somente em development/test; JWT exige HTTPS e token clínico emitido.
- Contexto e seleção em `/api/cases/context` (POST/PUT), com checagem de associação, cookies cifrados e mensagens pt-BR/en. Nenhum token estático, tenant/ator do formulário ou Bearer no navegador/storage.
- Cache clínico limitado a 15 minutos/validade recebida, vinculado à organização, usuário, papel e sessão. Nova troca na expiração; refresh de organização não substitui o geral. Cliques/requisições concorrentes compartilham somente a troca em andamento do mesmo contexto, sem cache global persistente de tokens.
- Escopos separados de QueryClient e cabeçalho de expectativa impedem reaproveitar dados entre organizações/abas. Logout limpa os cookies clínicos. 401/403 não repetem a operação clínica.
- Criado diagnóstico público repetível:

```powershell
corepack pnpm --filter web check:clinical-remote
```

O comando faz cinco GETs sem credenciais, não lê `.env`, não efetua login e não cria dados. Emite somente status e presença das operações, sem corpos brutos/URLs assinadas. Código de saída 0 significa verificações públicas aprovadas; 2 indica pendência; 1 indica erro de execução/configuração. **Nunca declara o fluxo autenticado ou storage como verificados.**

Execução real em `2026-10-21T17:44:42.860Z`: três health checks válidos, contratos acessíveis, pendência `ORGANIZATION_TOKEN_UNDOCUMENTED`; saída 2 esperada. O pnpm mostra uma mensagem de comando sem sucesso por esse código de diagnóstico, não por falha do aplicativo.

Repetição em `2026-10-21T21:49:30.110Z`: mesmo resultado público, com os três health checks em 200. O diagnóstico continua apontando a ausência no **OpenAPI**, embora o contrato suplementar já permita a implementação.

**Verificação automatizada:** 235/235 testes web, typecheck web/api-client, verificação do contrato clínico e build passaram. Incluídos 18 cenários novos com HTTP simulado, cookies/rotas reais do Next, escolha, renovação, revogação, isolamento, expiração, rotação de chave, origem e 401/403 sem repetição de mutação. O build usou `APP_ORIGIN=https://localhost:3000` somente no processo; avisos de cache do webpack não impediram sua conclusão. A limitação de lint TS/TSX da tarefa 11 permanece.

## Continuação da tarefa e teste final

A implementação e a configuração estão prontas para conferir login/MFA → organização → listagem com sessão válida no teste final. Nesta retomada não houve login com conta real, emissão real de token ou leitura/escrita de dados clínicos; health checks não comprovam esse fluxo.

Com arquivos sintéticos, obter as origens reais de upload/prévia e configurar `UPLOAD_STORAGE_ORIGINS`/`PREVIEW_STORAGE_ORIGINS` quando aplicável, sem wildcard ou assinatura inteira. Conferir CORS para a origem exata do frontend, prévias HTTPS, assinatura, confirmação, worker até estado terminal e renovação da prévia. Health checks não substituem essa jornada. Esses destinos não foram adivinhados nem liberados na CSP.

Reservar também login normal/MFA, sessão expirada, usuário sem organização, escolha quando houver várias, associação removida e acesso cruzado entre tenants. Nenhuma conta ou dado clínico real foi usado nesta entrega.
