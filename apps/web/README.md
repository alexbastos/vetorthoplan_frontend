# Web Orthovet

Interface e BFF em Next.js. Use Node 24 e pnpm 11, conforme as versões do
workspace. A partir da raiz do repositório, instale as dependências com
`pnpm install`, configure o ambiente abaixo e execute `pnpm dev`.

O frontend local usa `http://localhost:3000`. `pnpm --filter web test` executa
todos os arquivos `test/*.test.mjs` sequencialmente; `pnpm --filter web typecheck`
verifica TypeScript. O [índice da documentação](../../docs/README.md) explica os
contratos, checklists e fixtures que devem ser preservados.

## Identificação da versão publicada

A versão do frontend é definida somente no campo `version` de
[`package.json`](./package.json). A identificação atual é `0.9.0-web.3`:
`0.9.0` acompanha o contrato clínico de referência e `web.3` identifica a revisão
do frontend. Antes de cada nova publicação, incremente a revisão (`web.4`,
`web.5` etc.), mesmo que a API não mude. Ao alinhar uma nova versão do contrato
clínico, atualize a base e inicie novamente a revisão do frontend.

O valor é incorporado no build, aparece no rodapé do menu lateral expandido
e na tela de falha de verificação da sessão. Também pode ser consultado sem
autenticação em `GET /api/version`, com resposta `{ "version": "0.9.0-web.3" }`
e `Cache-Control: no-store`. O header `X-App-Version` identifica as respostas do
Next.js. Estes locais usam a mesma fonte; a API clínica não é consultada para
determinar a versão do frontend.

Depois de publicar um novo build, confira `/api/version` e a versão visível na
interface. Uma divergência pode indicar bundle antigo no navegador ou versões
diferentes entre as instâncias. Alterar o arquivo sem gerar/publicar outro build
não atualiza a identificação em produção.

## Ambiente local

Copie `.env.example` para `.env.local` e configure:

| Variável | Exposição | Momento | Obrigatória |
| --- | --- | --- | --- |
| `AUTHENTICATION_API_BASE_URL` | Somente servidor | Build e runtime | Sim |
| `CLINICAL_API_BASE_URL` | Somente servidor | Runtime clínico | Para integração clínica |
| `CLINICAL_API_IDENTITY_MODE` | Somente servidor | Runtime clínico | `jwt` para API remota; `local` apenas em development/test |
| `UPLOAD_STORAGE_ORIGINS` | Somente servidor | Runtime, CSP report-only | Origens exatas do POST direto ao storage |
| `PREVIEW_STORAGE_ORIGINS` | Somente servidor | Runtime, CSP report-only | Origens exatas das prévias temporárias |
| `APP_ORIGIN` | Somente servidor | Build e runtime | Sim |
| `OAUTH_TRANSACTION_SECRET` | Segredo server-side | Somente runtime | Sim em produção |
| `SESSION_COOKIE_SECRET` | Segredo server-side | Somente runtime | Sim em produção |
| `SESSION_COOKIE_PREVIOUS_SECRET` | Segredo server-side | Somente runtime | Apenas durante rotação |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Pública no navegador | Build | Somente para login Google |

Os segredos devem ter 32 bytes aleatórios codificados em base64url, nunca receber
o prefixo `NEXT_PUBLIC_` e nunca ser enviados como build arguments. O BFF não
utiliza `GOOGLE_CLIENT_SECRET`; essa credencial não deve ser fornecida ao projeto.
Em produção, o processo encerra com erro durante a inicialização quando qualquer
configuração server-side obrigatória estiver ausente ou inválida.

Para a API clínica em desenvolvimento, configure `CLINICAL_API_BASE_URL` com a
origem que o processo do BFF alcança, por exemplo `http://127.0.0.1:8000`, sem
`/docs` ou `/api/v1`, e `CLINICAL_API_IDENTITY_MODE=local`. Essa configuração é
validada no servidor quando o cliente clínico é criado. HTTP só é aceito em
loopback; o modo `local` é recusado fora de `development`/`test`. No projeto do
backend, configure `IDENTITY_MODE=local`, `LOCAL_TENANT_ID` e `LOCAL_ACTOR_ID`.
Não copie esses IDs para o frontend. O modo local não envia Bearer nem pode ser
usado em produção. A conexão remota usa um token clínico separado.

A origem oficial agora é `https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com`
(Swagger em `/docs`, contrato em `/openapi.json`). A publicação de 21/10/2026
continua na versão 0.9.0 e mantém os mesmos payloads, mas passou a declarar
Bearer/JWT nas operações clínicas. Configure essa origem, sem caminho, com
`CLINICAL_API_IDENTITY_MODE=jwt`. O BFF resolve a sessão geral, consulta as
organizações ativas e troca o token para `vetorthoplan-api`. Com uma organização,
a seleção é automática; com várias, a tela pede escolha. O token clínico fica
cifrado em cookie HttpOnly e é renovado por nova troca; o refresh token geral
permanece separado. Nenhum token deve chegar ao JavaScript do navegador.

