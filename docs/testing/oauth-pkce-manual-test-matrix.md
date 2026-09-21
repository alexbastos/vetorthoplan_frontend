# Matriz manual de testes — OAuth/PKCE

Esta matriz deve ser executada depois que o ambiente integrado estiver pronto.
Use um cliente registrado, uma `redirect_uri` controlada e contas separadas para
sessão simples e MFA. Não registre tokens, cookies, códigos, verifier ou segredos
em screenshots e logs de evidência.

Para cada caso, anote: data, ambiente, navegador/dispositivo, resultado
(`passou`, `falhou` ou `bloqueado`) e referência da evidência sanitizada.

## Fluxos principais

| ID | Cenário e ação | Resultado esperado |
| --- | --- | --- |
| OAU-001 | Iniciar Authorization Code válido, usuário já autenticado e consentimento já concedido. | Redirect único à URI cadastrada com `code` e o `state` original; nenhuma tela de consentimento. |
| OAU-002 | Iniciar solicitação válida sem consentimento prévio e permitir. | A tela mostra cliente, conta e scopes; após permitir, retorna `code` e `state`. |
| OAU-003 | Na mesma condição, cancelar. | Redirect à URI original com `error=access_denied` e o `state` original; sem `code`. |
| OAU-004 | Trocar o código com o `code_verifier` correto no endpoint oficial. | A Authentication API aceita uma única troca segundo o contrato. |
| OAU-005 | Tentar trocar o código novamente ou usar verifier incorreto. | A Authentication API rejeita sem emitir novos tokens. |
| OAU-006 | Usar `prompt=login` ou `prompt=select_account` com sessão autenticada. | A solicitação é validada pela API, a sessão local é encerrada e uma única nova autenticação é exigida; o fluxo não entra em loop ao retomar. |
| OAU-007 | Usar `prompt=consent` com sessão autenticada. | A diretiva permanece na chamada oficial e a API exige consentimento conforme sua política. |
| OAU-008 | Usar `prompt=none` sem sessão ou quando falta consentimento. | Nenhuma interface é aberta; retorna `login_required` localmente ou `consent_required` para a URI já validada, conforme o ponto do fluxo. |

## Validação da solicitação

| ID | Cenário e ação | Resultado esperado |
| --- | --- | --- |
| OAU-010 | Omitir, esvaziar ou duplicar cada campo obrigatório: `client_id`, `redirect_uri`, `response_type`, `state`, `code_challenge` e `code_challenge_method`. | `400 invalid_request`; nenhuma chamada upstream quando a falha é local. |
| OAU-011 | Esvaziar ou duplicar `scope`, `nonce` ou `prompt`, ou adicionar parâmetro desconhecido. | `400 invalid_request` ou `invalid_scope`, conforme o parâmetro. |
| OAU-012 | Usar `response_type` diferente de `code`. | `400 invalid_request`. |
| OAU-013 | Omitir PKCE, usar `plain` ou challenge fora do formato permitido. | `400 invalid_request`; somente `S256` é aceito. |
| OAU-014 | Enviar query acima do limite e valores excessivamente longos. | Rejeição controlada, sem ecoar o conteúdo e sem erro interno exposto. |
| OAU-015 | Repetir um scope ou enviar separadores/espaçamento inválidos. | `400 invalid_request`. |
| OAU-016 | Combinar `prompt=none` com outro valor de prompt. | `400 invalid_request`. |
| OAU-017 | Usar `redirect_uri` HTTP remota, com credenciais ou fragmento. | Rejeição; HTTP somente para loopback permitido pelo contrato. |
| OAU-018 | Usar `client_id`, redirect ou scope bem-formado, porém não cadastrado. | Rejeição autoritativa pela Authentication API; nenhum redirect não confiável. |
| OAU-019 | Omitir `scope` e receber `consent_required` da API. | Falha fechada; a tela não abre e o BFF não envia uma lista vazia ao endpoint de consentimento. Um `302` autoritativo sem interação continua permitido. |

## Login, renovação e MFA

| ID | Cenário e ação | Resultado esperado |
| --- | --- | --- |
| OAU-020 | Iniciar sem sessão e autenticar com senha. | Login recebe apenas o ID opaco e retoma a solicitação original. |
| OAU-021 | Iniciar sem sessão e autenticar com Google. | Mesmo comportamento, sem parâmetros OAuth sensíveis no callback do navegador. |
| OAU-022 | Autenticar uma conta com MFA por cada método disponível. | Após desafio válido, retoma exatamente a mesma transação. |
| OAU-023 | Usar access token expirado e refresh token válido. | Uma rotação é persistida e o fluxo continua sem perder estado. |
| OAU-024 | Usar sessão inválida ou refresh inválido. | Cookies de sessão são limpos e o usuário volta ao login com a transação preservada quando seguro. |
| OAU-025 | Alterar ou substituir o ID opaco em `from`/`transaction`. | A continuação é rejeitada; outra transação não é aberta nem exibida. |
| OAU-026 | Concluir login após mais de dez minutos. | Transação expirada; usuário deve reiniciar pelo cliente externo. |

