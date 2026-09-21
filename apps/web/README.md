This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Ambiente local

Copie `.env.example` para `.env.local` e configure:

| Variável | Exposição | Momento | Obrigatória |
| --- | --- | --- | --- |
| `AUTHENTICATION_API_BASE_URL` | Somente servidor | Build e runtime | Sim |
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
