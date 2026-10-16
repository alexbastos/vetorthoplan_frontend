# Auditoria da superfície HTTP

Status: Etapas 6.1 a 6.4 concluídas em 2026-09-10. O documento começou como uma
fotografia anterior ao hardening; a tabela de achados e as seções operacionais
registram quais controles já foram implantados.

## Escopo e premissas

- Aplicação Next.js App Router executada em Node.js dentro de um contêiner AWS.
- Versão resolvida do framework: Next.js 15.5.23. A versão não será alterada
  durante este ciclo de hardening.
- O navegador se comunica com a Authentication API somente através do BFF.
- CSP controla recursos carregados pelo navegador. As chamadas server-side para
  a Authentication API e para o ViaCEP não pertencem a `connect-src`.
- Configurações do balanceador, TLS, CloudFront, WAF e Terraform não estão neste
  repositório e precisam ser confirmadas com Back/Infra antes de HSTS ou preload.

## Referências adotadas

- [CSP Level 3 do W3C](https://www.w3.org/TR/CSP3/)
- [CSP no Next.js 15](https://nextjs.org/docs/15/app/guides/content-security-policy)
- [Headers no Next.js 15](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/headers)
- [Content Security Policy Cheat Sheet da OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Cross-Site Request Forgery Prevention Cheat Sheet da OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Fetch Metadata do W3C](https://www.w3.org/TR/fetch-metadata/)
- [Requisitos CSP do Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#content_security_policy)
- [Middleware no Next.js 15](https://nextjs.org/docs/15/app/api-reference/file-conventions/middleware)

## Inventário de páginas e entradas

| Superfície | Rotas | Observação de segurança |
| --- | --- | --- |
| Pública institucional | `/`, `/robots.txt`, `/sitemap.xml` | Conteúdo e assets locais; deve continuar elegível para cache estático. |
| Autenticação | `/login`, `/register`, `/register/check-email`, `/forgot-password`, `/reset-password`, `/verify-email` | Login Google carrega código externo; reset e verificação recebem token na URL. |
| OAuth externo | `GET /oauth/authorize` | Entrada cross-site legítima por navegação de topo; valida query, PKCE e redirect antes de criar a transação. |
| Consentimento | `GET /oauth/consent` | Exige transação OAuth cifrada na fase correta e sessão autenticada. |
| Protegida | `/app`, `/app/dashboard`, `/app/settings` | O layout confirma a sessão no servidor; a checagem antecipada usa `middleware.ts`, compatível com Next 15. |
| BFF | `/api/auth/*`, `/api/settings/*`, `/api/oauth/consent` | Não há CORS permissivo; clientes do navegador usam URLs relativas e credenciais same-origin. |

## Inventário das rotas BFF

Todas as rotas abaixo usam métodos mutáveis porque até leituras de sessão
podem rotacionar cookies. As rotas existentes validam `Origin` por igualdade exata
com `CAPTAGOV_APP_ORIGIN` antes de falar com serviços externos.

| Classe | Endpoints | Corpo | Sessão |
| --- | --- | --- | --- |
| Autenticação pública | `POST /api/auth/register`, `/login`, `/login/social`, `/forgot-password`, `/reset-password`, `/verify-email`, `/resend-verification`, `/mfa/email-code`, `/mfa/verify` | JSON validado por schemas estritos | Não exigida; login e MFA podem criar sessão. |
| Ciclo de sessão | `POST /api/auth/session`, `/logout` | Sem corpo | Resolve, renova ou revoga a sessão. |
| Leitura autenticada | `POST /api/settings/profile`, `/sessions`, `/login-history` | Sem corpo | Obrigatória. |
| Mutação autenticada | `PUT /api/settings/profile`, `/password`; `DELETE /api/settings/avatar`, `/sessions/{sessionId}`, `/social/{provider}`; `POST /api/settings/social` | JSON ou sem corpo | Obrigatória. IDs e providers possuem allowlist/limite. |
| Consulta de CEP | `POST /api/settings/postal-code` | JSON | Obrigatória; o BFF consulta uma URL fixa do ViaCEP com CEP validado. |
| Avatar | `POST /api/settings/avatar` | `multipart/form-data` | Obrigatória; JPEG/PNG, assinatura mágica e limite lógico de 5 MiB. |
| Consentimento | `POST /api/oauth/consent` | `application/x-www-form-urlencoded`, máximo de 256 bytes | Transação OAuth e sessão obrigatórias para aprovar. |

### Exceção intencional de navegação

`GET /oauth/authorize` pode ser iniciado por um cliente OAuth em outro site e não
é bloqueado apenas por ser `cross-site`. A rota aceita somente `GET` e, quando o
navegador envia Fetch Metadata, exige `navigate` com destino `document`. A
validação OAuth existente continua obrigatória, e nenhuma rota mutável da API
recebe a mesma exceção.

## Recursos observados pelo navegador

| Diretiva CSP | Necessidade observada | Allowlist inicial a validar |
| --- | --- | --- |
| `default-src` | Fallback restritivo | `'none'` como objetivo. |
| `script-src` | Bundles Next/React e Google Identity Services | Nonce por resposta, `'strict-dynamic'`; compatibilidade do Google validada em Report-Only. Nunca `unsafe-inline` em produção. |
| `style-src-elem` | CSS compilado do próprio app e stylesheet eventual do Google | `'self'`, nonce quando necessário e `https://accounts.google.com/gsi/style` somente nas páginas de login. |
| `style-src-attr` | JSX possui atributos `style` e o GSAP altera estilos em runtime | Não pode ser bloqueado imediatamente. Isolar temporariamente essa compatibilidade e eliminar a exceção em uma etapa posterior. |
| `connect-src` | Chamadas same-origin ao BFF e Google Identity Services | `'self'` e `https://accounts.google.com/gsi/` nas páginas que oferecem Google. |
| `frame-src` | Google pode utilizar frames internos | `https://accounts.google.com/gsi/` apenas onde a integração estiver disponível; `'none'` no restante. |
| `img-src` | Assets locais, preview de avatar `blob:` e avatar remoto retornado pela API | `'self' blob:` e uma origem de avatar ainda não definida. Não liberar `http:` em produção. |
| `font-src` | Fontes Geist empacotadas localmente | `'self'`. |
| `worker-src`, `media-src`, `object-src` | Nenhum worker, mídia, `object` ou `embed` identificado | `'none'`. |
| `base-uri` | Nenhuma tag `base` identificada | `'none'`. |
| `form-action` | Formulários React same-origin e consentimento HTML same-origin | `'self'`. Redirects OAuth são respostas HTTP e não exigem liberação aqui. |
| `frame-ancestors` | Nenhuma integração que enquadre o CAPTAGOV | `'none'` em todas as páginas. |

### Código dinâmico e sinks

- Não foram encontrados `dangerouslySetInnerHTML`, `eval`, `new Function`,
  `document.write`, `iframe`, `object` ou `embed` no código da aplicação.
- O único script remoto identificado é criado por
  `use-google-auth.ts` e aponta para
  `https://accounts.google.com/gsi/client`.
- Existem atributos `style` em componentes React e alterações de estilo feitas
  pelo GSAP. Isso afeta `style-src-attr`, mas não justifica `unsafe-inline` em
  `script-src`.
- O preview local de avatar usa `URL.createObjectURL`, portanto requer `blob:` em
  `img-src` na área autenticada.
- O avatar persistido aceita hoje qualquer URL HTTP(S) retornada pela
  Authentication API. Antes da CSP em modo enforcement, Back deve informar a
  origem fixa de imagens ou o BFF deve servir/proxyar uma URL same-origin.
- `localStorage` armazena apenas preferências visuais e um evento de logout entre
  abas; nenhum token de sessão foi encontrado em Web Storage.

## Controles atuais

- Cookies de sessão e transação OAuth são `HttpOnly`, `SameSite=Lax` e
  `Secure` em produção; os respectivos conteúdos são cifrados e autenticados.
- Todas as mutações do BFF fazem comparação exata de `Origin`, rejeitam contextos
  Fetch Metadata conhecidos que não sejam `same-origin` e falham fechadas quando
  `Origin` está ausente.
- Respostas do BFF de autenticação/configurações usam `Cache-Control: no-store`
  e `X-Content-Type-Options: nosniff`.
- OAuth acrescenta `Referrer-Policy: no-referrer`; reset de senha e verificação
  de e-mail também não enviam referrer.
- `/oauth/*` possui hoje `frame-ancestors 'none'`, `X-Frame-Options: DENY`,
  `base-uri`, `form-action` e `object-src`.
- JSON, consentimento e multipart possuem media type explícito e limite aplicado
  aos bytes efetivamente lidos antes do parse. O avatar continua validando também
  tamanho do arquivo, formato declarado e assinatura binária.
- O cliente HTTP server-side usa timeout de dez segundos, não segue redirects e
  impede que paths resolvam fora da origem configurada da Authentication API.

## Achados e encaminhamento

| Prioridade | Achado | Risco/impacto | Tratamento |
| --- | --- | --- | --- |
| Resolvida na 6.2 | `src/proxy.ts` não era uma convenção reconhecida pelo Next.js 15. | A barreira antecipada de `/app` não executava. A autorização definitiva do layout permanecia ativa. | Substituído por `src/middleware.ts`, com export `middleware`, sem alterar a versão do Next. O manifesto do build deve permanecer como gate de regressão. |
| Em observação na 6.3 | A CSP cobria somente `/oauth/*` e não definia `script-src` ou `default-src`. | Protegia contra framing/form/base/object nessa área, mas ainda não observava injeção de scripts. | Strict CSP com nonce por resposta foi implantada em Report-Only. A promoção para enforcement depende da matriz manual e da origem de avatares. |
| Resolvida na aplicação na 6.4 | Corpos JSON eram lidos sem validar `Content-Type` nem impor limite de bytes antes do parse. | Consumo excessivo de memória e aceitação de formatos inesperados. | JSON agora exige `application/json` e é limitado a 32 KiB durante a leitura do stream. O limite do ingress continua dependendo de Infra. |
| Resolvida na aplicação na 6.4 | O limite do upload podia ser contornado quando `Content-Length` estava ausente. | Requisição chunked muito grande podia ser materializada antes da validação do arquivo. | O stream multipart agora é interrompido acima de 5 MiB mais 64 KiB de overhead, antes de `formData()`. O limite equivalente no ingress continua pendente. |
| Média | A origem dos avatares remotos não é restrita. | Obriga `img-src` amplo e permite tracking por um host retornado indevidamente pela API. | Definir origem dedicada HTTPS ou proxy same-origin antes do enforcement. |
| Resolvida na 6.4 | A defesa CSRF usava apenas `Origin`; Fetch Metadata ainda não era avaliado. | A comparação exata já bloqueava o ataque no navegador, mas faltava uma segunda evidência independente do contexto. | Mutações rejeitam `same-site`, `cross-site` e `none`; ausência ou valor futuro desconhecido mantém a comparação exata obrigatória de `Origin`. `/oauth/authorize` permanece fora dessa política. |
| Resolvida na 6.2 | Não havia headers globais consistentes; APIs e páginas recebiam conjuntos diferentes. | A proteção variava conforme a rota e respostas de erro podiam divergir. | A política foi centralizada em `security-headers.ts`, com overrides mais restritivos para rotas sensíveis. |
| Resolvida nas 6.2/6.3 | Google OAuth por popup precisava de CSP e `Cross-Origin-Opener-Policy` compatíveis. | Uma política global agressiva poderia quebrar o popup ou a comunicação com GIS. | `same-origin-allow-popups` e os caminhos oficiais do GIS ficaram restritos a `/login` e `/register`. |
| Média | O cookie temporário de confirmação guarda o e-mail em texto legível pelo cliente HTTP, embora seja `HttpOnly`. | Exposição desnecessária de PII no armazenamento do navegador. | Substituir por valor cifrado/assinado ou identificador opaco em uma tarefa de privacidade de cookies. |
| Pendente | Não existe rate limiting distribuído no BFF; respostas `429` apenas refletem o upstream. | Proteção pode variar entre instâncias e serviços. | Depende da decisão Back/Infra da Etapa 5 ou de AWS WAF/API Gateway. |

## Estratégia aprovada para as próximas microtarefas

1. Aplicar headers globais que não alterem a execução de scripts e estilos. **Concluído na 6.2.**
2. Recuperar a convenção `middleware.ts` compatível com Next.js 15 e preservar
   a verificação de sessão apenas como barreira de UX.
   **Concluído na 6.2.**
3. Gerar nonce criptograficamente aleatório por resposta somente para documentos,
   excluindo API, assets imutáveis, metadata e prefetch.
   **Concluído na 6.3.**
4. Publicar Strict CSP em `Content-Security-Policy-Report-Only`, sem
   `unsafe-inline` ou `unsafe-eval` para scripts em produção.
   **Concluído na 6.3.**
5. Validar violações reais de Next/React, Google, GSAP e avatar antes de ativar
   enforcement. Nonce implica renderização dinâmica nas rotas cobertas; o
   impacto de cache da landing page deve ser medido e evitado quando possível.
6. Manter `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'` e
   `form-action 'self'` em enforcement desde o início.
7. Implementar Fetch Metadata e limites de entrada em seams server-only comuns,
   com exceções pequenas, nomeadas e testáveis. **Concluído na 6.4.**

## Headers implementados na 6.2

| Escopo | Headers |
| --- | --- |
| Global | `Content-Security-Policy` baseline, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `Permissions-Policy`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-DNS-Prefetch-Control: off`, `X-Frame-Options: DENY`, `X-Permitted-Cross-Domain-Policies: none`, `X-XSS-Protection: 0` |
| Produção | `Strict-Transport-Security: max-age=31536000`, sem ampliar para subdomínios ou preload antes da validação de Infra |
| `/login`, `/register` | Override `Cross-Origin-Opener-Policy: same-origin-allow-popups` para Google Identity Services |
| `/api/*`, `/app/*`, `/oauth/*`, `/reset-password`, `/verify-email` | `Cache-Control: no-store` e `Referrer-Policy: no-referrer` |

O baseline CSP aplicado em enforcement é
`base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'`.
Ele não controla scripts ou estilos ainda; essa separação evita uma falsa
sensação de Strict CSP e permite o rollout observável da etapa 6.3.

## Operação do Report-Only da 6.3

- O nonce possui 128 bits aleatórios e é regenerado em cada request de documento.
- O valor recebido do cliente nos headers `Content-Security-Policy` e `x-nonce`
  é sempre sobrescrito pelo Middleware antes da renderização.
- A política interna permite que o Next.js aplique o nonce aos scripts e estilos
  que ele gera. O navegador recebe a mesma política somente pelo header
  `Content-Security-Policy-Report-Only`.
- `script-src` usa nonce e `strict-dynamic`; produção não recebe
  `unsafe-inline` ou `unsafe-eval`. Desenvolvimento recebe apenas
  `unsafe-eval`, necessário para o diagnóstico do framework.
- `style-src-attr 'unsafe-inline'` preserva as propriedades escritas por React e
  GSAP. Nos browsers CSP3, elementos `<style>` continuam separados por
  `style-src-elem` e protegidos por nonce.
- O login Google é liberado somente em `/login` e `/register`, nos caminhos
  oficiais `/gsi/client`, `/gsi/style` e `/gsi/`.
- `img-src` não aceita genericamente `https:`. Assim, o avatar remoto deve gerar
  uma violação informativa no console até sua origem ser definida, sem deixar de
  aparecer enquanto a política estiver em Report-Only.
- Não foi criado endpoint público de coleta nesta etapa. Isso evita adicionar
  uma superfície anônima sujeita a abuso antes dos limites e rate limiting. A
  validação manual usará o console de segurança do navegador.

## Operação da proteção de requisições da 6.4

- `request-security.ts` é o seam único para origem, Fetch Metadata, método,
  media type, encoding e leitura limitada do corpo.
- A origem aceita vem exclusivamente de `CAPTAGOV_APP_ORIGIN`; `Host`,
  `X-Forwarded-Host` e a URL recebida não ampliam confiança atrás do proxy.
- JSON aceita até 32 KiB. Consentimento OAuth mantém 256 bytes. Multipart de
  avatar aceita até 5 MiB mais 64 KiB de overhead.
- Limites usam `Content-Length` para rejeição antecipada e contam o stream real,
  cobrindo requisições chunked ou sem tamanho declarado.
- Rotas sem corpo rejeitam payload e `Content-Type` inesperados. JSON,
  URL-encoded e multipart possuem contratos distintos.
- `SameSite=Lax` foi preservado para que uma navegação externa legítima até
  `/oauth/authorize` possa aproveitar a sessão existente. Cookies de sessão e,
  em produção, a transação OAuth usam nomes com prefixo `__Host-Http-`.
- A limpeza local do logout só acontece depois que a requisição atravessa a
  validação. Falhas posteriores na revogação remota continuam resultando em
  limpeza local idempotente.

### Critérios para promover a Strict CSP a enforcement

1. Login por senha, Google e MFA sem violações inesperadas.
2. Animações GSAP, WebGL, menus e transições visualmente preservados.
3. Origem HTTPS do avatar definida e substituindo qualquer liberação ampla.
4. Navegação, refresh, consentimento OAuth e erros funcionando com nonce novo.
5. Nenhuma dependência de `unsafe-inline` ou `unsafe-eval` em `script-src` de
   produção.
6. Build confirmando o Middleware e assets/metadata fora do matcher.

## Questões externas antes do enforcement

- Qual é a origem HTTPS exata e estável dos avatares?
- TLS termina no ALB, CloudFront, Amplify ou outro proxy?
- Todos os subdomínios estão preparados para HSTS `includeSubDomains`?
- O domínio já está ou deve entrar na lista HSTS preload? Essa decisão não é
  reversível rapidamente e não será presumida pelo frontend.
- O ingress possui limite de corpo para JSON e multipart? Quais valores?
- Existe coletor aprovado para relatórios CSP, sem incluir dados sensíveis?
- AWS WAF/API Gateway já aplica limites por IP, rota ou identidade?
