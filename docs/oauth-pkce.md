# OAuth 2.0 Authorization Code com PKCE

Este documento define a fronteira de segurança do fluxo OAuth implementado no
frontend Orthovet. O contrato versionado da Authentication API continua sendo a
fonte de verdade para os endpoints públicos do provedor.

Em 10/09/2026, o documento local foi comparado semanticamente com o
[`/docs/authentication_api/json`](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/docs/authentication_api/json)
oficial e não apresentou divergências. O snapshot corresponde ao build
`master@c92d040`, OpenAPI 3.1.0, versão 1.0.0 da API.

## Componentes e responsabilidades

| Componente | Responsabilidades | Não deve fazer |
| --- | --- | --- |
| Cliente externo | Registrar `client_id` e `redirect_uri`; gerar `state`, `nonce`, `code_verifier` e `code_challenge`; usar `S256`; iniciar a autorização; validar o `state` devolvido; trocar o código em `/oauth/token`; armazenar seus próprios tokens com segurança. | Enviar `code_verifier` ao BFF Orthovet; aceitar `state` diferente; reutilizar código ou verifier; tratar o BFF como cofre de tokens da aplicação. |
| Navegador Orthovet | Navegar entre autorização, login, MFA e consentimento; enviar ao BFF somente a decisão de consentimento e o ID opaco da transação. | Escolher scopes na aprovação; ler tokens ou o conteúdo da transação; decidir destinos de redirect. |
| BFF Orthovet | Validar forma, tamanho e unicidade dos parâmetros; resolver a sessão; preservar a solicitação em cookie cifrado; chamar `/oauth/authorize` e `/oauth/consent` com o token de sessão; interpretar respostas sem seguir `302`; validar `Location` e `state`; renderizar e processar consentimento; encerrar a transação. | Trocar o authorization code por tokens do cliente externo; seguir o `Location`; buscar a `redirect_uri`; confiar em scopes ou destinos reenviados pelo navegador. |
| Authentication API | Validar de forma autoritativa o cliente, redirect, scopes e consentimento; autenticar o token de sessão; emitir e vincular o authorization code; executar `/oauth/token` e `/oauth/userinfo` conforme o contrato. | Delegar decisões autoritativas de cadastro do cliente ao frontend. |

`POST /api/oauth/consent` é um endpoint privado do BFF, não um endpoint novo da
Authentication API. Ele recebe o formulário same-origin e delega a concessão ao
`POST /oauth/consent` oficial. Os endpoints `/oauth/token` e `/oauth/userinfo`
permanecem fora desse BFF e são consumidos pelo cliente externo.

## Fluxo

1. O cliente externo cria uma solicitação Authorization Code com PKCE `S256` e
   navega para `GET /oauth/authorize` da Orthovet.
2. O BFF valida a solicitação e grava por até dez minutos uma transação AES-256-GCM
   em cookie `HttpOnly`, `SameSite=Lax` e de alta prioridade.
3. O BFF resolve ou renova a sessão. Login por senha ou Google e o desafio MFA
   recebem somente o ID opaco para retomar a autorização.
4. Autenticado, o BFF chama o `GET /oauth/authorize` oficial sem seguir redirects.
5. Um `302` validado termina no redirect original. Um `401` reinicia a autenticação.
   Um `403 consent_required` validado avança a transação para consentimento.
6. A transação de consentimento é vinculada ao ID imutável da conta confirmada
   pela API. A tela exibe o `client_id`, essa conta server-side e somente os
   scopes da solicitação original.
7. Na aprovação, o BFF envia esses scopes ao `POST /oauth/consent` oficial e
   reexecuta a autorização. Na recusa, produz `access_denied` com o `state` original.
8. O cliente externo valida `state` e troca o código diretamente em `/oauth/token`.

## Configuração server-side

| Variável | Regra |
| --- | --- |
| `AUTHENTICATION_API_BASE_URL` | Origem canônica HTTPS, sem caminho, query, fragmento ou credenciais. |
| `APP_ORIGIN` | Origem canônica HTTPS. HTTP é aceito somente para `localhost`, `127.0.0.1` ou `[::1]` fora de produção. |
| `OAUTH_TRANSACTION_SECRET` | Exatamente 32 bytes aleatórios codificados em base64url sem padding (43 caracteres). É runtime-only e não pode usar `NEXT_PUBLIC_` nem ser enviado como build argument. |
| `SESSION_COOKIE_SECRET` | Chave runtime-only de 32 bytes para cifrar a sessão Orthovet usada durante o fluxo. Deve ser diferente do segredo de transação. |
| `SESSION_COOKIE_PREVIOUS_SECRET` | Chave anterior opcional, aceita somente durante uma rotação controlada dos cookies de sessão. |