O time confirmou o [contrato suplementar da troca](../../docs/organization-token-contract.md),
implementado no BFF mesmo antes de aparecer no Swagger público. A URL de
autenticação não deve ser copiada inteira para a variável: o cliente já inclui
o prefixo `/authentication_api/api/v1/auth`. Após alterar `.env`, reinicie o
servidor do frontend. Veja o [relatório da conexão remota](../../docs/clinical-remote-integration-status.md).

Para repetir apenas as verificações públicas de saúde/contrato, sem conta ou
dados clínicos, execute `corepack pnpm --filter web check:clinical-remote`.
O diagnóstico usa a origem oficial por padrão e permite uma origem explícita
como argumento. Não lê `.env` e não emite tokens. Saída 2 indica pendências;
saída 0 valida somente essas verificações públicas, sem certificar autenticação,
storage, CORS ou worker. A ausência da rota no OpenAPI ainda gera
`ORGANIZATION_TOKEN_UNDOCUMENTED`, mesmo com o contrato suplementar implementado.

Para testar upload e prévia no navegador, configure as origens exatas do storage
em `UPLOAD_STORAGE_ORIGINS` e `PREVIEW_STORAGE_ORIGINS`, separadas por vírgula.
Essas variáveis alimentam a CSP em modo report-only; o backend/storage também
precisam permitir a origem do produto conforme a operação. A URL assinada da
prévia vem do backend e nunca deve ser copiada para essas variáveis.

## Sessão

Access e refresh tokens são cifrados separadamente com AES-256-GCM antes de serem
persistidos em cookies `HttpOnly`. Os cookies carregam somente ciphertext
autenticado, têm finalidades criptograficamente distintas e também impõem no
servidor os prazos de 15 minutos e 7 dias. Em produção usam `Secure`, escopo
host-only pelo prefixo `__Host-Http-`, `Path=/`, `SameSite=Lax` e prioridade alta.
Em desenvolvimento os nomes não usam o prefixo porque HTTP loopback é permitido.

`SESSION_COOKIE_SECRET` é exclusivo do runtime e deve ser idêntico em todas as
instâncias do mesmo ambiente. Para rotacioná-lo sem encerrar imediatamente as
sessões cifradas, mova temporariamente a chave atual para
`SESSION_COOKIE_PREVIOUS_SECRET`, publique uma chave nova como atual e remova a
anterior depois de sete dias. Cookies abertos pela chave anterior são reemitidos
com a chave atual na próxima resposta mutável do BFF. Cookies legados que
continham tokens em texto puro não são aceitos; login e logout removem seus nomes.

As mutações do BFF validam obrigatoriamente o header `Origin` contra `APP_ORIGIN`. Destinos de retorno pós-login ou pós-logout também aceitam somente paths internos seguros.

Nas rotas com política `body: "none"`, o cliente envia a requisição sem corpo e
com `Content-Type: application/json` explícito para evitar que intermediários
escolham outro tipo de conteúdo. A renovação de sessão usa o mesmo cliente de
autenticação. Para compatibilidade, o BFF aceita ausência de `Content-Type` ou
`Content-Type: application/json` (com parâmetros, como `charset=utf-8`) se o
corpo estiver realmente vazio. O tamanho declarado deve ser ausente ou zero;
o stream também é verificado. Qualquer conteúdo, inclusive `{}` ou espaços,
continua rejeitado. Outros tipos de conteúdo e encodings não permitidos
continuam retornando 415; as validações de origem, método e sessão são mantidas.
Uploads multipart não recebem esse cabeçalho manualmente: o navegador gera
`multipart/form-data` com o boundary. A regra de JSON explícito pertence às
chamadas navegador → BFF e não altera a troca de token upstream sem corpo.

As rotas públicas `POST /api/auth/register`, `POST /api/auth/login` e `POST /api/auth/verify-email` não expõem tokens nem encaminham mensagens técnicas da API. O login grava os cookies de sessão somente na resposta do BFF.

As rotas autenticadas `POST /api/auth/resend-verification` e `POST /api/auth/logout` recebem o access token somente do cookie HttpOnly no servidor. O logout apaga os dois cookies locais mesmo quando a revogação remota não puder ser concluída.

O resolvedor server-only de sessão consulta `/users/me`. Se o access token receber `401`, ele rotaciona o refresh token uma única vez, substitui os dois cookies e repete a consulta. A rotação só é permitida quando o chamador fornece uma resposta mutável para persistir os novos cookies; isso evita invalidar um refresh token sem conseguir salvar seu substituto.

