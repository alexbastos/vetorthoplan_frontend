# Plano de implementação — Referências anatômicas e TPA

Status em 10/11/2026: etapas 0 a 10 concluídas. Contrato e ambiente conferidos;
schemas, transporte, recuperação, rascunho, visualizador, leitura, posicionamento,
ajuste/prévia, card/salvamento e remoção implementados. A entrada para criar/editar
referências está habilitada em Planejamento, com os bloqueios existentes.
Etapa 11 pendente: aceite manual integrado pelo usuário.
Avançar uma etapa por vez, revisando a entrega antes da próxima.
Os testes de interação e de ponta a ponta serão manuais, pelo usuário, após a
integração completa, conforme combinado. Checagens estáticas acompanham as alterações.

## Objetivo e limites

Integrar o conjunto de referências anatômicas da imagem: posicionar os quatro
pontos, ajustar, salvar, reabrir, consultar o TPA oficial e remover o conjunto.
O backend permanece responsável pelo resultado persistido.

- `tplo_landmarks` é um campo único do documento, com método e quatro pontos.
  Não é um objeto `ANGLE`, não tem UUID próprio e não permite conjuntos arbitrários.
- O resultado vem de `tplo_measurement`, separado da entrada editável.
- Usar o plano, o writer, a revisão e o bloqueio já compartilhados por imagem.
- Um rascunho com alterações por imagem, coordenado com todas as ferramentas.
- Manter Ferramentas com acesso direto; acrescentar Referências anatômicas sob
  o rótulo Planejamento, usando `CasePanelChoice`, sem uma página intermediária.
- Reutilizar o card escuro no quadro: valor, identificação dos pontos, ajustes,
  exibição e exclusão. Mover pelo corpo da marcação, sem botão Mover.
- X/check permanecem junto à marcação, ocultos durante arraste/setas.
- Calibrar/recalibrar continua encaminhando para Distância na linha salva.
  Referências não substituem essa linha nem alteram a escala.

Ficam fora: medidas clínicas adicionais, osteotomia/simulação, implantes,
edição de inclinação-alvo, presets de TPA, revisão/aprovação clínica, relatórios,
detecção automática de pontos, autosave e histórico de undo/redo.

## Contrato levantado em 09/11/2026

Fontes: [OpenAPI público](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/openapi.json)
e [Swagger](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/docs).
Versão `0.9.0`, branch `protese`, commit anunciado `ea242ce`.
Nenhuma gravação clínica foi executada neste levantamento.

| Entrada | Regra publicada |
| --- | --- |
| Campo | `PlanDocument.tplo_landmarks`, opcional/nulo. |
| Método padrão | `MEDIAL_CONDYLE_CRANIAL_CRUCIATE_FULL_AXIS_V1`. |
| Outro método aceito | `CONVENTIONAL_FULL_MECHANICAL_AXIS_V1`. |
| Pontos obrigatórios | `plateau_cranial`, `plateau_caudal`, `intercondylar_midpoint`, `talus_center`. |
| Coordenadas | `PlanPoint.x/y` entre 0 e 1, na matriz original. |
| Leitura | `GET /api/v1/images/{image_id}/plan`. |
| Salvamento | `PUT` na mesma rota com `{ base_revision, document }`. |
| Remoção | Limpar o campo do conjunto pelo mesmo PUT; sem endpoint DELETE próprio publicado. |

| Resultado `tplo_measurement` | Regra publicada |
| --- | --- |
| Método e estado | `method` e `status` obrigatórios. |
| Estados | `CALCULATED`, `LANDMARKS_REQUIRED`, `IMAGE_DIMENSIONS_REQUIRED`. |
| TPA | `tpa_degrees`, opcional/nulo, entre 0 e 90 graus. |
| Comprimentos | `plateau_length_mm`, `tibial_axis_length_mm`, opcionais/nulos, positivos quando presentes. |
| Identificação | `calibration_id` e `clinical_protocol_version`, opcionais/nulos. |
| Conferência | Referência de TPA, erro absoluto e tolerância são opcionais/nulos. |
| Aceitação | `PASS`, `FAIL`, `NOT_ASSESSED`, `NOT_CONFIGURED`, opcional/nulo. |
| Validação clínica | `clinically_validated` permanece `false` no contrato publicado. |

O schema não documenta a fórmula do TPA, os casos degenerados ou todas as
dependências de escala. A fonte dessas regras foi conferida na etapa 0 abaixo.
A prévia precisa reproduzir essa fonte; não copiar o cálculo de Ângulo por analogia.

Os quatro identificadores vêm de `TploLandmarks`. O protocolo clínico fornece
configurações versionadas; seu campo aberto `measurements` não autoriza inventar
ou substituir esses identificadores. A consulta pública ao protocolo retornou
401; a consulta autenticada fornecida pelo usuário confirmou `configured=false`.
Protocolo não configurado e falha de autenticação são estados distintos.

## Reaproveitamento da arquitetura

Os caminhos abaixo são relativos a `apps/web/src/`. Nomes de módulos novos
são propostas; criar somente conforme as responsabilidades forem implementadas.

| Responsabilidade | Ponto de extensão |
| --- | --- |
| Leitura e entrada | `features/cases/schemas/image-plan.schema.ts`; já lê `tplo_landmarks` e `tplo_measurement`. |
| Comandos e merge | `features/cases/schemas/image-plan-command.schema.ts`. |
| Rota, serviço e BFF | `app/api/cases/[caseId]/images/[imageId]/plan/edits/route.ts`, `features/cases/services/image-plan-api.ts`, `lib/server/image-plan-bff.ts`. |
| Writer e recibos | `features/cases/lib/image-plan-saving.ts`, `calibration-save-state.ts`; sem writer paralelo. |
| Rascunho e locks | `image-plan-draft.ts`, `hooks/use-image-plan-drafts.ts`, `use-workspace-draft.ts`, `cases-query-keys.ts`. |
| Protocolo autenticado | `services/tplo-reference-api.ts`, `schemas/tplo-reference.schema.ts`, `lib/tplo-reference-query-options.ts`, rota `/api/cases/tplo/clinical-protocol`. |
| Domínio novo | `landmarks-editor.ts`, `landmarks-result.ts`, `landmarks-geometry.ts`, `landmarks-draft.ts`. |
| Estado novo | `hooks/use-image-landmarks.ts`, com o padrão de escopo e captura de Ângulo/Círculo. |
| Interação e desenho | `viewer-editor.ts`, `case-image-viewer.tsx`, `image-point-space.ts`; canal e overlay próprios para referências. |
| Apresentação | `ViewerMeasurementCard`, `ViewerMeasurementSection`, `ViewerMeasurementAction`, `ViewerMeasurementVisibility`, `ViewerEditActions` e `CasePanelChoice`. |
| Composição | `case-image-workspace.tsx`, `case-image-tools-panel.tsx`, `use-image-display-settings.ts` e traduções pt-BR/en. |

Fluxo previsto:

```text
Referências → rascunho → comando restrito → writer compartilhado
  → PATCH same-origin /plan/edits → merge de tplo_landmarks no BFF
  → PUT upstream com base_revision → confirmação → cache e resultado oficial
```

Comandos propostos, exclusivos do BFF:

- `landmarks-set`: `baseRevision` e o conjunto completo de método/quatro pontos.
- `landmarks-clear`: `baseRevision`, para remover o conjunto inteiro.

Não adicionar esses endpoints à API remota, um UUID fictício ao conjunto,
resultados calculados pelo navegador ao payload, cache paralelo do plano ou
armazenamento clínico em localStorage/sessionStorage.

## Etapas de implementação

### 0. Fixar semântica, método e dependências

- Conferir a fonte do backend na revisão anunciada ou exemplos desidentificados
  para fórmula, orientação, intervalo, degeneração e significado dos dois métodos.
- Confirmar a serialização dos quatro pontos, resultado sem escala, comprimentos
  em mm, recalibração e remoção. Não inventar `CALIBRATION_REQUIRED` para o resultado
  de TPA: esse estado não consta de `TploClinicalMeasurement`.
- Conferir dimensões originais, DICOM e anisotropia. Preservar a proteção existente
  até haver evidência de suporte; separar dependências do ângulo e dos comprimentos.
- Usar a consulta autenticada de protocolo já existente para verificar versão,
  configuração e tolerâncias. Não pedir cookies/tokens ao usuário.
- Registrar rótulos, método inicial e permissões de troca. Preservar o método de
  referências já salvas; não reinterpretá-las silenciosamente.

**Entrega:** decisões e evidências registradas neste documento. Se a configuração
autenticada não puder ser lida, registrar o limite; não tratar a consulta como concluída.

#### Evidência da etapa 0 — revisão de fonte

O OpenAPI foi consultado novamente e continua anunciando `0.9.0`, branch
`protese`, commit `ea242ce`. A fonte primária foi lida diretamente na revisão
completa `ea242ce971412f371c8004d64630289055b53ad4`, já identificada nas integrações
anteriores. Não houve checkout, instalação, execução do backend ou gravação clínica.

