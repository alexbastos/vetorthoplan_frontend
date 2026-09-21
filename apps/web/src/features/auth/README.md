# Feature de autenticação

Esta feature contém exclusivamente os contratos e a interface de autenticação do navegador.

Os fluxos públicos usam o `AuthPageShell` no layout compartilhado de autenticação. Cada rota renderiza seu formulário, e os hooks da feature cuidam da validação e das chamadas ao BFF. O login tem um coordenador compartilhado para senha, Google e MFA.

- `components/shell/`: moldura compartilhada, contexto de entrada e artwork do fluxo de recuperação.
- `components/forms/`: formulários de login, cadastro, recuperação e redefinição de senha, além do botão Google e da interface compartilhada de MFA.
- `components/navigation/`: navegação interna dos fluxos públicos de autenticação.
- `components/status/`: estados transitórios e finais dos fluxos, como a criação de conta e a confirmação de envio de e-mail.
- `components/showcase/`: elementos visuais do painel de oportunidades, isolados dos formulários.
- `hooks/`: coordenação dos formulários, chamadas ao BFF e leitura de sessão. `useLogin` cuida somente do primeiro fator por senha; `useMfaLoginChallenge` conclui o fluxo de autenticação.
- `lib/`: utilitários puros da feature, como validação e normalização do retorno pós-login.
- `schemas/`: validação Zod próxima a cada formulário.
- `services/`: único ponto client-side para chamadas relativas a `/api/auth/*`.
- `types/`: contratos públicos e sanitizados usados entre o navegador e o BFF.

O BFF, os cookies e os tokens de sessão permanecem em `src/lib/server/` e nunca podem ser importados por esta feature.

## Login com autenticação em duas etapas

O login com senha e o login social retornam o mesmo resultado discriminado:
`authenticated`, quando a sessão já foi criada, ou `mfa_required`, quando ainda
falta o segundo fator. O BFF nunca devolve access ou refresh tokens à aplicação
no navegador; depois da autenticação completa, eles são cifrados e autenticados
antes de serem persistidos em cookies `HttpOnly`.

O BFF devolve somente o token temporário do desafio e os métodos autorizados pela
Authentication API (`TOTP`, `EMAIL` ou `RECOVERY`). O
`useMfaLoginChallenge` mantém esse token em uma referência privada, sem expô-lo
ao contexto React ou aos formulários. O token não pode ser salvo em URL,
storage, cookie ou cache de requisições.

A interface mostra apenas os métodos recebidos. O coordenador descarta o desafio
ao concluir a autenticação, quando o usuário volta, quando o provedor é
desmontado ou quando a API informa um erro terminal. Respostas atrasadas de um
desafio descartado são ignoradas.

O botão Google usa o mesmo fluxo nas telas de login e cadastro. O método
`authenticate` concentra o resultado do primeiro fator, a apresentação dos
erros e o redirecionamento final.

Quando o login foi iniciado por `/oauth/authorize`, o destino contém somente o
ID opaco da transação temporária. Senha, Google e MFA preservam o mesmo destino
no coordenador compartilhado. Após a autenticação completa, o navegador faz uma
navegação de documento para o Route Handler OAuth, que recupera do cookie
`HttpOnly` a solicitação original e resolve novamente a sessão antes de
continuar. Parâmetros OAuth brutos e tokens de sessão não entram no estado React.

As rotas `/api/auth/mfa/verify` e `/api/auth/mfa/email-code` são os únicos pontos
de comunicação do navegador para concluir o desafio ou solicitar o código por
e-mail.

## Política de senha

Toda senha nova — no cadastro, na redefinição ou na troca autenticada — passa
pela política pura de `src/lib/password-policy.ts`. A política exige no mínimo
8 caracteres, no máximo 72 bytes em UTF-8, letras maiúscula e minúscula, número,
caractere especial e ausência de espaços. Os schemas dos formulários apresentam
mensagens localizadas; os schemas do BFF reutilizam a mesma decisão booleana e
impedem que uma chamada direta contorne as regras do navegador.