`POST /api/auth/session` é a leitura sanitizada para a interface. Ela retorna somente estado autenticado, um subconjunto do perfil e a expiração aproximada do access token; tokens nunca aparecem na resposta. Usa POST e valida `Origin` porque uma leitura com token expirado pode renovar cookies.

O [Middleware do Next.js 15](https://nextjs.org/docs/15/app/api-reference/file-conventions/middleware) cobre apenas `/app` e subrotas. Ele redireciona rapidamente ao login quando nenhum cookie de sessão está presente, preservando o destino interno em `from`; não valida nem renova tokens.

## Segurança HTTP

Todas as respostas recebem um baseline centralizado com CSP contra framing,
alteração de `base`, submissão de formulários para terceiros e plugins; também
recebem `nosniff`, isolamento de opener/resource, referrer restrito, permissões
mínimas do navegador e headers legados defensivos. O header de identificação
`X-Powered-By` do Next.js permanece desabilitado.

Em produção, o app envia HSTS por um ano sem `includeSubDomains` ou `preload`.
Essas duas ampliações exigem confirmação prévia do time de infraestrutura. Rotas
`/api/*`, `/app/*`, `/oauth/*`, `/reset-password` e `/verify-email` acrescentam
`Cache-Control: no-store` e `Referrer-Policy: no-referrer`.

O isolamento padrão usa `Cross-Origin-Opener-Policy: same-origin`. Apenas
`/login` e `/register`, que iniciam o popup oficial do Google, recebem
`same-origin-allow-popups`.

O baseline permanece ativo independentemente da observação avançada. Para o MVP,
`CSP_REPORT_ONLY_ENABLED` usa `false` por padrão, portanto documentos não recebem
nonce nem `Content-Security-Policy-Report-Only`. Definir explicitamente `true` em
um ambiente de validação reativa a Strict CSP candidata com nonce aleatório por
resposta. APIs, assets imutáveis, metadata e prefetch não passam pelo gerador.

Quando habilitada em um ambiente com `NODE_ENV=production`, `script-src` não
aceita `unsafe-inline` nem `unsafe-eval`. As rotas de login/cadastro incluem
somente os caminhos oficiais do Google Identity Services. `style-src-attr
'unsafe-inline'` mantém compatibilidade com propriedades de estilo geradas por
React e GSAP sem liberar JavaScript inline. A promoção para enforcement ocorrerá
somente depois da matriz manual e da definição da origem HTTPS de avatares; até
lá, violações esperadas de avatar remoto ajudam a identificar a allowlist correta
quando o modo de observação estiver habilitado.

## Solicitações OAuth

A entrada OAuth aceita somente Authorization Code com PKCE `S256`. A camada
server-side rejeita parâmetros desconhecidos, repetidos, malformados ou acima
dos limites antes de consultar a Authentication API. `redirect_uri` deve usar
HTTPS, exceto para endereços loopback HTTP usados em desenvolvimento ou por
clientes nativos.

Depois da validação, a solicitação é mantida por no máximo dez minutos no cookie
`vetorthoplan_oauth_transaction`, com `HttpOnly`, `SameSite=Lax` e cifragem autenticada
AES-256-GCM. O cookie contém um ID aleatório, a solicitação original e o estado
mínimo do fluxo; ao entrar em consentimento, também fica vinculado ao ID da conta
autenticada. Login, MFA e consentimento recuperam essa transação em vez de confiar
em parâmetros reenviados pelo navegador. O segredo de cifragem nunca é público.

`GET /oauth/authorize` cria ou recupera essa transação e resolve a sessão pelo
BFF, incluindo uma única rotação segura do refresh token quando necessária.
Usuários anônimos seguem para `/login` com somente o ID opaco no parâmetro
`from`. O coordenador comum de senha, Google e MFA retorna por navegação de
documento ao mesmo Route Handler, que reabre a solicitação autenticada.
`prompt=none` nunca inicia uma interface. `prompt=login` e `select_account`
invalidam a sessão local depois que a API confirma a solicitação e exigem uma
nova autenticação antes de continuar.

Com a sessão resolvida, o BFF chama `/oauth/authorize` sem seguir redirects. Um
`302` só é encaminhado quando o `Location` mantém exatamente a `redirect_uri`
original, contém uma única resposta OAuth válida e devolve o mesmo `state`. Um
`401` invalida os cookies da sessão e reinicia o login sem perder a transação.
Um `403` só segue para `/oauth/consent` quando o corpo indica
`consent_required`, repete o mesmo `client_id` e não introduz scopes ausentes da
solicitação original. Solicitações sem `scope` podem concluir por `302`, mas não
podem entrar em consentimento nem produzir uma concessão vazia. O BFF nunca faz
uma requisição ao endereço de `Location`.

A tela `/oauth/consent` recupera a aplicação, a conta autenticada e os scopes
somente da transação cifrada e da sessão server-side. Ela apresenta descrições
compreensíveis para scopes conhecidos, mantém um fallback explícito para scopes
desconhecidos e envia apenas a decisão e o identificador opaco da transação. As
ações de permitir e cancelar bloqueiam submissões repetidas. Todas as rotas
`/oauth/*` usam `Cache-Control: no-store`, `Referrer-Policy: no-referrer` e recusam
enquadramento por terceiros com `frame-ancestors 'none'` e `X-Frame-Options: DENY`.
O cookie cifrado também registra a fase `consent` somente depois que a
Authentication API confirma `consent_required`, impedindo acesso direto à tela
com uma transação que ainda não teve o cliente validado pelo serviço.

`POST /api/oauth/consent` é a fronteira privada do BFF para o formulário e
aceita somente requisições same-origin pequenas,
com uma decisão e um ID de transação únicos. Na aprovação, os scopes enviados à
Authentication API são sempre recuperados do cookie cifrado; o navegador não
escolhe nem amplia permissões. Depois de um consentimento válido, o BFF executa
novamente a autorização e só então encaminha o redirect OAuth validado. Se essa
segunda chamada falhar temporariamente, a fase `approved` permite repeti-la sem
gravar o consentimento outra vez.
Antes da aprovação, a conta da sessão é comparada ao identificador vinculado à
transação; uma troca de conta retorna ao endpoint de autorização para uma nova
avaliação autoritativa.

Na recusa, o BFF constrói `error=access_denied` com o `state` original e submete
o destino ao mesmo validador estrito de redirects. Uma única operação é
coordenada por transação para que submissões concorrentes reutilizem o mesmo
resultado terminal. Sucesso, recusa, expiração e falhas terminais expiram o
cookie da transação; indisponibilidade transitória preserva apenas o estado
necessário para uma tentativa segura.

As fronteiras entre cliente externo, navegador, BFF e Authentication API, além
das regras operacionais, estão em [OAuth 2.0 com PKCE](../../docs/oauth-pkce.md).
Os cenários que serão executados na validação integrada estão na
[matriz manual de OAuth/PKCE](../../docs/testing/oauth-pkce-manual-test-matrix.md).

## Deploy e Atualização (Docker na AWS EC2)

A infraestrutura e o deploy deste frontend devem usar um projeto Terraform próprio do Vetorthoplan. O processo de deploy deve atualizar e recriar somente a imagem Docker do Vetorthoplan na EC2.

Para atualizar a aplicação em produção, siga uma das abordagens abaixo:

### Opção 1: Via Terraform (Recomendado e Automatizado)
O script do Terraform foi configurado para conectar na EC2, fazer o clone/pull do repositório, efetuar o build do Docker e reiniciar o contêiner na porta 3001.

1. **Envie as alterações para o repositório remoto:** A EC2 baixa as atualizações diretamente do GitHub.
   ```bash
   git add .
   git commit -m "Sua mensagem de atualização"
   git push origin main
   ```
2. **Execute o script de infraestrutura:**
   ```bash
   cd ../vetorthoplan_terraform
   terraform apply
   ```

### Opção 2: Manualmente via SSH
Caso precise intervir manualmente, acesse a instância e execute os passos:

1. **Acesse a instância EC2 via SSH:**
   ```bash
   ssh -i ~/.ssh/id_rsa ubuntu@<IP_DA_EC2>
   ```
2. **Atualize o código e recrie o contêiner Docker:**
   ```bash
   cd /home/ubuntu/vetorthoplan_frontend
   git pull origin main
   set -a
   . ./.env
   set +a
   docker build \
     --build-arg AUTHENTICATION_API_BASE_URL \
     --build-arg APP_ORIGIN \
     --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID \
     -t vetorthoplan-frontend .
   docker stop vetorthoplan-frontend-container || true
   docker rm vetorthoplan-frontend-container || true
   docker run -d --restart unless-stopped --name vetorthoplan-frontend-container -p 3001:3000 --env-file .env vetorthoplan-frontend
   ```

   O arquivo `.env` usado na EC2 deve definir `AUTHENTICATION_API_BASE_URL`,
   `APP_ORIGIN`, `OAUTH_TRANSACTION_SECRET` e `SESSION_COOKIE_SECRET`.
   As duas origens precisam
   usar HTTPS em produção e são fornecidas ao build e ao contêiner. Os segredos são
   exclusivos do runtime: devem ter 32 bytes aleatórios em base64url, permanecer
   somente no gerenciador de segredos/`.env` da instância e nunca ser enviados como
   build arguments. `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, quando usado, deve ser fornecido
   ao build porque seu valor público é incorporado ao JavaScript do navegador.
a