- [Schemas: TploLandmarks e TploClinicalMeasurement](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/api/schemas.py#L614).
- [Geometria e resultado de TPA](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/domain/planning/measurements.py#L135).
- [Aceitação do TPA](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/domain/planning/measurements.py#L384).
- [Persistência e regras de revisão](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/application/use_cases/image_plans.py#L104).
- [Serialização do PUT](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/api/routes/plans.py#L189).
- [Modelo do protocolo clínico](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/domain/planning/clinical_protocol.py#L32).
- [Consulta autenticada do protocolo](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/api/routes/tplo.py).

#### Fórmula e espaço de coordenadas

Definições para a implementação futura, com largura `W` e altura `H` da matriz
original, nunca da miniatura ou da área exibida:

```text
p = ((plateau_caudal.x - plateau_cranial.x) * W,
     (plateau_caudal.y - plateau_cranial.y) * H)
a = ((talus_center.x - intercondylar_midpoint.x) * W,
     (talus_center.y - intercondylar_midpoint.y) * H)

dot = p.x * a.x + p.y * a.y
cross = p.x * a.y - p.y * a.x
TPA = atan2(abs(dot), abs(cross)) * 180 / pi
```

- A fonte calcula TPA entre 0° e 90°, não orientado. Ele corresponde ao
  complemento do ângulo agudo entre as direções dos dois segmentos.
- Inverter uma das duplas, transladar o conjunto ou espelhar a apresentação
  não altera o TPA. Espelhamento visual não muda as coordenadas persistidas.
- Platô perpendicular ao eixo produz 0°; segmentos paralelos produzem 90°.
  Não rejeitar paralelismo ou o valor 0° usando a regra de comprimento positivo.
- Diferentemente de `ANGLE`, TPA converte cada eixo para pixels antes do cálculo.
  O helper de Ângulo opera sobre diferenças normalizadas e não pode ser reutilizado
  como fórmula de TPA em imagens retangulares.
- Usar `hypot` para os dois comprimentos e a mesma ordem de operações do servidor.
  A precisão persistida não é arredondada para a precisão do rótulo.

Casos analíticos sintéticos, deduzidos da fonte e **não executados**:

| Vetores/condição | Resultado deduzido |
| --- | --- |
| `p=(600,0)`, `a=(0,600)` | 0°. |
| `p=(0,600)`, `a=(0,300)` | 90°. |
| `p=(500,500)`, `a=(0,500)` | 45°. |
| Mesmas diferenças normalizadas `(0,5;0,5)` e `(0;0,5)`, com `W=2000`, `H=1000` | `p=(1000,500)`, `a=(0,500)`: aproximadamente 26,565051°. |
| Inversão de uma dupla dos casos acima | Mesmo resultado, pois dot/cross entram em valor absoluto. |
| Comprimento de qualquer dupla igual a zero | Sem TPA; estado `LANDMARKS_REQUIRED`. |

Esses exemplos não são fixtures de respostas obtidas na API nem aceite clínico.

#### Validade da entrada e estados do resultado

`TploLandmarks` exige quatro pontos e aceita somente os dois métodos publicados.
Cada ponto está limitado a `[0,1]`. O schema desse conjunto não tem o validador
de pontos distintos que existe em `PlanAngle`.

| Condição conferida | Comportamento da fonte |
| --- | --- |
| Um dos quatro campos está ausente dentro de um conjunto enviado | Entrada incompleta; não satisfaz o schema de TploLandmarks. |
| Pontos completos, mas uma das duplas coincide | A entrada pode ser persistida; a derivação retorna `LANDMARKS_REQUIRED`, sem TPA nem comprimentos. |
| Pontos não coincidentes, mas segmentos paralelos ou perpendiculares | Geometria calculável; resultados de 90° ou 0° são válidos. |
| Uma dimensão original ausente/zero | `IMAGE_DIMENSIONS_REQUIRED`, sem TPA. |
| Dimensões presentes e duplas com comprimento positivo, sem calibração | `CALCULATED` com TPA; os campos em mm e calibration_id ficam ausentes/nulos. |
| Mesma geometria com calibração manual válida | Mesmo TPA, com os dois comprimentos em mm e calibration_id. |
| `tplo_landmarks=null` com metadados `tplo` presentes | `tplo_measurement` continua existindo como `LANDMARKS_REQUIRED`, com o método padrão. |
| `tplo_landmarks=null` e sem metadados `tplo` | A derivação remove `tplo_measurement`. |

Decisão de compatibilidade: validar entrada completa, método e coordenadas
finitas/limitadas. Não acrescentar uma recusa de persistência por coincidência
que o backend não aplica. A futura prévia de uma dupla nula fica indisponível;
não chamar 0° de erro nem exibir o TPA anterior sobre pontos alterados.

Salvar referências e possuir TPA calculado são resultados distintos. Remoção
é reconhecida pela ausência/nulidade de `tplo_landmarks`, não pela inexistência
de `tplo_measurement`. O comando não precisa de UUID, label, visible ou locked.

#### Métodos, rótulos e ordem de posicionamento

Os dois valores de `method` são aceitos pelo schema. Na revisão examinada,
a derivação usa a mesma fórmula para ambos e apenas identifica o método no
resultado. Não existe conversão automática de geometria entre os métodos.

- Conjunto novo: usar o padrão publicado `MEDIAL_CONDYLE_CRANIAL_CRUCIATE_FULL_AXIS_V1`.
- Conjunto existente: preservar o método retornado pela API.
- Troca: somente como ação explícita no rascunho, sem mover pontos, autosave ou
  conversão inventada. Os quatro pontos continuam sujeitos à revisão do usuário.
- Não apresentar os dois métodos como algoritmos diferentes ou como escolhas
  cuja equivalência clínica tenha sido demonstrada pelo código.

Rótulos de interface e sequência inicial propostos para o posicionamento
explícito, mantendo os identificadores técnicos estáveis:

| Ordem | Campo remoto | Rótulo pt-BR | Rótulo en |
| --- | --- | --- | --- |
| 1 | `plateau_cranial` | Ponto cranial do platô | Cranial plateau point |
| 2 | `plateau_caudal` | Ponto caudal do platô | Caudal plateau point |
| 3 | `intercondylar_midpoint` | Ponto médio intercondilar | Intercondylar midpoint |
| 4 | `talus_center` | Centro do tálus | Talus center |

A sequência é uma decisão de interação do frontend, não uma exigência de
ordenação do JSON. O usuário poderá selecionar novamente qualquer ponto.
Textos de ajuda sobre localização anatômica devem respeitar o método e a fonte
clínica identificada; os nomes dos campos não substituem essa orientação.

#### Escala, recalibração, DICOM e derivações

- A escala desta fonte usa somente a referência manual e as dimensões originais.
  Recalibrar mantendo os pontos conserva o TPA, recalcula os comprimentos e
  atualiza o fingerprint. O leitor não deve exigir calibration_id para mostrar
  um TPA válido; os comprimentos em mm exigem a escala correspondente.
- `pixel_spacing_mm` e `imager_pixel_spacing_mm` não entram no cálculo de TPA
  nem têm precedência entre si nessa função. Não há correção física por eixo.
- Manter a proteção atual do produto para DICOM anisotrópico: razão de espaçamento
  divergente de 1 por mais de `1e-6`, em qualquer um dos dois campos, impede a
  edição geométrica. Não compensar apenas o frontend e produzir outra medida.
- O acesso global a Ferramentas continua seguindo a calibração do produto.
  Esse gate não transforma a falta de escala em um estado remoto de TPA inexistente.
  Na remoção, avaliar necessidade de dimensões/escala separadamente da edição:
  limpar um conjunto não calcula uma nova geometria.
- No PUT, o servidor clona o documento, remove `tplo_measurement` antigo e o
  recalcula; os derivados enviados pelo cliente não são fonte do resultado.
  A rota usa `model_dump(mode="json")` e o caso de uso aplica revisão otimista.
- O servidor também recalcula `tplo_correction` quando existem referências ou
  metadados TPLO; quando ambos faltam, remove esse derivado. Não editar inclinação,
  lâmina, tabela, metadados TPLO, referências de outras medidas ou auditoria por
  consequência de um comando de referências.
- Respeitar as recusas da revisão clínica e de planos finalizados. Não limpar
  decisões, rebaixar status ou alterar auditoria para fazer uma gravação passar.

#### Protocolo e aceitação

O endpoint autenticado retorna configurações do ambiente. A fonte confirma
que a ausência de protocolo é uma resposta `configured=false`, diferente de
401, 403, falha de sessão ou falha operacional.

- Sem protocolo ou sem tolerância específica de TPA, a derivação usa
  `acceptance=NOT_CONFIGURED`. Isso não impede o cálculo geométrico do TPA.
- Com tolerância de TPA, a referência independente é lida de
  `additional_measurements_input.reference_values["TPA"]` (chave em maiúsculas).
- Havendo TPA e referência, o erro é a diferença absoluta; erro menor ou igual
  à tolerância resulta em `PASS`, acima dela em `FAIL`. Sem valor comparável,
  o estado é `NOT_ASSESSED`. A versão e a tolerância vêm do protocolo.
- `acceptance_enabled=true` também pode decorrer de outras medidas configuradas,
  sem tolerância de TPA. Não usá-lo sozinho como prova de que o TPA será avaliado.
- Os IDs `TPA`, `PLATEAU_AXIS` e `TIBIAL_AXIS` são reservados pelo modelo do
  protocolo. Medidas adicionais não substituem esse conjunto.
- Leitura do TPA, aceitação por tolerância e aprovação clínica permanecem
  conceitos separados. `clinically_validated` continua `false` na fonte publicada.
- Entrada de referência manual de TPA e alteração do protocolo ficam fora desta
  integração. Preservar valores existentes e consumir o resultado do servidor.

#### Consulta do ambiente e fechamento

A consulta sem autenticação à API retornou 401. O caminho autenticado existente
no frontend foi conferido: serviço `tplo-reference-api.ts` → rota
`/api/cases/tplo/clinical-protocol` → `withAuthenticatedCasesRoute` → API clínica.
O BFF exige organização esperada no cabeçalho `x-clinical-organization`, aplicado
normalmente por `caseFetch`. Abrir a URL diretamente não reproduz esse contexto.

Não há aba do projeto conectada ao controle de navegador desta sessão. Foi
solicitado somente o JSON de configuração obtido pelo usuário no projeto logado,
sem cookies, tokens ou senha. O usuário forneceu a resposta após as instruções
de consulta pelo BFF com sessão/organização. Nenhum PUT de plano, alteração de
caso ou upload foi executado nesta etapa.

Resposta do ambiente fornecida pelo usuário em 09/11/2026:

```json
{
  "configured": false,
  "protocol_version": null,
  "source": null,
  "measurements": [],
  "tpa_max_absolute_error_degrees": null,
  "acceptance_enabled": false,
  "clinically_validated": false
}
```

Decisões para as próximas etapas:

- O ambiente consultado não tem protocolo de medidas adicionais nem tolerância
  de TPA configurados. Não fixar nomes, versões, referências ou tolerâncias no front.
- `configured=false` é uma resposta normal, não um erro de autenticação ou serviço.
  Não mostrar Sonner de erro, bloquear o TPA ou oferecer retry obrigatório por esse estado.
- A fonte confirma que o cálculo geométrico continua disponível com quatro
  pontos não degenerados e dimensões válidas; a aceitação será `NOT_CONFIGURED`.
  Os gates atuais do produto e as permissões continuam aplicáveis.
- Essa consulta não é um PUT de exemplo de TPA. Os estados de gravação e os
  valores calculados no serviço publicado ainda serão exercitados no aceite manual.
- A resposta registra a configuração deste momento. A implementação consulta a
  configuração real pela infraestrutura existente; não transforma esse JSON em fallback.

| Critério da etapa 0 | Estado |
| --- | --- |
| Fonte e revisão anunciada compatíveis com o OpenAPI | Conferido. |
| Fórmula, intervalo e matriz original | Conferido. |
| Métodos, entrada, degeneração e estados | Conferido. |
| Escala, DICOM, recalibração e remoção | Conferido. |
| Persistência e aceitação por protocolo | Conferido por leitura de fonte. |
| Rótulos, ordem e política de troca de método | Decisões registradas. |
| Versão/configuração/tolerância do protocolo no ambiente autenticado | Resposta fornecida pelo usuário: não configurado, sem versão/tolerância, lista vazia. |

**Situação:** etapa 0 concluída. Revisão de fonte, decisões e configuração do
ambiente registradas. Nenhum cálculo do frontend foi implementado nesta etapa.
O aceite funcional remoto continua na etapa 11.

### 1. Definir entrada, comandos e operações puras

- Extrair schema editável do conjunto, separado do resultado de leitura.
- Criar `landmarks-set` e `landmarks-clear` estritos e suas funções de aplicação.
- Alterar apenas a entrada de referências; preservar calibração, objetos,
  parâmetros TPLO, qualidade, configurações de medidas adicionais e auditoria.
- Tratar somente os derivados que a etapa 0 confirmar como obsoletos; não apagar
  campos clínicos independentes durante o merge.
- Reconhecer confirmação pela revisão e igualdade de método/quatro pontos, ou
  pela ausência do conjunto na remoção. Resultado numérico ausente não é prova de falha da escrita.

**Entrega:** comando e merge independentes da UI, sem ID de objeto ou resultado no input.

#### Entrega da etapa 1

- `TploLandmarksInputSchema` e `TploLandmarksInput` foram extraídos em
  `image-plan.schema.ts`. O documento de leitura reutiliza o mesmo schema,
  preservando o formato remoto, o método padrão e os campos opcionais/nulos existentes.
- A entrada aceita os dois métodos publicados e exige quatro pontos finitos,
  limitados a `[0,1]`, com objetos estritos em todos os níveis. Não aceita UUID,
  flags de apresentação, resultado calculado ou outros campos extras.
- Coincidência de pontos e segmentos paralelos continuam aceitos, conforme a
  etapa 0. Persistência do conjunto não exige TPA calculado.
- `SetLandmarksSchema` aceita `{ kind: "landmarks-set", baseRevision, landmarks }`.
  `ClearLandmarksSchema` aceita apenas `{ kind: "landmarks-clear", baseRevision }`.
  Ambos compõem `SaveLandmarksSchema`, com tipo `SaveLandmarksInput` e predicado
  `isLandmarksCommand`. A revisão usa a mesma restrição segura dos comandos atuais.
- Na etapa 1, `PlanMutationSchema`/`PlanMutationInput` ampliaram somente a camada
  pura, mantendo o transporte fechado. Na etapa 2, os comandos passaram à união
  operacional `PlanSaveCommandSchema`, usada por `applyPlanCommand` e
  `planCommandMatches`; os aliases temporários foram removidos.
- Aplicar set substitui o único `tplo_landmarks`; aplicar clear escreve `null`.
  Não cria, altera ou remove objetos em `document.objects`, não consome seu
  limite e não procura um UUID de alvo. As operações não mutam o documento original.
- Ambos invalidam apenas `tplo_measurement` e `tplo_correction`, derivados
  dependentes das referências e recalculados pelo backend na revisão conferida.
  Calibração, objetos e suas flags/resultados, metadados TPLO, viewport,
  transformação, qualidade, medidas adicionais, validação e auditoria são preservados.
- `landmarksMatches` compara método e cada coordenada dos quatro pontos, sem
  depender da ordem das propriedades JSON. Ausência e `null` equivalem à remoção.
- A confirmação exige revisão posterior à capturada e o conjunto exato esperado,
  ou sua ausência no clear. Não exige TPA, aceitação ou desaparecimento de
  `tplo_measurement`, que pode continuar como `LANDMARKS_REQUIRED` após remoção.

**Revisão realizada:** leitura dos consumidores e das operações, checagem de
tipos da aplicação, lint dos dois arquivos alterados com o parser TypeScript
instalado e verificação de whitespace aprovados. Sem execução de testes
funcionais/automatizados, backend ou gravações remotas, conforme o processo combinado.

**Revisão lógica dos casos de contrato:** campos extras e pontos incompletos ou
fora dos limites são recusados pelo schema; métodos diferentes e alteração de
qualquer coordenada não correspondem à confirmação; revisão igual/anterior
não confirma; resultado ausente não invalida o set reconhecido; clear aceita
ausência/nulidade do campo independentemente dos derivados recalculados.
Essa revisão não substitui o aceite manual das etapas posteriores.

### 2. Conectar serviço, rota e BFF

- Acrescentar os comandos no transporte e no PATCH existente, sem aceitar um
  documento completo enviado pelo navegador.
- Manter validações de sessão, organização, imagem/caso, revisão e permissões.
- Aplicar preflights específicos de referências conforme etapa 0; não herdar
  indiscriminadamente as regras de `LINE` ou `CIRCLE`.
- Fazer um único PUT por confirmação, preservando os campos alheios à edição.
- Separar recusas anteriores ao PUT de erros com resultado de gravação incerto.
- Ao registrar os novos tipos na união operacional, acompanhar os ajustes mínimos
  de discriminação exigidos pelos consumidores: referências não possuem `id`.
  Não deixar o owner cair em Distância ou em comparação por UUID; a recuperação
  completa e os rascunhos próprios continuam nas etapas 3 e 4.

**Entrega:** caminho navegador/BFF/backend completo, ainda sem entrada habilitada na UI.

#### Entrega da etapa 2

- `SavePlanEditSchema` e `PlanSaveCommandSchema` incluem `landmarks-set` e
  `landmarks-clear`. O serviço `saveImagePlanEdit` reutiliza essa validação e o
  PATCH `/api/cases/{caseId}/images/{imageId}/plan/edits`, sem uma rota paralela.
  O navegador envia apenas o comando restrito, nunca o documento completo.
- O PATCH mantém sessão, organização, validação do corpo e limite de 4 KiB de
  UTF-8 para referências; qualidade conserva o limite existente de 12 KiB.
  O BFF verifica imagem pronta pertencente ao caso e revisão atual do plano.
- `landmarks-set` exige dimensões originais válidas e mantém a proteção existente
  contra espaçamento DICOM anisotrópico. Não exige escala, resultado de calibração
  ou protocolo clínico configurado para gravar os quatro pontos.
- `landmarks-clear` não edita geometria: não depende de dimensões, escala ou
  espaçamento DICOM. As verificações de acesso, imagem/caso e revisão permanecem.
  Os preflights das outras ferramentas foram preservados.
- O BFF lê o documento atual, aplica o merge restrito e emite um único PUT com
  a revisão capturada. Somente `tplo_landmarks` e seus dois derivados dependentes
  são afetados pela aplicação do comando; os demais dados continuam preservados.
- Serviço e BFF conferem imagem, revisão exatamente incrementada e correspondência
  do método/quatro pontos ou ausência do conjunto. Não exigem TPA calculado nem
  ausência de `tplo_measurement` para reconhecer a remoção.
- Recusas anteriores à escrita não são marcadas como resultado incerto. Falhas
  de transporte, respostas inválidas e erros não definitivos após a tentativa
  de PUT mantêm a incerteza; não há repetição automática da escrita.
- O owner `landmarks`, a comparação sem UUID e o direcionamento do recibo para
  Ferramentas foram acrescentados aos consumidores compartilhados. O aviso de
  navegação usa texto genérico próprio em pt-BR/en, sem chamar referências de
  Distância. São ajustes mínimos de compatibilidade da união; rascunho e
  recuperação próprios continuam nas etapas 3 e 4.

**Revisão realizada:** checagem de tipos, lint dos consumidores alterados e
verificação de whitespace. Testes funcionais e gravações remotas não foram
executados; o aceite manual continua conforme combinado. Nenhuma entrada nova
foi habilitada na interface.

### 3. Integrar writer e recuperação

- Acrescentar owner `landmarks` ao recibo e à navegação para Ferramentas.
- Adaptar comparações que hoje pressupõem `id` para toda medida. O alvo aqui
  é o conjunto único da imagem, capturado com comando e revisão exatos.
- Compartilhar locks com calibração, qualidade, Distância, Ângulo e Círculo.
- Conferir incerteza por GET, sem repetir PUT automaticamente; conflito exige
  decisão explícita e nunca reaplica um rascunho sobre outra revisão.
- Limpar somente o rascunho confirmado. Ignorar callbacks de caso/imagem/organização
  anteriores e os que chegarem após exclusão ou desmontagem.

**Entrega:** recuperação completa sem classificar referências como edição de outro objeto.

#### Entrega da etapa 3

- O writer compartilhado reconhece `landmarks-set`/`landmarks-clear` como
  operações do conjunto único da imagem. Captura comando e revisão sem UUID,
  compartilha serialização/recibo com as outras ferramentas e não cria um writer paralelo.
- `LandmarksEditor` e a chave `imageLandmarksDraft` foram antecipados como base
  mínima para correspondência e limpeza. O set admite quatro pontos parciais
  somente no estado local; converter em comando exige o conjunto completo e
  estrito. Método, operação, revisão e cada coordenada identificam a confirmação.
  Inicialização, ponto ativo e transições do hook de edição continuam na etapa 4.
- A confirmação limpa somente o rascunho correspondente ao comando enviado.
  Pontos diferentes, outra operação, revisão posterior ou colocação incompleta
  são preservados. Não é necessário um TPA calculado para confirmar a entrada.
- Rascunhos e recibos de Referências participam dos guards compartilhados de
  edição, saída e exclusão. As assinaturas de cache reconhecem a nova chave,
  editores limpos podem ser fechados na troca de ferramenta e a exclusão de imagem
  remove o estado correspondente. A exclusão de caso já limpa as chaves do caso.
- Resultado incerto é conferido por GET com o comando capturado. Revisão ainda
  inalterada mantém a incerteza; revisão posterior confirma o conjunto esperado
  ou produz conflito. Não há reenvio automático do PUT nem rebase silencioso.
  Recusas definitivas não são transformadas em incerteza por conferência.
- `LANDMARKS_ALREADY_REMOVED` identifica a ausência do conjunto observada em
  revisão posterior, inclusive após recusa por conflito. Derivados TPLO podem
  continuar presentes; sua ausência não é requisito para reconhecer a remoção.
- `useLandmarksSaveRecovery` reutiliza `useMeasurementSaveRecovery`, com filtro
  próprio de comandos e suporte a clear. A conferência/descarte exige o comando
  exato, a query capturada e o mesmo contexto de organização/caso/imagem. Gerações
  invalidam callbacks após troca de contexto; desmontagem e exclusão bloqueiam
  efeitos tardios. O writer também verifica se o recibo ainda pertence ao cache.
- O workspace mantém Ferramentas acessível para um recibo de Referências mesmo
  sem escala disponível. O card de recuperação aparece somente em Ferramentas,
  com mensagens próprias em pt-BR/en e conferência/descarte conforme a fase.
  Ele não exibe overlays de outra ferramenta como se fossem referências.
  Descartar erro/conflito limpa apenas o rascunho correspondente; resultado incerto
  não pode ser descartado. Nenhuma entrada para criar referências foi habilitada.

**Revisão de conclusão:** revisão lógica dos caminhos de comando completo/parcial,
limpeza correspondente, bloqueio concorrente, conflito, resposta perdida, remoção
já observada e callbacks de contexto anterior. TypeScript, lint dos módulos
alterados, JSON das traduções e whitespace conferidos. Sem testes funcionais,
gravações remotas ou execução do backend; o aceite manual permanece na etapa 11.

### 4. Criar estado e rascunho do conjunto

- Criar `useImageLandmarks`, keys e assinaturas de cache necessárias.
- Modelar rascunho parcial local: método, pontos já posicionados, ponto ativo,
  revisão de origem e geração do contexto. Só salvar com o conjunto completo.
- Implementar iniciar, selecionar ponto, alterar, descartar e retomar rascunho.
- Incluir o owner nos detectores de mudanças, locks, saída e exclusão de caso/imagem.
- Editar o conjunto existente; não criar uma segunda cópia ao reabrir a ferramenta.

**Entrega:** ciclo de vida isolado, com um editor alterado por imagem e sem autosave.

#### Entrega da etapa 4

- `useImageLandmarks` usa o mesmo plano e a mesma chave de rascunho em memória
  do writer. O cache pertence ao QueryClient da organização e à imagem/caso;
  não há cache paralelo do plano, UUID de conjunto ou armazenamento no navegador.
- `LandmarksEditor` mantém método, pontos parciais, revisão de origem e ponto
  ativo. A sequência é cranial do platô → caudal do platô → ponto médio
  intercondilar → centro do tálus. Posicionar avança para o próximo ponto ausente;
  selecionar permite rever qualquer ponto, inclusive um ainda não posicionado.
- `open` retoma a intenção local ou abre uma cópia editável do conjunto salvo,
  preservando seu método. Sem conjunto salvo, inicia pontos vazios e o método
  padrão do schema. Não cria uma segunda cópia nem deriva referências da calibração.
- Seleção do ponto ativo fica fora do comando enviado e da comparação de
  alterações clínicas. A troca explícita de método conserva as coordenadas.
  Coordenadas inválidas são recusadas sem clamp; pares coincidentes continuam
  aceitos pelo contrato, sem inventar uma validação de TPA nessa etapa.
- A construção do comando exige os quatro pontos completos, finitos e dentro
  de `[0,1]`. O hook expõe alteração, seleção, posicionamento, descarte, fechamento
  de editor limpo, atualização de leitura e envio explícito pelo writer existente.
  Entrada, seleção e alteração de pontos não geram gravação ou autosave.
- Revisão desatualizada preserva o rascunho e bloqueia edição/envio. Não há rebase
  nem descarte automático. O descarte exige a intenção local que o chamador viu;
  recibos incertos só podem ser conferidos, e recibos de outra ferramenta não são apagados.
- Disponibilidade é conferida no render e novamente na ação: imagem pronta,
  contexto, revisão, leitura, bloqueios e intenção concorrente. A edição de pontos
  exige dimensões originais e ausência de anisotropia não suportada, sem exigir
  escala ou protocolo configurado. Clear conserva a política sem preflight de geometria.
- Gerações invalidam callbacks ao sair/voltar da ferramenta, trocar contexto,
  substituir a query ou alterar dimensões/espaçamento. Abrir, fechar e descartar
  o editor também invalidam capturas anteriores. Callbacks após desmontagem,
  exclusão ou troca de organização/caso/imagem não alteram o estado atual.
- O workspace consome o novo hook, retoma a ferramenta do rascunho e inclui
  alterações locais no resumo/guarda de saída. Calibrar fecha o editor limpo de
  referências e pede resolução de alterações pendentes antes de prosseguir.
  Detecção e limpeza de exclusão já conectadas na etapa 3 continuam usando a
  mesma chave e o mesmo comparador. Nenhuma entrada de criação ou overlay foi habilitado.

**Revisão de conclusão:** conferidos rascunho parcial/completo, seleção sem mudança
clínica, método preservado, retomada sem duplicação, revisão antiga, descarte
correspondente, bloqueios e geração de contexto. Checagens de TypeScript, lint,
JSON de traduções e whitespace realizadas. Testes funcionais continuam manuais
na etapa 11; sem gravações remotas ou execução do backend nesta entrega.

### 5. Preparar geometria e visualizador

- Acrescentar canal próprio de referências à união `ViewerEditor`, sem converter
  quatro pontos em um `ANGLE` ou em um marcador de calibração.
- Reutilizar coordenadas normalizadas ↔ pixels originais e os mapeamentos de espelhamento.
- Implementar hit test por ponto/corpo, gesto transitório, cancelamento e commit.
- Preservar zoom, pan, toque, fullscreen, setas, Shift, limites e geração do gesto.
- Usar verde `--radiograph-mark-anatomy` nos pontos anatômicos; segmentos e
  resultado de medição usam ciano `--radiograph-mark-measurement`, sem contornos extras.

**Entrega:** interação própria com desenho estável em tela e sem gravação por movimento.

#### Implementação da etapa 5 — canal e interação próprios

`ViewerEditor` recebe o modo `landmarks`, sem UUID, marcador de calibração ou
conversão para `ANGLE`. O canal adapta somente a geometria completa dos quatro
pontos; método, rascunho parcial, resultado oficial e persistência conservam suas
responsabilidades existentes. O workspace ainda não ativa esse modo.

`landmarks-geometry` usa a matriz original para normalizar/desnormalizar e conserva
exatamente os pontos normalizados que não foram ajustados. `landmarks-interaction`
faz hit test em pixels de tela: alças dos quatro pontos têm prioridade sobre os
dois segmentos. Arrastar um segmento move o conjunto dentro dos limites inclusivos
da imagem, sem deformá-lo; arrastar uma alça ajusta somente seu ponto. Pontos
coincidentes continuam aceitos, sem inventar um TPA para geometrias degeneradas.

O visualizador mantém a geometria transitória até soltar um arraste deliberado.
Escape, cancelamento/perda de captura, perda de foco da janela e mudança do dono
do gesto descartam essa geometria. Revisão, geração/contexto, imagem, dimensões,
espelhamento, ferramenta, bloqueios e transformações de exibição identificam o
gesto. Setas usam pixels originais, Shift amplia o passo e espelhamento inverte
somente a direção horizontal da interação. Atalhos 1–5 selecionam conjunto e os
quatro pontos na ordem documentada, permitindo ajustar também pontos coincidentes.

`ViewerLandmarksEditorOverlay` prepara o desenho do editor com pontos verdes
(`--radiograph-mark-anatomy`) e dois segmentos ciano
(`--radiograph-mark-measurement`), sem contornos extras; alças e traços mantêm
tamanho em tela durante zoom/fullscreen. Não há valor de TPA, colocação inicial,
leitura de salvos ou gravação por movimento nesta etapa. A entrada pública,
ligação ao workspace e demais overlays continuam reservados às próximas etapas.

**Checagens estáticas:** TypeScript aprovado; lint dos cinco módulos de código
alterados/criados sem erros, com somente o aviso preexistente de `<img>` no
visualizador. JSON e paridade das 1.079 chaves pt-BR/en aprovados; whitespace
conferido nos nove arquivos desta etapa, incluindo os não versionados. Nenhum
teste automatizado/funcional, gravação remota ou execução do backend realizado.

**Revisão de conclusão:** canal isolado, hit tests, conversões, limites inclusivos,
pontos coincidentes, preview/commit e invalidação/cancelamento dos gestos revisados,
incluindo revisão independente sem pendências acionáveis. Toque, zoom/pan,
espelhamento, fullscreen e teclado aguardam o aceite manual integrado da etapa 11.

### 6. Ler e apresentar referências salvas

- Criar seletor de resultado de `tplo_measurement`, distinguindo estados,
  método divergente, resultados ausentes e leitura não confirmada.
- Separar disponibilidade do TPA e dos comprimentos. A ausência de mm não deve
  invalidar automaticamente um TPA disponível, conforme evidência da etapa 0.
- Exibir quatro pontos, referências geométricas necessárias e valor oficial,
  somente com Ferramentas/Referências anatômicas ativos.
- Ler o conjunto pela revisão atual; preferências de exibição são locais e
  não se tornam flags `visible`/`locked` inexistentes em `tplo_landmarks`.
- Manter protocolo/tolerância e validação clínica separados do resultado geométrico.

**Entrega:** reabertura fiel, sem expor marcações em Informações, Arquivos ou Imagem.

#### Implementação da etapa 6 — leitura e apresentação dos salvos

`selectSavedLandmarks` lê somente `document.tplo_landmarks` e o resultado oficial
`tplo_measurement` da mesma revisão do plano. Retorna um único conjunto, sem UUID,
e ignora resultados residuais quando as referências estão ausentes/nulas. Uma
identidade de imagem divergente impede também a apresentação da geometria.
Falha de leitura da imagem correta conserva os pontos salvos e marca os valores
como não confirmados. O workspace também suspende a confirmação dos valores
durante `saving`/`checking`/`uncertain`/`conflict` do writer compartilhado. Um
conflito não confirma o cache anterior caso o GET de atualização tenha falhado.
O resumo distingue carregamento, leitura não confirmada e ausência confirmada;
não deduz ausência de referências a partir de cache vazio ou falha da consulta.

O seletor distingue resultado ausente, método divergente, referências degeneradas,
dimensões ausentes e valores inválidos. TPA oficial entre 0° e 90°, inclusive,
é lido sem depender da escala, dos comprimentos, do fingerprint ou da configuração
do protocolo. Cada comprimento em mm é validado separadamente: valor positivo,
escala salva e fingerprint correspondente à calibração vigente. Um comprimento
ausente/inválido não oculta automaticamente o outro nem o TPA disponível.

`LandmarksOverlay` desenha os quatro pontos verdes e os dois segmentos ciano
(platô/eixo tibial) a partir das coordenadas persistidas, usando dimensões originais.
A numeração segue a ordem anatômica documentada e o TPA oficial fica junto ao
platô; tamanhos e textos conservam escala de tela e legibilidade no espelhamento.
`CaseImageLandmarksValues` identifica revisão, método salvo, resultados individuais,
motivos de indisponibilidade e os nomes dos quatro pontos. O resumo é somente de
leitura; não aciona edição, reposicionamento, cálculo local ou gravação.

A comparação por tolerância ocupa uma seção própria e usa apenas os metadados
oficiais do mesmo método, com TPA confirmado. `PASS`/`FAIL` descrevem tolerância,
sem equivaler a validação clínica. `NOT_CONFIGURED` não bloqueia o resultado.
Versão, referência, erro e tolerância não são inventados quando ausentes. Nenhuma
consulta nova de protocolo foi introduzida; a composição dessa consulta fica na etapa 9.

Overlay e resumo exigem simultaneamente painel Ferramentas e Referências ativos.
Sem dimensões originais não se desenha na matriz da miniatura. A preferência
`hiddenLandmarksValue` permanece no cache local por organização/caso/imagem,
sem `visible`/`locked` no documento ou UUID fictício. O controle público por
olhinho continua para a etapa 9. A entrada pública segue desabilitada; não foram
ligados colocação inicial, ajustes, prévia, card de ações ou remoção das próximas etapas.

**Revisão de conclusão, item a item:**

- Seletor oficial: estados remotos, método divergente, ausência, geometria/valor
  inválidos, identidade da imagem e leitura não confirmada conferidos.
- Dependências: TPA de 0°/90° sem escala e os dois comprimentos com validação e
  fingerprint independentes conferidos por revisão de código, sem cálculo local.
- Apresentação: quatro pontos, platô/eixo e valor oficial com dimensões originais,
  tamanho de tela e texto espelhado, restritos a Ferramentas/Referências ativos.
- Revisão e preferências: snapshot atual do cache compartilhado, conjunto único,
  método preservado e ocultação local do valor, sem flags remotas ou novos writers.
- Protocolo e validação: comparação separada, metadados ausentes não inventados e
  `NOT_CONFIGURED` sem bloquear TPA. Nenhuma consulta ou aprovação clínica nova.

A revisão independente identificou e a implementação corrigiu a possibilidade de
mostrar cache antigo como oficial após conflito com GET de atualização falho.
Revisão final sem pendências acionáveis. TypeScript aprovado; lint dos cinco módulos
de código sem erros/avisos; JSON, paridade das 1.116 chaves pt-BR/en e placeholders
das referências aprovados; whitespace conferido nos nove arquivos desta etapa,
incluindo os não versionados. Nenhum teste automatizado/funcional, gravação remota
ou execução do backend realizado. Aceite de interação permanece manual na etapa 11.

### 7. Conectar posicionamento inicial

- Guiar o posicionamento explícito dos quatro pontos com nome, ordem e progresso
  definidos na etapa 0. O usuário pode selecionar um ponto para reposicioná-lo.
- Confirmar a ação na matriz original; distinguir marcações provisórias de pontos confirmados.
- Permitir cancelar a criação e retomar seu rascunho sem modificar o plano salvo.
- Impedir salvamento parcial e posicionamento de pontos exigindo permissões/bloqueios indisponíveis.
- A entrada na ferramenta não grava e não gera referências a partir da calibração.

**Entrega:** conjunto completo criado pelo usuário, pronto para confirmar.

#### Implementação da etapa 7 — posicionamento explícito dos quatro pontos

O canal `landmarks` recebe `LandmarksPlacementState`, com os pontos parciais,
método preservado e ponto ativo. `landmarksPlacementInPixels` converte apenas os
pontos presentes para a matriz original; abrir ou voltar à ferramenta não gera
pontos, não utiliza o marcador de calibração e não grava na API. O workspace liga
esse canal somente ao rascunho ativo de Referências em Ferramentas, fora da recuperação.

`CaseImageLandmarksCreationControls` mostra nomes, ordem, quantidade posicionada e
ponto ativo. Qualquer um dos quatro pontos pode ser selecionado e reposicionado
por nova confirmação, inclusive após completar o conjunto. O preenchimento segue
cranial → caudal → médio intercondilar → tálus por padrão, avançando ao primeiro
ponto ainda ausente. Seleção não altera o conteúdo clínico nem entra no comando.

Clique/toque confirma somente ao soltar dentro da imagem, sem arraste. Um movimento
de pelo menos quatro pixels de tela invalida a colocação mesmo se retornar à origem.
Hover, movimento do ponteiro e setas alteram somente o cursor provisório. Com foco
no visualizador, setas movem essa prévia em pixels originais, Shift amplia o passo
e Enter sem repetição confirma o ponto ativo. A prévia de teclado parte do ponto
ativo, quando já posicionado, ou do centro da matriz; isso não posiciona nenhum
ponto até a confirmação explícita. Espelhamento altera somente a interação visual.

O overlay distingue pontos confirmados verdes, segmentos confirmados ciano e o
cursor provisório com anel verde/segmento ciano tracejado. Tamanho em tela e texto
legível no espelhamento seguem o visualizador. A leitura/overlay oficiais salvos
ficam ocultos durante o posicionamento do rascunho, sem TPA local nesta etapa.

Escape, perda/cancelamento de captura, blur da janela e troca de contexto/geração
descartam apenas o gesto. Os pontos confirmados continuam no rascunho por imagem;
sair da aba e voltar retoma esse estado. Pan pausa a colocação e Posicionar ponto
reativa a interação. Descartar rascunho é a ação explícita de cancelar a criação:
limpa somente o rascunho correspondente e conserva integralmente o plano salvo.

Cada seleção/colocação exige o snapshot atual do editor e incrementa a geração,
impedindo callbacks repetidos ou antigos, inclusive no último ponto e na sequência
de seleção A → B → A. Revisão antiga, contexto/query, permissões, imagem não pronta,
dimensões, anisotropia DICOM, calibração em edição, writer e recibos conservam seus
bloqueios. Falha de leitura permite GET preservando pontos locais. Somente os quatro
pontos completos formam um comando; coincidência continua aceita pelo contrato.

A entrada pública permanece desabilitada. Arraste de pontos/corpo e prévia do TPA
ficam para a etapa 8; card, confirmação de salvamento e olhinho para a etapa 9;
remoção/habilitação para a etapa 10. O encaminhamento da calibração para Distância
na linha salva permanece preservado. Nenhum novo writer ou autosave foi introduzido.

**Revisão de conclusão, item a item:**

- Ordem, nomes, progresso e seleção explícita dos quatro pontos conferidos,
  incluindo reposicionamento após completar o conjunto.
- Confirmação por clique/toque ou Enter usa a matriz original; cursor, setas e
  segmentos provisórios não alteram pontos confirmados antes da confirmação.
- Escape/cancelamento do gesto e saída/retorno preservam o rascunho; descarte
  explícito limpa somente a intenção local correspondente, sem alterar o plano.
- Comando parcial continua impossível; revisão, snapshot, geração, contexto/query,
  dimensões, DICOM e bloqueios do writer/recuperação protegem colocação e envio.
- Abrir/retomar não gera referências, não reaproveita a calibração como anatomia
  e não escreve; entrada pública, arraste, TPA local e ações das próximas etapas
  continuam sem habilitação antecipada.

Revisão independente sem pendências acionáveis. TypeScript aprovado; lint dos sete
módulos de código sem erros, com somente o aviso preexistente de `<img>` no
visualizador. JSON, paridade das 1.130 chaves pt-BR/en e placeholders das referências
aprovados; whitespace conferido nos onze arquivos desta etapa, incluindo os não
versionados. Nenhum teste automatizado/funcional, gravação remota ou execução do
backend realizado. Aceite de interação permanece manual na etapa 11.

### 8. Ajustar pontos e preparar prévia

- Arrastar ponto ajusta esse ponto; arrastar o corpo move o conjunto sem deformá-lo.
- Disponibilizar seleção dos quatro pontos no card e nudge pelo teclado.
- Prévia transitória pode atualizar o valor durante o gesto somente após confirmar
  fórmula e convenção na etapa 0; marcar estimativa e separar do resultado oficial.
- Não mostrar o TPA antigo sobre uma geometria nova como se fosse o resultado atual.
- Cancelar gesto restaura a geometria anterior; soltar com configuração inválida
  não confirma um cálculo inventado ou troca o dono da edição.

**Entrega:** ajuste direto e prévia coerente, sem modificar a escala ou outras medidas.

#### Implementação da etapa 8 — ajuste direto e prévia compartilhada

O conjunto completo passa do posicionamento para o canal geométrico próprio do
editor. `CaseImageLandmarksAdjustmentControls` reutiliza o card/seções/ações de
medição para selecionar conjunto ou um dos quatro pontos e ajustar com setas.
Alças e segmentos usam os hit tests em pixels de tela já preparados; arrastar uma
alça ajusta somente seu ponto, e arrastar um segmento move os quatro sem deformação.
O teclado do visualizador mantém atalhos 1–5, setas/Shift e espelhamento; os botões
do card usam o mesmo operador. Coordenadas e deslocamentos usam a matriz original,
com limites inclusivos; cada coordenada que não foi alterada conserva seu valor
normalizado exato ao voltar de pixels.

`landmarksGeometryFromEditor` e `changeLandmarksGeometry` validam/confirmam os
quatro pontos atomicamente. O hook aplica os guards de revisão, snapshot, geração,
query/contexto, imagem, dimensões, DICOM, concorrência e recibo, preservando método,
ponto ativo e demais dados. A seleção do alvo feita ao iniciar um arraste é apenas
de apresentação e não invalida o próprio gesto. Seleções explícitas do card seguem
o guard de geração do editor. O reposicionamento por clique/toque da etapa 7
continua disponível como ação explícita, com retorno ao ajuste sem outra criação.

`landmarksValuesPreview` implementa a fórmula fixada na etapa 0, sem reutilizar o
cálculo de `ANGLE`: diferenças normalizadas multiplicadas por W/H originais,
`hypot` para os dois segmentos e `atan2(abs(dot), abs(cross)) * (180 / PI)` para TPA.
0° e 90° permanecem válidos. Escala não é dependência do TPA; cada comprimento
local em mm usa a escala salva e fica indisponível separadamente se ausente ou
numericamente inválido. A precisão é conservada até a formatação da apresentação.
Valores não finitos, segmentos nulos e underflow simultâneo de dot/cross não
produzem uma prévia inventada. Pontos coincidentes continuam válidos para o comando:
salvar o conjunto e obter TPA calculável são resultados distintos.

Quadro e card compartilham a mesma geometria/estimativa, identificada por `≈` e
origem local. Durante o arraste, a geometria fica transitória no visualizador e a
prévia do workspace é vinculada à imagem, client, revisão, geração, método/pontos,
ferramenta, espelhamento e disponibilidade. Somente terminar o gesto confirma os
pontos no rascunho; não há escrita por movimento. Escape, cancelamento/perda de
captura, blur e mudança de contexto restauram a geometria anterior ao gesto,
preservando outros ajustes já feitos. Soltar com coordenadas inválidas não confirma
o gesto; coincidir uma dupla deixa a estimativa indisponível, sem reaproveitar TPA
anterior ou impedir uma entrada que o backend aceita.

Valores oficiais antigos nunca aparecem sobre a geometria alterada. Durante o
rascunho alterado ou gesto, a apresentação usa a prévia ou indisponibilidade local;
aceitação por protocolo e validação clínica oficiais não acompanham a estimativa.
Um editor limpo pode mostrar o resultado oficial da mesma revisão. Pontos continuam
verdes, segmentos/valor ciano e numeração legível/estável no espelhamento e zoom.

A entrada pública permanece desabilitada. Composição final do card, troca explícita
de método, olhinho, confirmação/cancelamento de salvamento e protocolo ficam na
etapa 9; remoção/habilitação na etapa 10. Calibração, sua linha de Distância, demais
medidas, documento salvo e parâmetros TPLO não são modificados pelo ajuste local.

**Revisão de conclusão, item a item:**

- Ajuste de ponto e translação do corpo ligados ao rascunho completo, com commit
  atômico, preservação do método e coordenadas não alteradas mantidas exatamente.
- Seleção dos quatro pontos/conjunto no card e nudge do mesmo alvo pelo teclado,
  usando pixels originais, espelhamento, Shift e limites da imagem.
- Fórmula e ordem de operações conferidas contra as decisões da etapa 0 por
  revisão estática; TPA/estimativas em mm compartilhados por quadro e card, com
  `≈`, sem calibração como dependência do TPA e sem valores calculados no comando.
- Geometria alterada usa somente estimativa/indisponibilidade local, sem TPA antigo
  ou aceitação oficial. Pontos coincidentes permanecem persistíveis com prévia
  indisponível; 0°/90° não são tratados como erro.
- Cancelamento restaura o snapshot anterior ao gesto; revisão, geração/contexto,
  leitura, disponibilidade e captura protegem o dono da edição. Nenhuma escala,
  outra medida ou dado remoto é alterado por movimento.

Revisão independente sem pendências acionáveis. TypeScript aprovado; lint dos doze
módulos de código sem erros, com somente o aviso preexistente de `<img>` no
visualizador. JSON, paridade das 1.143 chaves pt-BR/en e placeholders das referências
aprovados; whitespace conferido nos dezesseis arquivos desta etapa, incluindo os
não versionados. Nenhum teste automatizado/funcional, gravação remota ou execução
do backend realizado. Aceite de interação permanece manual na etapa 11.

#### Revisão pessoal complementar — cálculo puro de `landmarks-preview`

Revisão solicitada pelo usuário em 09/11/2026, realizada diretamente pelo agente
principal, sem delegação. Não foi encontrado defeito acionável na implementação
do cálculo em relação à fórmula e ao contrato registrados na etapa 0. Não foi
necessário alterar código de implementação.

Conferência algébrica e de fluxo, sem executar casos de teste:

| Item | Conclusão da revisão estática |
| --- | --- |
| Vetores | Subtrai os pontos antes de multiplicar cada eixo por W/H originais; não usa a área exibida, o zoom ou a fórmula normalizada de `ANGLE`. |
| Convenção | `atan2(abs(dot), abs(cross))` fornece o complemento do ângulo agudo entre as direções; os argumentos estão na ordem exigida para TPA. |
| Limites | Dot zero com cross não nulo produz 0°; cross zero com dot não nulo produz 90°. Zero não é tratado como ausência na apresentação. |
| Invariâncias | Inverter uma dupla troca os sinais de dot/cross; espelhar horizontalmente troca o sinal de cross; os valores absolutos conservam o TPA. Translação conserva as diferenças. |
| Degeneração | `hypot` nulo em qualquer segmento torna a prévia indisponível, sem alterar a validade do comando de referências coincidentes. |
| Escala | TPA é calculado antes e independentemente da calibração. Cada comprimento é `hypot` em pixels multiplicado pela escala salva, com indisponibilidade própria para resultado não finito/não positivo. |
| Precisão | O helper não arredonda coordenadas, TPA ou comprimentos e não muta seus argumentos; o arredondamento é apenas de apresentação. |
| Integração | O caller exige dimensões originais e guards de revisão/leitura/DICOM/contexto; preview e resultado oficial têm origem identificada. O comando restrito contém somente método/pontos e revisão. |

Os casos analíticos da etapa 0 foram reconferidos por álgebra: vetores
perpendiculares → 0°; paralelos → 90°; `(500,500)` e `(0,500)` → 45°;
`(1000,500)` e `(0,500)` → `atan(1/2)`, aproximadamente 26,565051°.
Este último caso confirma a correção do tratamento de matrizes retangulares.
Essas conclusões não são resultados de testes executados.

Limite numérico explícito: overflow de dot/cross ou underflow simultâneo de ambos
gera indisponibilidade conservadora. Não foi adicionada reescala dos vetores nem
outro algoritmo numérico. Isso evita apresentar `atan2(0,0)` como TPA válido;
não constitui uma afirmação de paridade bit a bit com o servidor nos extremos.

Limite da reconferência de fonte: o clone local do backend não contém o commit
fixado `ea242ce971412f371c8004d64630289055b53ad4`, e a tentativa de leitura pública
dos links fixados não retornou a fonte. Assim, esta revisão confirma o código
contra o contrato/fórmula já documentados; não repete a conferência direta daquela
revisão do backend nem comprova equivalência executável entre as duas linguagens.
As evidências históricas da etapa 0 permanecem registradas separadamente.

O repositório do backend é estritamente somente leitura por instrução do usuário.
Nenhuma alteração, checkout, fetch, instalação, execução ou escrita remota foi
realizada nele. Não houve acesso a credenciais nem execução/acréscimo de testes.
Nesta revisão foi alterada somente esta documentação do frontend.

### 9. Conectar entrada, card e salvamento

- Acrescentar a opção sob Planejamento no painel direto de Ferramentas, sem
  misturá-la às quatro opções atuais de Medidas ou criar outra etapa de navegação.
- Compor o card compartilhado: TPA, método conforme contrato, quatro pontos,
  exibição por olhinho e ação de remoção. Evitar controles sem suporte no backend.
- Integrar X/check perto da marcação, após o gesto, e feedback pelo Sonner.
- Ligar salvar/conferir/cancelar, foco, recuperação, tool ativa e proteção de saída.
- Usar a consulta de protocolo existente, cache da organização e dados já carregados;
  não introduzir loader bloqueante ao voltar à aba nem consulta por movimento.

**Entrega:** integração de ponta a ponta com UI traduzida em pt-BR/en. Só habilitar
a entrada quando também houver remoção e recuperação revisadas na etapa 10.

#### Implementação da etapa 9 — card, salvamento e consulta do protocolo

Ferramentas recebe a opção Referências anatômicas sob Planejamento, usando
`CasePanelChoice`, separada de Medidas e sem página intermediária. Seu handler
abre/retoma o único editor, mas a entrada pública continua explicitamente
desabilitada até a conclusão da remoção na etapa 10.

O card compartilhado compõe resultado oficial/estimativa, método, seleção dos
quatro pontos/conjunto, ajustes, reposicionamento e exibição do TPA por olhinho.
O método usa somente os dois valores aceitos no contrato, com troca explícita
no rascunho, sem conversão ou movimento de pontos. O método salvo permanece a
seleção inicial; conjunto novo conserva o padrão do backend. A visibilidade usa
somente `hiddenLandmarksValue` no cache local da imagem e não oculta a geometria
nem adiciona flags ao documento. A lixeira é um slot desabilitado; a extensão
compartilhada aceita o singleton sem UUID, mas nenhuma intenção de remoção ou
diálogo foi conectado nesta etapa.

`CaseImageLandmarksActions` reutiliza X/check compactos de `ViewerEditActions`,
com âncora junto à geometria. Eles ficam ocultos durante arraste/setas. A criação
parcial não oferece salvamento; o reposicionamento provisório precisa voltar ao
ajuste antes da confirmação. `useLandmarksSaveActions` liga envio explícito,
conferência, Sonner e retorno/foco ao writer compartilhado. O PATCH/BFF/PUT, comando
estrito, revisão, recibo e reconhecimento existentes permanecem as únicas fontes
da escrita e da confirmação.

Resposta incerta e recibo remontado em saving/checking sem requisição ativa usam
somente o GET de conferência, sem repetir PUT. Conflito exige descarte explícito;
erro/leitura falha conserva o rascunho e permite a recuperação correspondente.
A confirmação limpa somente o rascunho reconhecido pelo writer. Depois de salvar,
o card retorna à leitura/seleção, restaura o foco do visualizador e oferece Editar
referências explicitamente; não reabre outro editor antes de processar o ack.
Contexto, geração do editor e identidade do client/caso/imagem protegem resultados,
erros assíncronos, mensagens e foco. Os guards de saída existentes continuam
incluindo o rascunho e o recibo de referências.

O protocolo usa `tploClinicalProtocolQueryOptions` e a chave existentes, no cache
da organização, habilitado somente com Ferramentas/Referências ativos e imagem
pronta. O cache é conservado ao sair/voltar; há atualização explícita por GET e
nenhuma consulta por movimento. A leitura aparece dentro do card sem bloquear
posicionamento, cálculo ou salvamento. `configured=false`, falha de consulta,
ausência de tolerância específica de TPA e protocolo configurado são estados
distintos. Não se infere tolerância a partir de `acceptance_enabled`.

A configuração disponível no ambiente fica separada da comparação oficial da
revisão salva e de validação clínica. Não se inventam versão/tolerância ausentes,
nem se calculam decisões de aceitação no cliente. O backend e suas credenciais
permanecem intocados; nenhuma execução ou gravação clínica foi feita nesta entrega.

A revisão independente identificou que a geração do rascunho fazia X/check
reaparecerem entre nudges de uma seta mantida pressionada. O controle de teclado
agora preserva esse estado durante nudges e na transição Pan → Marcar, mas continua
reiniciando por identidade, revisão, imagem/dimensões, espelhamento e bloqueios.
O dono dos gestos do ponteiro conserva a geração e a ferramenta originais.

A revisão final do descarte também conferiu a resposta de conflito sem hint de
revisão (aceita pelo BFF existente). Se o GET de recuperação falhar nesse caso,
descartar a intenção agora reinicia somente a query desse plano para exigir uma
leitura atual antes de exibir resultados oficiais; não torna o cache antigo
confirmado apenas por limpar o recibo. O helper compartilhado conserva os caminhos
de erro definitivo e de conflito com revisão atual já confirmada.

**Revisão de conclusão, item a item:**

- Opção sob Planejamento e handler de abertura/retomada conectados; entrada pública
  e lixeira explicitamente desabilitadas até a etapa 10, sem UUID inventado.
- Card compartilhado com TPA, método preservado/troca explícita, quatro pontos,
  ajustes e olhinho local; nenhuma flag de apresentação entra no documento remoto.
- X/check ancorados à marcação, ocultos durante arraste/setas, com estados de
  envio, GET de conferência, conflito, erro de leitura e cancelamento explícito.
- Salvamento usa somente o writer existente; retorno à seleção/foco, preservação
  do rascunho em falhas e guards de contexto/geração/saída conferidos. Corrigido o
  descarte de conflito sem revisão conhecida para impedir confirmação do cache antigo.
- Consulta de protocolo reutilizada no cache da organização, com atualização
  explícita, carregamento não bloqueante e configuração distinta de falha de
  consulta; geometria, aceitação oficial e validação clínica permanecem separadas.

Revisão independente com as correções reavaliadas e sem pendências acionáveis.
TypeScript aprovado; lint dos treze módulos de código sem erros, com somente o
aviso preexistente de `<img>` no visualizador. JSON sem chaves duplicadas, paridade
das 1.173 chaves pt-BR/en e placeholders das referências aprovados; whitespace
conferido nos dezessete arquivos desta etapa, incluindo os não versionados.
Nenhum teste automatizado/funcional, gravação remota, acesso a credenciais ou
acesso/alteração/execução do backend realizado nesta etapa. Aceite manual na etapa 11.

### 10. Remover o conjunto e habilitar a entrada

- Lixeira confirma a remoção do conjunto inteiro, com captura da revisão e
  intenção exibidas. Não simular DELETE individual de um ponto obrigatório.
- Cancelar a confirmação preserva o rascunho; confirmar usa `landmarks-clear`.
- Tratar ausência já observada, conflito e resposta incerta sem repetir escrita.
- Preservar calibração, linha compartilhada de Distância/Círculo, ângulos e
  parâmetros TPLO. O backend recalcula o estado de seus resultados dependentes.
- Após remoção confirmada, limpar apenas a seleção/edição correspondente, restaurar
  foco e aguardar nova criação explícita. Habilitar a entrada após revisão integral.

**Entrega:** criar, ler, ajustar, salvar, reabrir e remover disponíveis com o mesmo padrão.

#### Entrega da etapa 10

- `useLandmarksDeletion` captura a revisão, o método/quatro pontos salvos, a
  intenção local exibida e a identidade da query/contexto/geração. O diálogo
  `CaseImageLandmarksDeleteDialog` confirma o conjunto inteiro, sem UUID nem
  exclusão individual de ponto. Cancelar antes da confirmação mantém exatamente
  o rascunho; confirmar troca explicitamente a intenção por `landmarks-clear`.
- O comando confirmado é submetido pelo writer compartilhado, sem endpoint novo,
  cálculo enviado ou autosave. Respostas incertas permitem somente conferência
  por GET; o diálogo é reconstruído pelo clear pendente após remontagem. Erro
  definitivo permite nova tentativa explícita; conflito exige carregar o salvo,
  com descarte explícito da intenção, sem rebase/reaplicação automática.
- A confirmação revalida revisão, conjunto salvo, editor, query e contexto antes
  da transição. Ausência/nulidade em revisão posterior é reconhecida sem nova
  escrita e sem exigir desaparecimento de `tplo_measurement`. Atualização
  concorrente é apresentada antes de consumir a decisão de descarte.
- Clear dispensa dimensões, escala e preflight de anisotropia; conserva os guards
  de imagem READY, caso/contexto, exclusão, revisão e writer. A seleção somente
  para leitura permite consultar/remover um conjunto salvo quando a geometria
  impede editá-lo. O gate global de Ferramentas continua seguindo a calibração
  do produto, conforme a decisão da etapa 0; isso não altera a semântica do TPA.
- O diálogo bloqueia gestos e ações contextuais, usa o portal no fullscreen,
  conserva o foco ao cancelar e o restaura na entrada/visualizador ao concluir.
  Confirmação limpa somente o rascunho correspondente; permanece sem conjunto
  até uma nova criação explícita. O merge restrito existente conserva calibração,
  objetos e parâmetros TPLO; apenas referências e derivados são invalidados.
- A entrada pública em Ferramentas → Planejamento está habilitada com os mesmos
  bloqueios de contexto, alterações pendentes e recuperação. O fluxo de salvar
  calibração/recalibração → Ferramentas → Distância na linha salva foi preservado.

**Checagens estáticas:** TypeScript aprovado; lint dos cinco arquivos de código
da etapa sem erros/avisos; JSON pt-BR/en válidos, 1.183 chaves em cada locale,
sem duplicatas e com paridade de chaves/placeholders. Whitespace conferido nos
nove arquivos da etapa, incluindo os não versionados. A revisão lógica cobre
cancelamento, rascunho alterado, concorrência, resposta incerta, retorno tardio,
remoção já observada e ausência de recriação automática. Sem testes automatizados,
funcionais ou E2E, gravações remotas, credenciais ou acesso/alteração/execução do
backend nesta etapa. A validação de interação permanece para a etapa 11.

#### Ajuste de apresentação aprovado após a etapa 10 — 10/11/2026

A entrada pública passa a se chamar **TPA**. O catálogo deixa de exibir a opção
futura desabilitada de medidas adicionais; os acessos às medidas disponíveis e
aos círculos anteriores permanecem. Selecionar TPA com conjunto salvo abre consulta;
**Editar pontos** inicia explicitamente o editor. Um rascunho existente é retomado.
Sem conjunto, o fluxo orienta a marcação; após remover/cancelar, **Marcar pontos**
permite iniciar novamente por decisão explícita, sem recriação automática.

O posicionamento destaca ponto atual, nome e orientação curta; a lista completa
permanece em **Revisar pontos**. O card dá prioridade ao TPA, à estimativa `≈` e
aos estados salvo/não salvo/leitura não confirmada. Comprimentos, revisão, legenda
e comparação detalhada ficam em **Detalhes da medida**; seleção de ponto, troca
de método, ajuda/atalhos e protocolo usam seções expansíveis nativas, acessíveis
por teclado e toque. O método atual continua identificado por um nome compacto;
trocar exige edição e ação explícita, preservando os quatro pontos.

Erros de leitura/protocolo, conflito, recuperação, indicação de validação clínica
não realizada e resultado fora da tolerância não ficam escondidos nas seções
fechadas. Falha de leitura oferece nova consulta na própria área TPA, inclusive
sem conjunto salvo. X/check junto à marcação, cancelamento
de gesto, foco, remoção/recuperação, limites e todas as proteções do writer são
preservados. Não há alteração do cálculo, contrato, protocolo remoto, calibração
ou de seu retorno a Distância na linha salva. A organização foi ajustada por
finalidade da tarefa, sem pressupor usuários anteriores na plataforma.

TypeScript e lint dos oito componentes alterados aprovados, sem erros/avisos.
Traduções pt-BR/en válidas com 1.199 chaves em cada locale, sem duplicatas e com
paridade de chaves/placeholders. Whitespace inclui os arquivos não versionados.
Revisão estática independente de estados e interação concluída; os ajustes de
acesso direto à nova consulta e de indicação clínica visível foram revisados
novamente sem pendências acionáveis. Verificação visual, de teclado/toque e demais
testes funcionais continuam pendentes para o
aceite manual. Nenhum teste automatizado ou funcional, gravação remota, acesso a
credenciais ou acesso/alteração/execução do backend nesta rodada de apresentação.

### 11. Aceite manual integrado

- Usuário verifica criar → ajustar quatro pontos → salvar → recarregar → reabrir
  → editar → cancelar/salvar → remover/cancelar confirmação → criar novamente.
- Conferir método salvo, ambos os métodos suportados, TPA, escala, comprimentos,
  protocolo configurado/não configurado e estados sem resultado, conforme etapa 0.
- Exercitar bordas, degeneração, imagem retangular, zoom, pan, espelhamento,
  teclado/Shift, toque e fullscreen.
- Conferir conflito, perda de resposta, autenticação, troca de organização,
  troca/exclusão de imagem/caso e cliques repetidos em confirmar.
- Revalidar calibração/recalibração com retorno a Distância, seus modos circulares,
  Ângulo, círculos anteriores e ocultação de overlays fora da ferramenta ativa.

**Entrega:** aceite manual registrado e ajustes resolvidos. Checagem estática
não substitui essa validação e nenhuma etapa pode ser marcada por antecipação.

## Checklist de acompanhamento

- [x] 0 — Fonte, métodos, dependências, decisões e protocolo do ambiente conferidos.
- [x] 1 — Schemas, comandos, merge restrito e reconhecimento implementados.
- [x] 2 — Transporte e BFF.
- [x] 3 — Writer, recibos e recuperação.
- [x] 4 — Estado, rascunho e escopo.
- [x] 5 — Visualizador e geometria.
- [x] 6 — Leitura e resultado oficial.
- [x] 7 — Posicionamento inicial.
- [x] 8 — Ajuste e prévia.
- [x] 9 — Card, entrada preparada (desabilitada) e salvamento.
- [x] 10 — Remoção e habilitação.
- [ ] 11 — Aceite manual integrado.
