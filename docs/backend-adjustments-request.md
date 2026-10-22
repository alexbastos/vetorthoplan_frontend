# Ajustes solicitados ao backend

**Atualização de atendimento:** a equipe publicou a versão **0.9.0** após o envio deste documento. Veja o [resultado da verificação](./backend-api-0.9.0-review.md); os pedidos abaixo preservam o registro enviado com base na versão anterior.

Base: [OpenAPI oficial 0.8.0 — snapshot consultado em 20/10/2026](./openapi/clinical-api.published-2026-10-20.openapi.json), publicado em `https://cecia.ufsj.edu.br/openapi.json`.

**Alterar** indica rota existente. **Adicionar — proposta** indica rota ausente no contrato, cujo desenho deve ser confirmado pela equipe.

## Prioridade para concluir a integração atual

### 1. Exigir sexo na criação do caso

**Alterar:** `POST /api/v1/cases` — schema `CreateCaseRequest`.

- Incluir `sex` em `required` e remover a possibilidade de `null` na requisição.
- Retornar 422 pelo schema existente `CreateCaseValidationErrorResponse`, identificando `sex` em `details.errors[].field` para erros estruturais.
- Confirmar se `UNKNOWN` continuará aceito.

Preservar a leitura de casos antigos com sexo ausente em `CaseResponse`.

### 2. Ajustar nascimento e idade

**Alterar:** `POST /api/v1/cases` — `CreateCaseRequest`; resposta 201 e `GET /api/v1/cases/{case_id}` — `CaseResponse`.

- Aceitar somente `birth_date`, somente `approximate_age_months` ou ambos quando coerentes; substituir a regra atual de exclusão mútua.
- Com nascimento informado, calcular a idade pela data; com idade apenas, preservar a informação declarada sem criar um nascimento fictício.
- Se os dois divergirem, retornar 422 `CASE_VALIDATION_ERROR` com `details.field = approximate_age_months`.
- Documentar o cálculo em meses completos e devolver a origem e a data de referência da idade em `CaseResponse` (nomes dos novos campos a alinhar).

A interface usará **Idade**, com anos e meses. O payload pode continuar em meses; renomear `approximate_age_months` para `age_months` depende de alinhamento do contrato.

### 3. Validar o upload no ambiente publicado

**Validar configuração das rotas existentes:**

| Endpoint | Resultado esperado |
| --- | --- |
| `POST /api/v1/cases/{case_id}/image-uploads` | 201 com `ImageUploadResponse.upload.url` acessível pelo navegador em HTTPS. |
| `POST /api/v1/image-uploads/{upload_id}/complete` | 202 após envio válido ao storage, com `job_id` e `job_status`. |
| `GET /api/v1/jobs/{job_id}` | Processamento evolui até um estado terminal. |
| `GET /api/v1/images/{image_id}/preview` | 200 com `ImagePreviewResponse.url` acessível em HTTPS para imagem com prévia disponível. |

- Configurar bucket, CORS para a origem do frontend e worker de ingestão.

Não é necessário criar uma rota de transporte: o arquivo segue diretamente para o storage. O upload no novo ambiente ainda precisa ser testado.

### 4. Permitir retomar e recuperar o processamento

| Ação | Endpoint | Ajuste solicitado |
| --- | --- | --- |
| Alterar | `GET /api/v1/cases/{case_id}/images` e `GET /api/v1/images/{image_id}` | Adicionar `job_id: UUID \| null` em `ImageResponse`; nulo enquanto não houver job. Permite retomar a consulta após recarregar a página. |
| Documentar | `GET /api/v1/jobs/{job_id}` e consultas de imagem acima | Publicar catálogo de `IngestionJobResponse.error_code` e `ImageResponse.rejection_code`, ações de recuperação e estado da imagem após `FAILED`. |
| Adicionar — proposta | `POST /api/v1/jobs/{job_id}/retry` | Sem corpo; 202 com o job agendado. Definir elegibilidade, repetição segura e se reutiliza o job ou cria outro. Usar 404 para job indisponível e 409 para estado incompatível. |
| Alterar — proposta | `POST /api/v1/cases/{case_id}/image-uploads` | Aceitar `Idempotency-Key` para recuperar a sessão se a resposta 201 se perder; documentar validade da chave, expiração da assinatura e liberação da cota. |

A confirmação em `POST /api/v1/image-uploads/{upload_id}/complete` já é idempotente. Repeti-la não equivale a solicitar retry de um job que falhou.

### 5. Disponibilizar exclusão de imagem

**Adicionar — proposta:** `DELETE /api/v1/images/{image_id}`.

- Sem corpo; resposta sugerida 204 para exclusão concluída, 404 para imagem indisponível e 409 quando o estado impedir a operação.
- Definir o efeito sobre original, prévia, job e plano, inclusive durante processamento.

Renomeação e duplicação dependem de confirmação de escopo antes de propor novas rotas.

## Antes de integrar planejamento e autenticação

### 6. Completar as definições do plano

**Alterar/documentar:** `GET /api/v1/images/{image_id}/plan` e `PUT /api/v1/images/{image_id}/plan` — `ImagePlanResponse`, `SaveImagePlanRequest`, `PlanDocument` e `PlanCalibration`.

- Documentar origem/eixos das coordenadas, resposta para plano inexistente e conflitos 409 de revisão.
- Definir calibração por círculo em `PlanCalibration`, que hoje admite apenas `REFERENCE_LINE`, e a representação de incidência/lateralidade no plano.
- Confirmar a retirada de `PlanDocument.tplo` e `TploPlanMetadata` do contrato publicado; estavam no snapshot anterior usado pelo frontend.

**Complementar:** `GET /api/v1/images/{image_id}` e `GET /api/v1/images/{image_id}/preview` — documentar relação entre original e prévia, orientação e espaçamento físico dos pixels DICOM; adicionar os dados necessários aos schemas de resposta quando ausentes.

### 7. Publicar o contrato de autenticação clínica

**Alterar:** operações clínicas de `/api/v1/cases`, `/api/v1/image-uploads`, `/api/v1/jobs` e `/api/v1/images`, incluindo suas subrotas.

- Definir `components.securitySchemes` e aplicar `security` às operações protegidas.
- Documentar token aceito pelo backend via BFF, emissor, audiência, permissões, tenant ativo e respostas 401/403.
- Substituir a identidade local antes de homologação/produção. Este pedido não pressupõe criar rotas de login na API clínica.

## Entrega esperada

OpenAPI atualizado com versão e identificação do commit implantado, indicando quais pedidos foram atendidos e quais continuam pendentes.