## Redirects e respostas upstream

| ID | Cenário e ação | Resultado esperado |
| --- | --- | --- |
| OAU-030 | Simular `Location` com host, porta, scheme, path ou query base diferentes. | Resposta upstream rejeitada; nenhum redirect e nenhuma requisição ao destino. |
| OAU-031 | Simular `Location` com userinfo, fragmento ou URL malformada. | Resposta upstream rejeitada. |
| OAU-032 | Remover, duplicar ou alterar um byte do `state` no `Location`. | Resposta upstream rejeitada. |
| OAU-033 | Retornar `code` e `error` juntos, duplicados ou com campos desconhecidos. | Resposta upstream rejeitada. |
| OAU-034 | Retornar `401` durante a autorização. | Sessão local é limpa e o login reinicia sem reconstruir a query pelo navegador. |
| OAU-035 | Retornar `403` diferente de `consent_required` ou com outro cliente/scope. | Não abre consentimento; falha de modo controlado. |
| OAU-036 | Usar uma redirect URI que aponte a serviço interno ou IP privado. | BFF nunca realiza fetch para a URI; somente redireciona se a validação completa autorizar. |

## Consentimento, acessibilidade e responsividade

| ID | Cenário e ação | Resultado esperado |
| --- | --- | --- |
| OAU-040 | Abrir consentimento válido. | Exibe `client_id` confirmado, nome/e-mail da sessão e cada scope original com descrição. |
| OAU-041 | Solicitar scope sem tradução conhecida, mas aceito pela API. | Mostra o identificador e uma explicação genérica; não o oculta. |
| OAU-042 | Navegar somente por teclado e ativar permitir/cancelar. | Foco visível, ordem lógica, rótulos claros e ações operáveis. |
| OAU-043 | Verificar com leitor de tela durante o envio. | Estrutura e títulos são anunciados; estado de processamento é comunicado. |
| OAU-044 | Verificar larguras de 320, 768, 1024 e 1440 px e zoom de 200%. | Sem conteúdo ou ações inacessíveis e sem rolagem horizontal indevida. |
| OAU-045 | Tentar carregar `/oauth/consent` em `iframe` de outra origem. | Navegador bloqueia por CSP `frame-ancestors 'none'` e/ou `X-Frame-Options: DENY`. |
| OAU-046 | Clicar repetidamente ou submeter em paralelo permitir/cancelar. | Controles bloqueiam repetição e há um único resultado terminal coerente. |
| OAU-047 | Forjar POST sem `Origin`, com origem diferente ou content type incorreto. | `403` para origem inválida; `415` para mídia inválida; nenhuma chamada upstream. |
| OAU-048 | Incluir scopes ou campos extras no corpo do consentimento. | `400 invalid_request`; scopes nunca são aceitos do navegador. |
| OAU-049 | Abrir a tela com a conta A, trocar para a conta B e tentar permitir. | Nenhum consentimento é gravado diretamente; o fluxo retorna à autorização, revalida a conta B e só então pode apresentar nova decisão. |

## Ciclo de vida, configuração e headers

| ID | Cenário e ação | Resultado esperado |
| --- | --- | --- |
| OAU-050 | Após aprovação registrada, induzir falha transitória na nova autorização e repetir. | Reexecuta a autorização sem gravar o consentimento novamente. |
| OAU-051 | Reutilizar a transação após sucesso, recusa, expiração ou erro terminal. | Cookie foi expirado e a reutilização falha. |
| OAU-052 | Corromper o cookie cifrado ou alterar sua fase/conteúdo. | Transação inválida e limpa; nenhum dado é confiado. |
| OAU-053 | Inspecionar respostas de `/oauth/*` e `/api/oauth/*`, inclusive erros. | `Cache-Control: no-store`, `Referrer-Policy: no-referrer` e `X-Content-Type-Options: nosniff`; páginas também têm CSP e X-Frame-Options. |
| OAU-054 | Iniciar com origem da API contendo path/query/credenciais ou sem HTTPS. | Configuração rejeitada sem expor valor ou segredo. |
| OAU-055 | Em produção, usar `CAPTAGOV_APP_ORIGIN` HTTP; localmente testar host HTTP não-loopback. | Ambos são rejeitados; HTTP local funciona somente em loopback fora de produção. |
| OAU-056 | Omitir o segredo ou usar base64url com tamanho diferente de 32 bytes. | Fluxo OAuth indisponível por configuração inválida; erro público não revela detalhes. |
| OAU-057 | Inspecionar HTML, JavaScript, storage, cookies legíveis, respostas e logs do navegador. | Nenhum token de sessão, token OAuth de terceiro, verifier ou segredo fica exposto. |
| OAU-058 | Rotacionar `OAUTH_TRANSACTION_SECRET` com uma transação aberta. | A transação antiga é invalidada; uma nova autorização funciona normalmente. |