Gere um segredo por ambiente com:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

A rotação do segredo invalida as transações em andamento, cujo prazo máximo é
dez minutos. Em produção, o processo valida toda a configuração server-side na
inicialização da instância e encerra com erro quando ela for inválida. A fase de
build é deliberadamente excluída dessa validação para que o segredo não entre no
contexto ou nas camadas da imagem. A qualidade entrópica
depende da geração e do armazenamento operacionais.

## Invariantes de segurança

- Somente `response_type=code` e `code_challenge_method=S256` são aceitos.
- Parâmetros ausentes, desconhecidos, duplicados ou acima dos limites falham antes
  de qualquer chamada upstream.
- A `redirect_uri` nunca é consultada pelo servidor. Um `Location` só é encaminhado
  se origem, path e parâmetros OAuth correspondem estritamente à solicitação.
- O `state` deve ser preservado byte a byte e aparecer exatamente uma vez.
- Scopes aprovados vêm da transação cifrada, nunca do corpo submetido pela tela.
- Consentimento só pode ser aprovado pela mesma conta à qual a transação foi
  vinculada. Uma troca de conta obriga nova autorização antes de exibir ou gravar
  a decisão.
- `prompt=none` nunca abre login ou consentimento. Sem sessão, o BFF encerra a
  transação localmente com `login_required`; depois de um `consent_required`
  validado pela API, devolve esse erro à `redirect_uri` com o `state` original.
- `prompt=login` e `select_account` exigem uma nova autenticação. Depois dela,
  essas diretivas são consumidas pelo BFF e não são reenviadas indefinidamente;
  outros valores, como `consent`, permanecem na chamada oficial.
- Embora `scope` seja opcional no `GET /oauth/authorize`, o BFF não abre a tela nem
  chama `POST /oauth/consent` com uma lista vazia. Um `302` autoritativo ainda pode
  concluir uma solicitação sem `scope` quando a API não exige interação.
- Cookies de sessão e da transação são inacessíveis ao JavaScript do navegador.
- Páginas e handlers OAuth usam `Cache-Control: no-store` e
  `Referrer-Policy: no-referrer`. As páginas também bloqueiam framing com CSP
  `frame-ancestors 'none'` e `X-Frame-Options: DENY`.
- Sucesso, recusa, expiração, transação inválida e erro terminal limpam a
  transação. Falhas transitórias preservam somente o estado necessário à retomada.

## Lacunas a alinhar com a Authentication API

O OpenAPI atual deixa algumas decisões de interoperabilidade sem enumeração ou
schema suficiente. O BFF falha de forma conservadora enquanto o contrato não as
define:

| Ponto | Definição necessária no backend |
| --- | --- |
| `prompt` | Enumerar valores suportados e os erros de `none`, além de esclarecer como a API reconhece uma autenticação recém-realizada. |
| Scope padrão | Definir os scopes efetivos quando `scope` for omitido ou tornar o campo obrigatório. `POST /oauth/consent` exige ao menos um scope. |
| Redirect `302` | Declarar o header `Location` e os parâmetros permitidos para sucesso e erro. |
| Respostas `401`/`403` | Enumerar os valores de `error` que distinguem reautenticação, interação e consentimento. |

## Escala e idempotência

A coordenação de submissões concorrentes é feita por transação no processo do
Next.js, enquanto a fase `approved` cifrada impede a repetição do consentimento
durante uma retomada. Isso atende à implantação atual com uma única instância do
processo. Antes de executar múltiplas réplicas, a coordenação deve migrar para um
armazenamento compartilhado com operação atômica, ou a Authentication API deve
fornecer uma chave de idempotência autoritativa entre réplicas.

## Validação manual

A execução posterior está preparada em
[Matriz manual de OAuth/PKCE](./testing/oauth-pkce-manual-test-matrix.md). Registre
ambiente, evidências e resultado de cada caso sem incluir tokens nos anexos.
