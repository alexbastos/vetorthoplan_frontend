# Feature de Configurações

Esta feature concentra a interface de configurações da conta em `/app/settings`.
O navegador acessa a conta exclusivamente pelas rotas em `/api/settings`; tokens
de sessão e chamadas para a Authentication API permanecem no BFF.

## Perfil

O fluxo usa `POST /api/settings/profile` para carregar o usuário atual e
`PUT /api/settings/profile` para atualizar os campos editáveis. O corpo da
atualização deriva do contrato OpenAPI e contém somente:

- `name`, `phone`, `birthDate`, `bio`, `locale` e `timezone`;
- `address.street`, `address.city`, `address.state`, `address.zipCode` e
  `address.country`.

Campos opcionais vazios são enviados como `null`. E-mail, função, status e URL
do avatar não fazem parte desse corpo. O avatar possui endpoints próprios.

As respostas do perfil são validadas em runtime e projetadas antes de chegar ao
navegador. Propriedades que a tela não consome são descartadas. Perfil e
Preferências compartilham o mesmo formulário e o mesmo cache; atualizações
externas preservam campos locais ainda não salvos.

## Avatar

O upload usa `POST /api/settings/avatar` com `multipart/form-data` e o campo
`avatar`. A política atual aceita PNG e JPEG de até 5 MB. Navegador e BFF
verificam tamanho, MIME e assinatura binária; a Authentication API mantém a
validação definitiva do conteúdo.

A URL retornada para avatares armazenados internamente é pré-assinada e válida
por sete dias. O perfil é atualizado quando a tela é remontada. Se a imagem
falhar, a interface tenta renovar a URL uma vez e usa as iniciais como fallback,
sem criar ciclos de requisição.

`DELETE /api/settings/avatar` segue a semântica idempotente do contrato: `200`
significa que o avatar foi removido ou já estava ausente. Um `404` remoto indica
que o usuário autenticado não existe mais e não deve ser tratado como sucesso.

## Sessões e dispositivos conectados

`POST /api/settings/sessions` lista as sessões ativas sem expor access ou refresh
tokens. A resposta da Authentication API é validada em runtime no BFF e
novamente no cliente antes de entrar no cache. O schema exige identificador,
datas ISO com fuso, indicador booleano da sessão atual e a nulabilidade
documentada dos metadados de dispositivo, IP, User-Agent e localização. Campos
extras são descartados; uma resposta inválida se torna uma falha operacional
segura em vez de dados parciais na interface.

`DELETE /api/settings/sessions/{sessionId}` recebe um identificador limitado e
passa pelo mesmo fluxo autenticado e pela proteção de origem das demais rotas de
configurações. A Authentication API é a autoridade que garante que a sessão
pertence ao usuário. O BFF trata `204` e `404` como sucesso idempotente: uma
sessão ausente já satisfaz o estado final e sua existência anterior não é
revelada ao navegador.

A interface não oferece revogação para a sessão atual e exige confirmação
explícita para outro dispositivo. Enquanto a operação está em andamento, novas
revogações, o fechamento do diálogo e cliques repetidos ficam bloqueados. Depois
do sucesso, a linha é removida, o foco retorna à seção e a consulta é
revalidada com o servidor.

## Erros e traduções

Falhas das rotas atravessam o navegador apenas como `code` e `retryable`; textos
e detalhes remotos não são expostos. `useSettingsErrorMessage` é o único seam
entre esses códigos e a mensagem localizada exibida pela feature.

As mensagens ficam em `src/i18n/messages/pt-BR/settings.json` e
`src/i18n/messages/en/settings.json`. Novas chaves devem ser adicionadas aos dois
arquivos no mesmo conjunto e com os mesmos parâmetros de interpolação.
