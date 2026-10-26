# Solicitação ao backend: bloquear arquivos duplicados no mesmo caso

Data: 23/10/2026. Status: código de erro publicado no OpenAPI e integrado ao
frontend; aceite operacional das regras abaixo ainda pendente.

O frontend já compara o SHA-256 dos arquivos da fila atual e bloqueia cópias antes de criar outro upload, mesmo quando os nomes são diferentes. Precisamos complementar essa proteção na API para cobrir recarregamentos, outras abas, outros usuários e requisições simultâneas.

## Rota existente a ajustar

`POST /api/v1/cases/{case_id}/image-uploads`

Manter o contrato de criação, o `Content-Type: application/json`, o header `Idempotency-Key` e os campos existentes: `original_filename`, `media_type`, `size_bytes` e `sha256`. Não é necessário criar outra rota para consultar duplicatas: a verificação precisa fazer parte da criação da sessão.

## Regra proposta

- Comparar o SHA-256 do arquivo original dentro do mesmo caso e da organização autorizada. O nome do arquivo não define duplicidade.
- Bloquear quando houver uma sessão ativa para o mesmo conteúdo ou uma imagem persistida e não excluída, inclusive em processamento ou pronta. Para uma imagem `FAILED`, utilizar o retry do processamento existente; para `REJECTED`, orientar a revisão/remoção do arquivo antes de outro envio idêntico.
- Permitir o mesmo arquivo em casos diferentes, respeitando a autorização de cada caso.
- Liberar uma nova seleção após cancelamento confirmado, expiração de uma sessão não confirmada ou exclusão efetiva da imagem. Uma sessão cujo recebimento já foi confirmado não deve liberar a reserva apenas porque a assinatura de upload expirou.
- Tratar arquivos com bytes diferentes como conteúdos diferentes, mesmo que tenham o mesmo nome. Reconhecimento visual de fotos reexportadas ou recomprimidas fica fora deste pedido.

## Resposta proposta para duplicata

HTTP `409 Conflict`, usando o envelope de erro da API clínica:

```json
{
  "code": "IMAGE_UPLOAD_DUPLICATE",
  "message": "Este arquivo já foi adicionado a este caso.",
  "details": {
    "existing_image_id": "UUID da imagem existente"
  }
}
```

`existing_image_id` é opcional e só deve ser retornado após validar acesso à organização e ao caso. Não retornar URLs assinadas, caminhos de storage ou dados de outros casos. Não criar outra imagem, sessão, assinatura ou job para a requisição recusada.

O BFF agora preserva `409 IMAGE_UPLOAD_DUPLICATE` como erro não repetível,
sem repassar mensagem, trace ou detalhes do backend. A fila converte esse código
para o mesmo estado de duplicata local: texto curto “Arquivo duplicado”, aviso
Sonner com a explicação existente e remoção automática da linha após quatro
segundos. Criação do caso e modal do painel usam essa mesma fila. A cópia
recusada não recebe identidade de upload, não transporta bytes e não cancela
ou exclui a imagem existente. Os demais conflitos continuam distintos.

Contrato publicado preservado em
`openapi/clinical-api.duplicate-2026-10-23.openapi.json`, promovido ao snapshot
canônico e aos tipos gerados, com proveniência verificada. A publicação também
acrescentou schemas de cálculo/calibração/TPLO aos tipos; esta integração não
implementa novas ferramentas de planejamento.

Verificação: 277 testes automatizados aprovados, incluindo quatro novos testes
atravessando serviço do navegador, adapter BFF e transporte HTTP simulado. Eles
cobrem uma fila nova com imagem persistida fora dela, erro com/sem ID da imagem,
preservação dos dados existentes, aviso e remoção local, cancelamento durante a
recusa e recuperação de falha com a mesma chave. Isso não comprova atomicidade
da persistência nem substitui os critérios de aceite reais abaixo.

## Concorrência, integridade e idempotência

A checagem e a reserva de conteúdo devem ser atômicas na persistência: duas requisições com chaves diferentes para o mesmo caso e SHA-256 não podem criar duas imagens. Uma consulta seguida de inserção sem proteção concorrente não cobre esse cenário.

Preservar o replay idempotente antes de aplicar a regra de duplicidade: a mesma chave com o mesmo payload deve recuperar a sessão original conforme o contrato existente, inclusive após perda da resposta. Não transformar esse replay em erro de duplicata. A mesma chave com payload diferente continua seguindo a regra atual de conflito de idempotência.

A assinatura informada pelo cliente é usada para a reserva inicial, mas a confirmação/processamento deve verificar que ela corresponde aos bytes armazenados. A falha de integridade deve continuar sendo tratada pelo fluxo de validação do upload, sem aceitar conteúdo diferente com uma assinatura declarada falsa.

## Critérios de aceite

1. Mesmo conteúdo com outro nome, no mesmo caso: primeiro envio aceito e segundo `409 IMAGE_UPLOAD_DUPLICATE`, inclusive após recarregar a página.
2. Mesmo conteúdo enviado simultaneamente em duas abas ou por dois usuários autorizados: apenas uma sessão nova.
3. Replay da primeira solicitação com a mesma chave e payload: sessão original, sem duplicar e sem novo erro de duplicata.
4. Mesmo nome com conteúdos diferentes: ambos permitidos.
5. Mesmo conteúdo em casos diferentes: permitido para quem tem acesso.
6. Cancelamento, expiração sem confirmação e exclusão efetiva liberam a reserva; cancelamento incerto e imagem já confirmada continuam protegidos.
7. Erros de autorização não revelam a existência de imagens em outros casos ou organizações.
8. Publicar o novo código, as regras de estados e exemplos de `409` no OpenAPI para atualizar os tipos e o tratamento no BFF.
