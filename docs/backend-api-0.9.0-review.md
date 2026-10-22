# Verificação do backend publicado — API 0.9.0

Consulta em **20/10/2026** ao [OpenAPI oficial](https://cecia.ufsj.edu.br/openapi.json), disponibilizado no [Swagger](https://cecia.ufsj.edu.br/docs#/).

## Resultado

**A equipe publicou uma nova versão e incorporou a maior parte dos pedidos.** O contrato passou de 0.8.0 para **0.9.0**, com **14 caminhos, 17 operações e 38 schemas**. O JSON consultado foi salvo em [snapshot separado](./openapi/clinical-api.published-0.9.0-2026-10-20.openapi.json), preservando as versões anteriores.

Este relatório registra a comparação inicial da publicação 0.9.0. No momento da análise, código e tipos ainda não haviam sido alterados; a implementação e o status atuais estão registrados no [plano por tarefas](./clinical-api-0.9.0-execution-plan.md) e no [estado da integração remota](./clinical-remote-integration-status.md).

## 1. Atendimento aos pedidos enviados

| Pedido | Evidência na versão 0.9.0 | Situação |
| --- | --- | --- |
| Sexo obrigatório | `CreateCaseRequest.sex` obrigatório e não nulo; `UNKNOWN` explicitamente aceito. `CaseResponse.sex` segue anulável para leitura dos registros antigos. | Atendido no contrato. Erros e persistência ainda exigem teste integrado. |
| Nascimento e idade coerentes | Descrição de `approximate_age_months` permite combinação com `birth_date` quando coincidir com a idade calculada em meses completos na criação. `CaseResponse` inclui `age_source` (`DECLARED`/`BIRTH_DATE`/nulo) e `age_reference_date`. | Regra e campos publicados. Exercitar cálculo, divergência 422 e referência de data no ambiente real. |
| Upload no ambiente publicado | Rotas de sessão, confirmação, job e prévia permanecem disponíveis. | Storage, URLs emitidas, CORS, worker e transporte real ainda não foram verificados nesta consulta. |
| Retomar processamento após refresh | `ImageResponse.job_id` adicionado e nova consulta por imagem. | Atendido no contrato. |
| Falhas e recuperação | Catálogos de códigos nas descrições de `error_code`/`rejection_code`; estados de imagem `FAILED`/`CANCELLED`; retry operacional e cancelamento de sessão. | Houve avanço concreto. Mensagens seguras e detalhes de limpeza/expiração remetem também aos guias do backend; não foram verificados aqui. |
| Recuperar sessão após resposta perdida | `Idempotency-Key` agora obrigatório na criação de sessão; mesma chave e metadados recuperam a sessão. | Atendido no contrato; falta validar assinatura expirada, validade da chave e repetição após cancelamento. |
| Excluir imagem | Nova rota DELETE, com efeitos e impedimentos documentados. | Atendido no contrato. |
| Plano e calibração | Calibração por círculo adicionada, metadados TPLO restaurados e dados físicos/orientação DICOM adicionados à imagem. | Parcialmente atendido. Convenções de coordenadas, transformações da prévia, plano inexistente e conflitos precisam de documentação complementar. |
| Autenticação clínica | A descrição informa explicitamente identidade local e ausência de validação Bearer JWT. Não há `securitySchemes` nem requisitos `security`. | Ainda pendente; a API informa não estar pronta para homologação/produção com dados clínicos. |
| Identificação da entrega | Versão passou a 0.9.0. | Parcial: commit/build, branch e data de geração continuam ausentes do JSON. |

Renomeação e duplicação de imagens continuam sem endpoints e dependem de confirmação de escopo.

## 2. Novas operações

| Endpoint | Comportamento publicado |
| --- | --- |
| `GET /api/v1/images/{image_id}/job` | 200 com `{ job: IngestionJobResponse \| null }`; nulo antes da criação do job pela confirmação. 404 se a imagem não estiver disponível. |
| `POST /api/v1/jobs/{job_id}/retry` | Sem corpo; 202 com `IngestionJobResponse`. Reutiliza o mesmo job e arquivo confirmado; apenas `FAILED` pode ser reenfileirado. 409 em estado incompatível. Conteúdo rejeitado exige novo upload corrigido. |
| `DELETE /api/v1/image-uploads/{upload_id}` | 204 ao cancelar sessão `PENDING_UPLOAD` e remover objeto atual. 409 se já confirmada/em processamento. Assinatura não é revogável; envios tardios dependem de limpeza após `expires_at`. |
| `DELETE /api/v1/images/{image_id}` | 204 ao remover original, prévia, plano e registros do job. 409 enquanto job estiver `QUEUED`/`PROCESSING` ou a sessão de upload ainda for válida. |

As quatro operações também documentam 404 e 422. O novo cancelamento da sessão é uma operação distinta da exclusão da imagem persistida.

## 3. Alterações de schema relevantes

- **Casos:** `sex` obrigatório na requisição; `age_source` e `age_reference_date` obrigatórios na resposta, ambos anuláveis. O nome `approximate_age_months` foi preservado.
- **Imagens:** novos campos obrigatórios/anuláveis `job_id`, `pixel_spacing_mm`, `imager_pixel_spacing_mm` e `image_orientation_patient`. Espaçamentos são pares `[linhas, colunas]` em milímetros; orientação contém seis valores.
- **Estados de imagem:** enum passa a incluir `FAILED` e `CANCELLED`, além dos cinco estados anteriores.
- **Calibração:** `PlanCalibration` foi substituído por `PlanReferenceLineCalibration` e `PlanReferenceCircleCalibration`. O círculo usa `center`, `edge` e `known_diameter_mm`, discriminado por `kind = REFERENCE_CIRCLE`.
- **TPLO:** `PlanDocument.tplo` e `TploPlanMetadata` estão novamente presentes; lateralidade e projeção têm descrições explícitas.
- **Peso:** permanece sem `pattern` no ramo string. A versão 0.9.0 não resolve a dúvida anterior sobre formatos de serialização aceitos pelos nossos validadores.

## 4. Impacto imediato no frontend atual

1. **Sessão de upload:** nosso BFF não envia `Idempotency-Key` nessa operação. Pelo contrato novo, essa chamada está incompleta e pode receber 422. Precisamos criar uma chave estável por comando/arquivo e encaminhá-la em novas tentativas da mesma operação, além de mapear o conflito 409 de reutilização da chave.
2. **Criação de caso:** formulário e BFF ainda permitem sexo ausente/nulo. Atualizar obrigatoriedade, payload e tratamento de erro. Casos com sexo já selecionado não têm essa incompatibilidade específica.
3. **Idade:** o BFF ainda rejeita nascimento e idade juntos; atualizar validação, cálculo e projeção dos novos campos de referência/origem até o navegador.
4. **Leitura de imagens:** BFF, serviço do navegador e tipo local aceitam somente os cinco estados antigos. Uma imagem `FAILED` ou `CANCELLED` pode invalidar toda a listagem no BFF. Ampliar schemas, tipos, textos e ações.
5. **Retomada e ações:** propagar `job_id`, recuperar polling após refresh e integrar separadamente retry, cancelamento e exclusão, respeitando os estados permitidos e os 409 publicados.
6. **Planejamento:** incorporar os tipos novos sem habilitar edição clínica antes de esclarecer coordenadas/escala, transformações e concorrência.

## 5. Sequência revisada para implementação

A execução e o estado atual de cada entrega estão no [plano detalhado por tarefas](./clinical-api-0.9.0-execution-plan.md). A sequência abaixo registra a proposta inicial desta análise:

1. **Contrato e compatibilidade obrigatória da criação:** promover o snapshot 0.9.0, atualizar proveniência/verificador e regenerar tipos; ajustar a obrigatoriedade de sexo para manter a aplicação compilando. Aceite: hashes/referências corretos, geração reproduzível, typecheck e testes de criação.
2. **Idempotência da sessão de upload:** gerar/propagar chave estável e tratar recuperação/conflitos. Aceite: resposta perdida permite recuperar a mesma sessão e outros metadados não reutilizam a chave.
3. **Leitura de imagens e retomada:** aceitar `FAILED`/`CANCELLED`, propagar job e recuperar acompanhamento após refresh. Aceite: nenhum estado válido invalida a lista; polling para nos estados terminais.
4. **Nascimento e idade:** alinhar formulário, BFF, cálculo e respostas com origem/referência. Aceite: nascimento apenas, idade apenas, ambos coerentes e divergência 422.
5. **Retry, cancelamento e exclusão:** integrar cada operação em entrega própria. Aceite: usar a operação correta por estado, refletir persistência e tratar 404/409 sem anunciar sucesso indevido.
6. **Conexão remota e validação integrada:** conferir configuração HTTPS, formato do peso, storage/CORS/worker e jornada com dados sintéticos. AUTH-01 e edição clínica continuam com aceite separado.

## 6. Verificação realizada e limites

- Download do OpenAPI oficial: HTTP 200, **39.281 bytes**.
- Comparação com o publicado 0.8.0 anterior: quatro operações adicionadas; criação de sessão passou a exigir cabeçalho; mudanças nos schemas acima.
- **99 referências locais resolvidas**, sem referência quebrada.
- SHA-256 do snapshot: `b1ffad63397979621a9bd73d394ebb9498a6bf3ac28ef0ab0ec5e859b5e6b836`.
- Geração experimental com `openapi-typescript 7.13.0`, somente em arquivo temporário. Typecheck com substituição dos tipos em memória: api-client sem diagnósticos; web com **dois diagnósticos**, em `new-case-request.ts` e `case-create-bff.ts`, pelo sexo ainda anulável/opcional.
- Não executamos criação, upload, retry, cancelamento ou exclusão no servidor. O atendimento foi verificado pelo contrato, sem certificar o comportamento operacional.

**Conclusão:** esta atualização é substancial e permite avançar. O próximo trabalho deve usar **0.9.0** como referência e contemplar as incompatibilidades novas; o plano anterior de apenas regenerar os tipos 0.8.0 deixou de ser suficiente.
