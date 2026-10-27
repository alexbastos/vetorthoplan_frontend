# Revisão do Swagger publicado — 27/10/2026

**Há atualizações na API clínica, incluindo uma incompatibilidade reproduzida
com o validador atual do BFF.** Esta revisão não promove o contrato canônico,
não regenera tipos e não altera código de produção.

Atualização posterior na mesma data: a incompatibilidade foi corrigida na
**tarefa 1 de compatibilidade**, registrada no
[estudo de integração TPLO](./tplo-frontend-implementation-study-2026-10-27.md).
Os achados abaixo preservam o diagnóstico anterior à correção.

## Fontes e comparação

- [Swagger publicado](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/docs):
  HTTP 200; o HTML continua apontando para `/openapi.json`.
- [OpenAPI clínico publicado](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/openapi.json):
  HTTP 200; 59.260 bytes; SHA-256
  `e04b8d6d7e6046be92a8a35c3ba9f42259dd7ee6a71040b9d28a589d7b0e1c48`.
- Base local: [contrato canônico](./openapi/clinical-api.openapi.json), com
  proveniência e checksums conferidos por `verify-clinical-contract.mjs`.
- [OpenAPI de autenticação publicado](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/docs/authentication_api/json):
  HTTP 200; comparado tanto ao canônico quanto à auditoria de 22/10.

| Contrato clínico | Local | Publicado |
| --- | --- | --- |
| Versão informada | 0.9.0 | 0.9.0 |
| Caminhos | 14 | 18 |
| Operações | 19 | 23 |
| Schemas | 46 | 54 |

Nenhuma operação anterior foi removida ou teve sua definição direta alterada.
As diferenças também aparecem nos schemas referenciados por GET/PUT do plano;
portanto, igualdade da definição da rota não significa igualdade do payload.
A versão permaneceu igual e o `info` clínico não identifica o commit/data deste
deploy: não é possível atribuir as mudanças a um dia específico da publicação.

## Quatro novas operações

| Método e caminho | Contrato publicado |
| --- | --- |
| `GET /api/v1/tplo/clinical-protocol` | Protocolo versionado, definições de medidas e configuração de tolerâncias/aceitação. A resposta distingue protocolo configurado e aceitação habilitada; não equivale a homologação clínica. |
| `GET /api/v1/tplo/rotation-table` | Tabela versionada e origem, com filtros opcionais `tpa_degrees` (0–90) e `blade_diameter_mm` (>0). O Swagger descreve correspondência exata, sem interpolação nem recomendação automática. |
| `POST /api/v1/images/{image_id}/plan/finalize` | Finalização com corpo JSON `{ "base_revision": N }`, `N >= 1`. Retorna versão, revisão, snapshot/hash, autor/data e arquivos de relatório; documenta 404/409/422. |
| `GET /api/v1/images/{image_id}/plan/finalization` | Consulta a finalização e devolve links atualizados dos relatórios. Os arquivos podem ser PNG/PDF, com hash e expiração do link. |

As quatro operações declaram autenticação Bearer. A presença no Swagger não
comprova que protocolo/tabela estejam configurados no ambiente nem que uma
finalização real já funcione; nenhuma delas foi executada com credenciais.

## Mudanças nos schemas existentes

### `PlanDocument`

Novos campos: `radiographic_quality`, `additional_measurements_input` e
`additional_measurements`. Os inputs adicionais incluem pontos nomeados e
valores de referência; os resultados adicionais são objetos abertos no Swagger.

### `TploClinicalMeasurement`

Novos campos: `clinical_protocol_version`, `reference_tpa_degrees`,
`tpa_absolute_error_degrees`, `tpa_max_absolute_error_degrees` e `acceptance`.
Os estados de aceitação publicados são `PASS`, `FAIL`, `NOT_ASSESSED` e
`NOT_CONFIGURED`, com possibilidade de `null`.

### `TploClinicalValidation`

Novo `audit`, com decisão, autor, data, versão de protocolo e referências ao
método/calibração. `required_measurements` passou de três valores enumerados
e limite de 10 itens para strings livres e limite de 50 itens.

Os oito schemas novos são `FinalizeImagePlanRequest`,
`FinalizedImagePlanResponse`, `FinalizedReportFileResponse`,
`TploAdditionalMeasurementInput`, `TploClinicalProtocolResponse`,
`TploClinicalReviewAudit`, `TploRadiographicQuality` e
`TploRotationTableResponse`.

## Incompatibilidade confirmada no BFF

O [schema atual](../apps/web/src/features/cases/schemas/image-plan.schema.ts:43)
usa objetos estritos e ainda não declara esses campos. A lista de medidas
obrigatórias também mantém o enum/limite antigos. O
[projetor do BFF](../apps/web/src/lib/server/image-plan-bff.ts:34) rejeita o plano
antes de prosseguir quando esse schema não o aceita.

Reprodução local com os validadores e funções reais de GET/PUT, imagens e
documentos sintéticos, sem rede:

| Cenário | GET BFF | PUT BFF | Escritas clínicas simuladas |
| --- | --- | --- | --- |
| Controle com documento antigo | 200 | 200 | 1 |
| Novos campos de `PlanDocument`, mesmo vazios/null | 502 `INVALID_RESPONSE` | 502 `INVALID_RESPONSE` | 0 |
| Novos campos de `TploClinicalMeasurement` | 502 `INVALID_RESPONSE` | 502 `INVALID_RESPONSE` | 0 |
| `clinical_validation.audit: []` | 502 `INVALID_RESPONSE` | 502 `INVALID_RESPONSE` | 0 |
| Medida obrigatória fora do enum antigo | 502 `INVALID_RESPONSE` | 502 `INVALID_RESPONSE` | 0 |

**Impacto:** se a API devolver esses campos, o BFF atual pode impedir carregar
ou salvar a calibração, mesmo sem usar as novas funcionalidades na interface.
O teste confirma a incompatibilidade dos contratos, não que um plano real do
ambiente publicado já esteja devolvendo todos esses campos.

Prioridade recomendada: atualizar snapshot/tipos e schemas explícitos do BFF,
preservando os novos campos nas escritas de calibração, e cobrir o novo formato
com testes antes de avançar no aceite geral. Não resolver removendo campos
desconhecidos do plano: PUT substitui o documento completo.

## Autenticação e DICOM

A Authentication API mantém as mesmas 65 operações da auditoria de 22/10, sem
mudanças nas definições dessas operações. O build informado mudou de `8755814`
para `57a8923`, com data declarada de 22/10/2026 22:38:27. A diferença em relação
ao canônico mais antigo continua sendo o endpoint de token de organização,
já conhecido e integrado; não é uma novidade desta consulta.

Não foram encontradas mudanças nos schemas de calibração, `PlanCalibrationResult`
ou `ImageResponse`. Esta publicação não documenta um novo contrato para pixels
DICOM não quadrados; isso não permite concluir se houve alguma mudança interna
de implementação no backend.

## Limites

Somente consultas públicas GET e reprodução sintética local. Nenhum token,
cookie, upload, mutação clínica real ou alteração de `.env` foi usado. As
modificações de trabalho já existentes foram preservadas. A aprovação automatizada
anterior da calibração se referia ao snapshot integrado; não comprova
compatibilidade com este novo contrato publicado.