A troca autenticada também exige que a senha nova seja diferente da atual. O
login não reaplica a política de criação, pois uma credencial existente pode ter
sido criada sob regras anteriores; nessa entrada, o BFF aceita de 8 a 1024
caracteres conforme o contrato da Authentication API.

## Recuperação de senha

`forgot-password` mantém a propriedade de não enumeração da Authentication API:
uma solicitação sintaticamente válida recebe a mesma confirmação exista ou não
uma conta. Apenas falhas operacionais e o limite documentado de 3 solicitações a
cada 15 minutos são apresentados como erro. O link enviado pela API expira em
1 hora.

Na redefinição, o token é lido do link, removido da URL após a hidratação e usado
pelo hook por meio de uma referência privada, sem persistência em storage,
cookie ou cache de requisição. Ele é descartado junto com os campos de senha
após sucesso, link inválido ou desmontagem. Um link inválido retorna o usuário à
solicitação de recuperação; o sucesso o encaminha ao login.

A Authentication API revoga todas as sessões ativas depois da redefinição. Na
mesma resposta de sucesso, o BFF expira os cookies locais da sessão cifrada
para que o navegador não conserve uma sessão já revogada.

## Sessão, renovação e logout

Access e refresh tokens são cifrados separadamente com AES-256-GCM antes de
serem persistidos. Os cookies contêm somente ciphertext autenticado, usam
`HttpOnly`, `SameSite=Lax`, prioridade alta e escopo `/`; em produção também usam
`Secure` e prefixo host-only. A finalidade e o prazo de 15 minutos ou 7 dias
fazem parte dos dados autenticados, impedindo troca entre access e refresh ou
extensão client-side da validade. O proxy verifica apenas a presença do cookie
cifrado e funciona como barreira de navegação. A autorização definitiva sempre
ocorre no servidor pela Authentication API.

A chave de sessão existe somente no runtime do BFF. Uma chave anterior pode ser
aceita temporariamente durante rotação; após uma leitura válida, a próxima
resposta mutável reemite ambos os cookies com a chave atual. Cookies legados em
texto puro não são aceitos nem usados como fallback.

Quando o access token recebe `401`, o BFF pode rotacionar o refresh token e
repetir a operação com o novo Bearer. Requisições paralelas que apresentam o
mesmo refresh token compartilham uma tentativa por processo, identificada
somente pelo hash da credencial, com uma janela curta para a propagação dos
novos cookies. Essa coordenação deve migrar para o backend ou um armazenamento
compartilhado antes de executar a aplicação em múltiplas réplicas.

Uma rejeição definitiva da credencial limpa os cookies; falhas transitórias de
rede ou `5xx` preservam a sessão local para permitir nova tentativa. Cookies
rotacionados são aplicados à resposta mesmo quando a operação autenticada
subsequente falha.

O logout valida a origem da requisição e tenta revogar a família remota com um
Bearer válido. Se o access token expirou ou está ausente, o refresh token pode ser
rotacionado apenas para concluir a revogação; essas novas credenciais não são
persistidas. Em uma requisição de origem legítima, os cookies locais são
expirados mesmo se o serviço remoto estiver indisponível. Uma origem inválida é
rejeitada e não pode forçar o logout do usuário.

No navegador, `useLogout` cancela consultas em andamento antes de chamar o BFF.
Depois do sucesso, o cache em memória é descartado, as demais abas da mesma
origem são notificadas por `BroadcastChannel` e `localStorage`, e a navegação
para `/login` recarrega o documento. Se houver edições não salvas, o fluxo usa
a confirmação compartilhada antes de iniciar o logout.

## Contrato de erros

Falhas do BFF expõem somente `code` e `retryable`. Textos humanos não fazem
parte do contrato HTTP. O hook `useAuthErrorNotification` concentra o
mapeamento de códigos para títulos e descrições localizados.
