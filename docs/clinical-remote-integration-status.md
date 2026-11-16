# Estado da integração clínica

Consolidado em 06/11/2026. As decisões abaixo descrevem o código entregue;
o aceite completo autenticado, visual e de infraestrutura continua separado.

## Ambiente e contratos

A origem configurável da API clínica é
`https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com`; o Swagger usa
`/openapi.json`. Os tipos do projeto são gerados dos contratos locais em
[openapi](./README.md#contratos-e-evidências-que-devem-permanecer).
Não atualizar o contrato somente pelo número de versão: a publicação mudou
campos mantendo `0.9.0`. Conferir conteúdo, hashes e validadores de runtime.

O snapshot clínico de 28/10 tem 26 caminhos, 32 operações e 64 schemas. Os novos
campos `tplo_correction`, implantes, diâmetro de lâmina e auditoria já são lidos
e preservados nas escritas de calibração. Antes dessa compatibilidade, um plano
com `tplo_correction: null` gerava 502 `INVALID_RESPONSE`; o usuário confirmou
o carregamento do caso após a correção. Isso não equivale à homologação das
demais funcionalidades publicadas.

Em 29/10, o Swagger continuou em `0.9.0`, mas passou a informar branch `protese`
e revisão `ea242ce`: 27 caminhos, 33 operações, 68 schemas e 176 referências.
O SHA-256 publicado mudou para
`3b5dd9a5134e23c814a07a3b7318bd77f9dfe95873272b309b0ce209501c951c`.
Entraram `viewport`, `image_transform`, `visible`/`locked` nos objetos,
`transformed_fragment_points_px` e `POST /api/v1/images/{image_id}/plan/export`
com resposta PNG. As operações existentes de GET/PUT do plano e os schemas
de geometria/resultado da calibração permaneceram iguais.

O validador estrito anterior recusava os novos campos com `INVALID_RESPONSE`.
Schemas, snapshot, tipos gerados e verificador foram sincronizados. A leitura
aceita a apresentação identidade de um plano na revisão zero; calibração e
comandos de distância preservam os campos estruturados, inclusive resultados,
flags falsas/verdadeiras e contornos transformados. Flags ausentes em respostas
antigas recebem somente os defaults publicados; campos desconhecidos continuam
recusados. Distâncias ocultas não são desenhadas/listadas, e alvos bloqueados
não podem ser alterados/excluídos. O usuário confirmou que o caso voltou a
carregar sem erro após a correção. Controles de recorte/rotação, viewport
persistido e exportação continuam como funcionalidades próprias, sem exposição
nova no front nesta compatibilidade.

Validação dessa compatibilidade: 229 testes direcionados de contrato,
BFF/serviços, comandos, recuperação, rascunhos e workspace aprovados; TypeScript
do web/SDK e verificação de hashes/referências aprovados. Os testes de HTTP e
dados novos são sintéticos; a confirmação do usuário cobre o carregamento do
caso, sem representar aceite operacional dos demais endpoints publicados.

Para verificar somente saúde e presença dos contratos públicos:

```powershell
pnpm --filter web check:clinical-remote
```

O diagnóstico não lê `.env`, não autentica e não cria dados. Saída 0 aprova
somente os GETs públicos; não certifica JWT, CORS, worker ou storage.

## Entregue

| Área | Comportamento |
| --- | --- |
| Identidade | Login/MFA com cookies cifrados HttpOnly; organização validada; troca de token separada; QueryClient por organização; contexto divergente recusado. |
| Casos | Criação idempotente, sexo obrigatório, idade com origem/referência, peso decimal, busca, status, exclusão e renomeação de imagens. |
| Upload | Sessão com Idempotency-Key, múltiplos arquivos, transporte direto, confirmação, bloqueio de duplicatas, cancelamento e recuperação de respostas perdidas. |
| Ingestão | Retomada por imagem/job após refresh, polling compartilhado e retry operacional explícito. |
| Imagens | Estados persistidos, prévia temporária, renovação antes da expiração e exclusão com reconciliação. |
| Planejamento | Calibração linha/círculo, escala por imagem, revisão otimista, rascunhos, proteção de saída/exclusão e conferência de resultado incerto. |
| Ângulo — 05/11 | Habilitado em Medidas: três pontos, leitura oficial, prévia local, edição, olhinho, salvamento e exclusão com confirmação pelo mesmo plano/revisão. Incerteza usa GET sem repetir PUT. Etapas 0–10 implementadas; aceite funcional e ajustes visuais pendentes na [etapa 11](./angle-tool-implementation-plan.md). Nenhum teste funcional/automatizado ou gravação clínica executado nesta entrega. |
| Círculo — 06/11 | Habilitado em Medidas: centro/borda, leitura oficial de raio/diâmetro/circunferência, prévia local, edição, apresentação por UUID, salvamento e exclusão com confirmação pelo plano/revisão. Resposta incerta usa GET e a confirmação captura o rascunho exibido. Etapas 0–10 implementadas, com aceite funcional manual pendente na [etapa 11](./circle-tool-implementation-plan.md). Revisão estática de TypeScript e diff, com a validação no navegador reservada ao usuário. |
| Base TPLO | Comandos limitados por campo, coordenação de gravações e consultas de protocolo/tabela. Ferramentas visível; sem escala, o clique inicia calibração. Qualidade radiográfica é interna. |

As rotas e regras detalhadas estão no [README de casos](../apps/web/src/features/cases/README.md)
e no [contrato de organização](./organization-token-contract.md). A troca clínica
envia JSON `{}`, conforme o contrato suplementar atual; não usar instruções
históricas de POST sem corpo para essa operação upstream.

## Aceite operacional ainda necessário

- Executar a [jornada clínica](./clinical-api-0.9.0-manual-test-checklist.md) com
  dados sintéticos: login/MFA, uma/várias/nenhuma organização, renovação,
  remoção de associação, mudança de papel e isolamento entre tenants.
- Conferir upload real, origens exatas, CORS, worker, estados terminais,
  renovação de prévia, cancelamento, cotas e limpeza física do storage.
- Validar reservas atômicas de conteúdo, concorrência de duplicatas, replay
  idempotente e verificação do SHA-256 contra os bytes armazenados.
- Conferir peso decimal e datas reais no backend, além de renomeação e exclusão.
- Executar o [aceite da calibração](./calibration-acceptance-2026-10-26.md),
  sem interpretar testes DOM/HTTP simulados como validação clínica.
- Validar publicação: `/api/version`, bundle atual e POSTs locais vazios com
  `Content-Type: application/json`. A causa intermediária do 415 histórico
  não foi identificada; a alteração do cliente não prova o deploy.

## Débitos técnicos a revalidar

Uma auditoria de 22/10 identificou os itens abaixo. Foram conservados como
pendências ao retirar os relatórios históricos; esta limpeza não os corrigiu
nem reexecutou a reprodução de cada achado.

| Item | Verificação necessária |
| --- | --- |
| Login social | Confirmar se recusas upstream 401/403 ainda são convertidas em 503 e preservar status/códigos públicos apropriados. |
| MFA já ativo | Conferir setup/verify-setup com 409 MFA_ALREADY_ENABLED, mapeamento público e atualização do status após conflito. |
| Tipos de configurações | Conferir se senha/revogação ainda declaram undefined enquanto os handlers retornam JSON { success: true }. |
| Conta inativa | Confirmar revogação e resposta de /users/me; não presumir que status INACTIVE com HTTP 200 seja tratado como sessão bloqueada. |
| OAuth | Formalizar error: consent_required no 403 e Location no 302, mantendo a validação de cliente, escopos e destino do BFF. |
| Qualidade da verificação | Configurar parsing/cobertura de TS/TSX no ESLint; o erro atual de parsing não constitui lint aprovado. |

## Próximas entregas de produto

Medidas, landmarks, simulação, revisão clínica, finalização e relatórios seguem
o [roadmap TPLO](./tplo-frontend-implementation-study-2026-10-27.md).
O suporte a pixels DICOM não quadrados depende de contrato específico;
manter o bloqueio de anisotropia enquanto ele não existir.
