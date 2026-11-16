# Plano de implementação — Círculo

Status em 06/11/2026 — etapas 0 a 10 implementadas. Etapa 11 de aceite manual pendente.
Contrato público e fonte anunciada conferidos para esta implementação.
Seguiremos etapas curtas, com revisão de código a cada entrega e validação
funcional manual pelo usuário após a integração completa.

## Card de edição no quadro — 09/11/2026

O menu de ícones foi substituído por um card escuro compacto com rótulos.
`ViewerMeasurementCard`, `ViewerMeasurementSection` e `ViewerMeasurementAction`
compartilham a apresentação entre Distância, Ângulo e círculos anteriores.
Cabeçalho com exclusão, valor atual, modos, ajustes e exibição ficam no mesmo
card, sem expansão lateral. No modo circular da linha, Raio/Diâmetro ficam
visíveis. O card de Ângulo expõe os três pontos e os seis presets existentes.
X/check permanecem próximos à marcação, fora do card, após o término do gesto.
Geometria, cálculos, salvamento e recuperação mantêm os mesmos contratos.
Mover é uma interação direta no corpo da marcação, sem botão no card.
Exibição usa rótulo estático e olhinho sem destaque persistente; ocultar o valor
continua sendo somente uma preferência de apresentação.
Aceite visual e funcional permanece com a validação manual do usuário.
O painel Ferramentas abre diretamente as opções sob o rótulo Medidas, sem
etapa intermediária. Calibração, recuperação e seleção retornam a esse painel.

## Ajuste do fluxo pela referência — 09/11/2026

O acesso principal a Círculo passa a reutilizar a `LINE` salva a partir da
calibração. O menu no quadro oferece Raio e Diâmetro sobre os mesmos dois
pontos; o acesso a Distância retorna à linha sem círculo. Raio desenha a circunferência com centro no ponto inicial;
Diâmetro usa o ponto médio. A linha ciano permanece e a circunferência usa o
token amarelo suave `#D6C66B` do DS. Os contornos circulares usam
`--radiograph-circle-stroke-width` (`1.25px`) e a linha permanece sólida durante
a edição. Os controles de extremidades, prévia, olhinho, confirmação,
cancelamento e exclusão pertencem à mesma linha.

Essas circunferências são guias visuais da `LINE`, sem criar objetos `CIRCLE`
adicionais. O valor-base confirmado continua sendo o comprimento calculado
pelo backend; a prévia durante a edição usa a escala salva, como em Distância.
Não se enviam medidas calculadas pelo navegador e não se publica um resultado
de circunferência como se tivesse sido devolvido pela API. O contrato não oferece
uma relação persistente entre `LINE` e `CIRCLE`.

A escolha Comprimento/Raio/Diâmetro é uma preferência de visualização por
imagem/linha no cache da sessão, como o olhinho. Ela não é salva no plano remoto.
Ao calibrar ou recalibrar, o fluxo volta a Comprimento na mesma linha salva.
A referência `REFERENCE_CIRCLE` continua sendo enviada como centro, borda e
diâmetro conhecido; na interface, seus controles e movimentos usam o diâmetro.

Objetos `CIRCLE` anteriores permanecem acessíveis em “Círculos salvos
anteriormente”, para leitura, edição e exclusão pelo contrato já implementado.
Rascunhos e recibos anteriores mantêm sua recuperação. A criação independente
foi retirada da interface. As etapas abaixo registram essa integração anterior;
as novas opções usam o fluxo compartilhado descrito nesta seção.

Verificação desta alteração: revisão do código e checagem estática. O aceite
funcional permanece manual, incluindo salvar/reabrir a linha nos três modos,
recalibrar, alternar painéis, espelhar, ocultar o valor e excluir a medida.

## Objetivo

Integrar `CIRCLE` em Ferramentas → Medidas → Círculo, cobrindo criação,
seleção, edição, prévia, salvamento, reabertura e exclusão com confirmação.
O fluxo segue os padrões entregues em Distância e Ângulo.

- Geometria com centro e ponto da borda, em coordenadas normalizadas.
- Criação explícita, UUID estável e confirmação pelo usuário.
- Diâmetro como leitura inicial definida, com raio e circunferência disponíveis
  pelos campos publicados pelo backend. A escolha é apresentação local.
- Menu escuro no quadro, expansão somente da linha acionada, tooltips e
  divisórias entre escolhas. O painel lateral lista as ferramentas de Medidas.
- Olhinho para o valor, lixeira com confirmação e `ViewerEditActions` para X/check.
- Marcação circular amarela com o token `--radiograph-mark-interest` do DS.
- Um rascunho com alterações por imagem, coordenado com as outras ferramentas.

A calibração fornece a escala da imagem. A ferramenta Círculo cria um objeto
de medida `CIRCLE`, enquanto a referência circular de calibração usa
`REFERENCE_CIRCLE`. O salvamento da calibração encaminha para Distância.

## Contrato conferido em 06/11/2026

O Swagger público continua anunciando versão `0.9.0`, branch `protese` e commit
`ea242ce`, correspondente à revisão completa já identificada no projeto,
`ea242ce971412f371c8004d64630289055b53ad4`.

| Item | Regra publicada |
| --- | --- |
| Objeto | `type: CIRCLE`, `id`, `center`, `edge`, `label`, `visible`, `locked`, `measurement`. |
| Coordenadas | `center` e `edge` com `x/y` finitos entre 0 e 1. |
| Raio positivo | O validador recusa centro igual à borda. |
| Apresentação | Defaults publicados de `visible=true` e `locked=false`. |
| Resultado | `measurement.status`, `calibration_id`, `values`, `units`. |
| Valores | `radius`, `diameter`, `circumference`. As três unidades são `mm`. |
| Dependências | Dimensões originais e escala derivada da calibração. |
| Estados | `CALCULATED`, `CALIBRATION_REQUIRED`, `IMAGE_DIMENSIONS_REQUIRED`. |
| Leitura | `GET /api/v1/images/{image_id}/plan`. |
| Escrita e exclusão | `PUT` do plano com `base_revision` e `document`, usando os comandos restritos do BFF do frontend. |

A fonte calcula a distância em pixels originais e deriva primeiro o diâmetro.
A prévia seguirá essa ordem de operações para raio e circunferência.

```text
dx = (edge.x - center.x) * width_px
dy = (edge.y - center.y) * height_px
distance_px = hypot(dx, dy)
diameter_mm = 2 * distance_px * mm_per_pixel
radius_mm = diameter_mm / 2
circumference_mm = pi * diameter_mm
```

O resultado calculado inclui o `calibration_id` da escala vigente. A leitura
oficial precisa conferir esse identificador, os valores finitos e positivos e
as unidades. A prévia será calculada dos pontos locais, dimensões originais e
escala salva, com fonte identificada como local. O salvamento envia a geometria
e usa o resultado oficial retornado pela API.

Os validadores conferidos limitam centro e borda. A circunferência pode ultrapassar
o quadro quando esses pontos são válidos. O desenho será recortado pelo quadro,
preservando o raio da geometria salva. As condições de disponibilidade de
dimensões, escala e DICOM estão consolidadas na entrega da etapa 0.

Fontes primárias consultadas por GET público. A leitura de fonte estabelece o
contrato de implementação, e o aceite contra o serviço autenticado está previsto
na etapa 11. [Swagger](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/docs), [schemas](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/api/schemas.py), [cálculo](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/domain/planning/measurements.py).

## Reaproveitamento da arquitetura

| Área | Integração prevista |
| --- | --- |
| Schema de leitura | `image-plan.schema.ts` já reconhece CIRCLE. Acrescentar entrada editável estrita. |
| Comandos | Ampliar `image-plan-command.schema.ts` com `circle-create`, `circle-update`, `circle-delete` e dono `circle`. |
| Transporte | `image-plan-api.ts`, rota `/plan/edits` e `image-plan-bff.ts`, com os limites e validações existentes. |
| Writer e recibo | `image-plan-saving.ts` e `calibration-save-state.ts`, compartilhados por imagem. |
| Rascunhos | `image-plan-draft.ts`, `use-image-plan-drafts.ts`, `use-workspace-draft.ts` e query keys próprias de Círculo. |
| Geometria | Conversões de `image-point-space.ts` e operações geométricas compatíveis de `circle-marker-interaction.ts`. |
| Visualizador | Variante explícita de Círculo em `ViewerEditor` e camada própria de medida circular. |
| Menu | `ViewerButton`, `ViewerToolAction`, tooltips do visualizador e CSS de expansão compartilhado. |
| X/check | `ViewerEditActions`, com as condições e mensagens de Círculo fornecidas pelo consumidor. |
| Apresentação | `use-image-display-settings.ts`, com visibilidade e modo de leitura próprios. |
| Entrada | `case-image-tools-panel.tsx` e orquestração em `case-image-workspace.tsx`. |

A auditoria de integração deve cobrir os consumidores atuais que enumeram
somente Distância e Ângulo. Inclui `measurementEdit` no BFF, donos e reconhecimento
de recibos no writer, observadores de rascunho, transição entre editores limpos,
nomes de objetos e limpeza das queries na exclusão de imagem/caso.

## Etapas

### 0. Consolidar o contrato e as decisões de Círculo

- Fixar campos, unidades, fingerprint e fórmula da fonte conferida.
- Conferir limites centro/borda, raio positivo e circunferência parcialmente externa.
- Fixar diâmetro inicial, opções de leitura e política de dimensões/DICOM.
- Registrar casos analíticos para imagens quadradas e retangulares e recalibração.

**Entrega** — Decisões de cálculo, leitura e desenho prontas para os comandos.
**Aceite** — Cada decisão tem fonte ou está identificada como regra do produto.

#### Entrega da etapa 0 — 06/11/2026

As decisões seguem o contrato e a fonte da revisão `ea242ce`, já consultados
nesta rodada. A leitura de `PlanCircle` confirma centro/borda normalizados,
raio positivo, UUID, label e flags. O resultado oficial usa os três campos em
mm, status calculado e `calibration_id` correspondente à escala vigente.

O produto iniciará a leitura por diâmetro. Raio e circunferência serão opções
locais de apresentação. O desenho será circular em pixels originais e amarelo
com o token do DS. A posição da borda determina o raio, inclusive quando uma
parte da circunferência fica fora do quadro. A criação usa centro e borda como
dois pontos próprios da ferramenta.

As condições atuais de Ferramentas exigem imagem/prévia pronta, dimensões
originais e calibração com resultado confirmado. Para DICOM, qualquer espaçamento
disponível em `pixel_spacing_mm` ou `imager_pixel_spacing_mm` com
`abs(row / column - 1) > 1e-6` bloqueia a edição. Essa é a política atual do
produto, compartilhada pelo frontend/BFF. O cálculo publicado usa uma escala
escalar por pixel e as dimensões originais. A etapa 2 aplicará esses guards ao
transporte de Círculo.

Casos analíticos de referência com escala de `0,1 mm/px`, deduzidos da fórmula.
Os valores da tabela são ideais matemáticos para o aceite futuro. O código de
prévia seguirá os floats dos pontos, com arredondamento apenas na apresentação.

| Dimensões | Centro / borda | Raio em mm | Diâmetro em mm | Circunferência em mm |
| --- | --- | --- | --- | --- |
| 1000 × 1000 | (0,5; 0,5) / (0,6; 0,5) | 10 | 20 | 20π |
| 2000 × 1000 | (0,5; 0,5) / (0,6; 0,5) | 20 | 40 | 40π |
| 2000 × 1000 | (0,5; 0,5) / (0,5; 0,6) | 10 | 20 | 20π |
| 2000 × 1000 | (0,5; 0,5) / (0,6; 0,6) | 10√5 | 20√5 | 20π√5 |
| 1000 × 1000 | (0; 0,5) / (0,1; 0,5) | 10 | 20 | 20π, com parte do desenho externa |

Centro igual à borda será recusado na entrada editável. Em uma recalibração
que dobre `mm_per_pixel`, os três valores dobram para os mesmos pontos. A
referência/dimensões determina o fingerprint da escala e a leitura precisa
conferi-lo para reconhecer o resultado atual. Esses cenários ficam na matriz
de validação manual com o serviço real.

### 1. Definir comandos e merge restrito

- Criar `PlanCircleInputSchema` e comandos estritos create/update/delete.
- Implementar `isCircleCommand`, dono e reconhecimento por UUID, revisão e pontos.
- Aplicar alterações somente ao CIRCLE alvo, preservando os demais campos do plano.
- Recusar alvo bloqueado, UUID ambíguo, raio nulo e criação acima do limite global.

**Entrega** — Operações puras prontas para o transporte.
**Aceite** — Geometria e identificação confirmam o comando, com derivado oficial posterior à escrita.

#### Entrega da etapa 1 — 06/11/2026

- `CircleGeometry` e `circleHasValidRadius` concentram a regra de raio positivo.
  `PlanCircleInputSchema` valida UUID, tipo, centro/borda finitos em `[0,1]` e
  label. O schema de leitura conserva a geometria legada e os defaults das flags.
- `CreateCircleSchema`, `UpdateCircleSchema`, `DeleteCircleSchema` e
  `SaveCircleSchema` validam somente intenção, revisão, UUID e campos editáveis
  da operação. IDs de comando são normalizados para minúsculas. O resultado
  derivado e as flags pertencem à resposta/documento do servidor.
- `applyPlanCommand` cria, atualiza e exclui apenas o CIRCLE indicado. Verifica
  unicidade global de IDs, tipo do alvo, bloqueio e limite global de 500 objetos.
  Atualizar retira o derivado antigo do alvo e conserva seu nome e flags. Os
  outros objetos e os demais campos do documento são preservados pelo merge.
- `planCommandMatches` exige revisão posterior, UUID e centro/borda exatos,
  conferindo também o nome na criação. A exclusão exige ausência do UUID no
  plano posterior. O reconhecimento da geometria é independente da disponibilidade
  posterior de `measurement`, evitando repetir uma escrita já confirmada.
- `isCircleCommand` e `planCommandOwner` identificam a família `circle`.
  `nextPlanObjectLabel` aceita CIRCLE para os futuros rascunhos, reutilizando
  a regra de nomes usada por Distância e Ângulo.

Na entrega da etapa 1, `PlanMutationSchema` inclui Círculo nas operações puras. A união
operacional `SavePlanEditSchema` continua delimitando a rota, o serviço e o
writer aos comandos já integrados. A etapa 2 registrará Círculo nessa união
junto dos guards do BFF e unificará o contrato usado pelas operações puras.
Essa sequência vincula a abertura do transporte à sua política de geometria.

O aceite funcional permanece na etapa 11. A revisão desta entrega cobre
schemas, merge, reconhecimento, classificação de dono e compatibilidade dos
consumidores existentes.

**Revisão de conclusão** — TypeScript do web aprovado e `git diff --check`
aprovado. Conferidos os quatro itens de cada etapa, incluindo casos de borda,
raio nulo, comparação de UUID sem distinguir caixa, revisão posterior,
remoção do derivado do alvo e delimitação da união operacional. O aceite
funcional e a execução dos cenários com a API real ficam na etapa 11.

### 2. Conectar serviço, rota e BFF

- Registrar Círculo nas uniões operacionais usadas pelo serviço e pela rota.
- Usar o PATCH same-origin, autenticação, organização, origem e limite de corpo existentes.
- Incluir Círculo nos guards de medida, revisão, escala, dimensões e DICOM.
- Conferir imagem, próxima revisão e reconhecimento da resposta.

**Entrega** — Comandos de Círculo chegam ao PUT do plano pelo transporte padrão.
**Aceite** — O cliente envia apenas os campos editáveis autorizados da operação.

#### Entrega da etapa 2 — 06/11/2026

- `SavePlanEditSchema` registra as três operações de `SaveCircleSchema` na união
  operacional. `PlanSaveCommandSchema` é o contrato usado também pelo merge,
  reconhecimento e classificação de dono das operações puras.
- `saveImagePlanEdit` aceita Círculo pelo schema compartilhado e envia o PATCH
  same-origin para `/plan/edits`, com JSON, credenciais e contexto da organização.
  A leitura da resposta confere imagem, próxima revisão e comando reconhecido.
- A rota aplica autenticação, organização esperada, origem confiável e tipo de
  conteúdo. Círculo recebe o limite de 4 KiB medido nos bytes UTF-8 efetivos,
  incluindo espaços e escapes. Qualidade radiográfica usa seu limite de 12 KiB.
- O BFF inclui `circle` na classificação de medidas. Antes do merge exige
  imagem READY pertencente ao caso, dimensões originais, política DICOM,
  calibração com resultado, revisão correspondente e unicidade global dos IDs.
  O merge da etapa 1 valida o tipo/bloqueio do alvo e os campos editáveis.
- O PUT recebe a revisão observada e o documento do servidor com a alteração
  restrita ao CIRCLE. A resposta exige a mesma imagem, revisão seguinte e
  reconhecimento de UUID/pontos ou ausência após exclusão. A confirmação de
  geometria admite resultado derivado ainda indisponível.
- O percurso conserva a classificação das falhas definitivas, conflitos e
  resultado incerto após início da escrita. O serviço propaga o estado incerto
  para a recuperação que será conectada na etapa 3.

| Operação | Dimensões e política DICOM | Calibração confirmada |
| --- | --- | --- |
| Qualidade radiográfica | Disponibilidade independente da geometria. | Disponibilidade independente da escala. |
| Calibração | Exigidas pela política de geometria. | Produz a escala. |
| Distância, Ângulo e Círculo | Exigidas pela política atual de Ferramentas. | Exigida pela política atual de Ferramentas. |

**Revisão de conclusão** — TypeScript do web aprovado e `git diff --check`
aprovado. Revisados os quatro itens previstos, os guards do BFF, o limite da
rota, a discriminação das famílias e a conferência de resposta no serviço/BFF.
O próximo passo conecta recibos e recuperação próprios de Círculo. O aceite
funcional com o serviço real segue na etapa 11.

### 3. Integrar writer, recibos e recuperação

- Registrar Círculo no writer e nos recibos por imagem, com dono explícito.
- Limpar somente o rascunho que corresponde ao comando confirmado.
- Conservar intenção em conflito e conferir resposta incerta por GET.
- Retomar recibo remontado e classificar `CIRCLE_ALREADY_REMOVED` quando observado.

**Entrega** — Gravação e recuperação coordenadas entre as ferramentas.
**Aceite** — Um recibo de Círculo só é consumido pela família correspondente.

#### Entrega da etapa 3 — 06/11/2026

- O writer compartilhado identifica a família `circle`, serializa as operações
  por imagem e recusa outra intenção enquanto houver uma gravação pendente.
  Um rascunho alterado de outra ferramenta também bloqueia a nova escrita.
- A confirmação compara o comando validado com o rascunho de Círculo, incluindo
  tipo da operação, revisão, UUID, geometria e nome na criação. Somente a edição
  correspondente é limpa. Uma edição ou seleção posterior é preservada.
- Conflitos conservam a intenção e exigem descarte explícito. Resultado incerto
  é conferido por GET. Revisão inalterada mantém a incerteza, enquanto revisão
  posterior exige reconhecimento do comando ou retorna conflito.
- `CIRCLE_ALREADY_REMOVED` identifica a ausência confirmada após conflito ou
  conferência da exclusão. A recuperação apresenta a remoção já observada.
- `useMeasurementSaveRecovery` concentra o mecanismo antes usado por Ângulo.
  Os wrappers de Ângulo e Círculo filtram os próprios comandos. A conferência e
  o descarte exigem o comando capturado e a mesma query, organização e imagem.
  Exclusão da imagem/caso e mudança de contexto bloqueiam callbacks antigos.
- Um recibo remontado retorna a Ferramentas → Medidas com Círculo destacado e
  ações próprias de conferência/descarte no quadro, inclusive quando a leitura
  da escala falha. Mensagens de recuperação estão disponíveis em pt-BR e en.
  O acesso público para criar/editar Círculo será habilitado na etapa 10.
- A base `CircleEditor`, as chaves de rascunho/seleção e a detecção de alterações
  foram antecipadas para permitir a correspondência exata no writer. Essa base
  participa dos guards compartilhados e da limpeza após exclusão da imagem.
  O hook de edição e suas transições locais pertencem à etapa 4.

**Revisão de conclusão** — TypeScript do web aprovado, catálogos JSON válidos
com as mesmas chaves de Círculo em pt-BR/en e `git diff --check` aprovado.
Revisados os quatro itens previstos, reconhecimento por família, limpeza exata,
retomada de recibos, deduplicação de comandos e guards de contexto/exclusão.
A validação funcional manual com o serviço real segue na etapa 11.

A tentativa de lint dos arquivos desta etapa encontrou a configuração atual
do ESLint sem parser de TypeScript. O comando interrompeu a análise em sintaxe
TS válida, como `import type`. A checagem de tipos foi realizada pelo TypeScript.

### 4. Criar estado de edição e proteções

- Acrescentar rascunho create/update/delete e seleção por QueryClient/caso/imagem.
- Modelar criação em centro, borda e geometria completa, com UUID/nome estáveis.
- Integrar rascunhos às proteções de saída, troca de ferramenta e exclusão.
- Validar alvo, revisão, dono da query e geração de contexto nos callbacks.

**Entrega** — `useImageCircle` com transições locais coerentes.
**Aceite** — Rascunhos alterados exigem confirmação ou descarte explícito para trocar de medida.

#### Entrega da etapa 4 — 06/11/2026

- `useImageCircle` coordena rascunho create/update/delete e seleção pelas chaves
  do QueryClient da organização, caso e imagem. Os dados locais sobrevivem à
  remontagem do painel e a intenção pode ser reconstruída de um recibo próprio.
- A criação começa no centro e avança para borda e geometria completa. O UUID,
  o nome e a revisão são conservados durante o posicionamento. Eventos exigem
  UUID e passo capturados. A entrada valida e copia os pontos normalizados e
  recusa raio nulo antes de registrar uma geometria completa.
- O nome utiliza `nextPlanObjectLabel` e a criação respeita o limite global de
  500 objetos. Entrar retoma um rascunho ou edita o único círculo disponível.
  Com vários salvos, aguarda seleção. `beginNew` inicia uma criação adicional
  somente quando a edição anterior está limpa. Alvos bloqueados e círculos
  legados com raio nulo podem ser selecionados para leitura.
- Cada alteração confere revisão observada, alvo visível e único, bloqueio,
  escala confirmada, dimensões, política DICOM, leituras em andamento e outra
  intenção de edição/gravação. Atualização e exclusão usam o mesmo UUID salvo.
  A confirmação de exclusão exige revisão e snapshot exato da edição exibida.
- A geração de contexto invalida callbacks após troca de imagem, organização,
  ativação da ferramenta, disponibilidade, dimensões ou espaçamento DICOM.
  A identidade da query protege o cache recriado. Os callbacks também conferem
  exclusão da imagem/caso e gravações concorrentes diretamente no cache.
- O workspace usa o hook nos guards de saída, indicação de alterações e troca
  de ferramenta. Uma edição alterada exige descarte explícito. Fechar uma
  edição limpa conserva a seleção. Recibos incertos continuam na conferência
  por GET. A geometria local fica separada do plano confirmado.

A ligação dos gestos, desenho, menus e exclusão pelo diálogo segue as etapas
5 a 10. A entrada pública de Círculo será habilitada na etapa 10.

**Revisão de conclusão** — Conferidos os quatro itens da etapa e os caminhos de
criação incompleta, seleção, edição limpa/alterada, retomada, descarte e intenção
de exclusão. Checagem estática de TypeScript e `git diff --check` aprovadas.
A validação funcional manual com a API permanece na etapa 11. A limitação do
parser de TypeScript na configuração atual do ESLint está registrada na etapa 3.

### 5. Preparar o visualizador e a geometria

- Adicionar variantes de seleção/edição de Círculo em `ViewerEditor`.
- Adaptar centro/borda para pixels originais e usar os limites inclusivos 0–1.
- Implementar desenho amarelo, alças e hit test estáveis no zoom.
- Tratar pan, espelhamento, captura de ponteiro e cancelamento do gesto.

**Entrega** — Camada geométrica própria para CIRCLE integrada ao quadro.
**Aceite** — Imagens retangulares conservam um círculo em pixels originais e o mesmo raio ao variar zoom.

#### Entrega da etapa 5 — 06/11/2026

- `ViewerEditor` oferece `circle-select` e `circle`, com canal próprio de
  geometria, seleção, revisão e geração de contexto. O adaptador converte
  centro/borda para pixels originais e retorna pontos normalizados, preservando
  pontos fixos que dispensam conversão de ida e volta.
- `circle-interaction` concentra validação, conversões, hit test, seleção,
  movimento e ajuste da borda. O raio usa a distância euclidiana em pixels
  originais. Os limites inclusivos pertencem ao centro e à borda, permitindo
  circunferência parcialmente externa conforme o contrato publicado.
- As áreas de interação usam pixels de tela, com tolerância de 12 px nas alças
  e 8 px no contorno. A seleção prioriza as alças do alvo selecionado e resolve
  empates por identificação. Clique seleciona e arraste em modo pan move a imagem.
- `ViewerCircleEditorOverlay` desenha a circunferência e as alças de centro e
  borda com `--radiograph-mark-interest`. Traço e alças conservam tamanho de tela
  durante o zoom, e o hover respeita a preferência de movimento reduzido.
- O visualizador mantém uma prévia local durante o gesto e confirma geometria
  válida após arraste deliberado. Escape, pointercancel, perda de captura,
  desfoque da janela ou troca de contexto eliminam a prévia. O espelhamento
  reflete o ponteiro antes do mapeamento e dos hit tests.
- Os gestos de CIRCLE usam discriminantes próprios, separados dos gestos do
  marcador circular de calibração. O canal preparado de teclado oferece mover,
  ajustar borda, setas, Shift, Alt e direção espelhada, com instruções pt-BR/en.

O visualizador está preparado para receber círculos selecionados e em edição.
A etapa 6 ligará os objetos salvos ao workspace, a etapa 7 ligará o posicionamento
e a etapa 8 ligará a edição à prévia das medidas. O catálogo será habilitado na etapa 10.

**Revisão de conclusão** — TypeScript do web aprovado, catálogos JSON válidos
com as mesmas chaves de Círculo em pt-BR/en e `git diff --check` aprovado.
Revisados os quatro itens previstos, limites, matriz retangular, separação dos
canais, captura/cancelamento, modo somente leitura, pan e espelhamento.
O aceite funcional no navegador com o serviço real segue na etapa 11.

### 6. Ler e apresentar círculos salvos

- Selecionar CIRCLE visível, com identificação de bloqueados e IDs ambíguos.
- Ler raio, diâmetro e circunferência oficiais, verificando unidade e calibração vigente.
- Desenhar apenas a camada da ferramenta ativa em Medidas.
- Oferecer seleção pelo quadro e pela lista compacta de valores.

**Entrega** — Círculos persistidos podem ser vistos e selecionados.
**Aceite** — Resultado ausente ou não conferido mantém geometria e informa indisponibilidade.

#### Entrega da etapa 6 — 06/11/2026

- `selectSavedCircles` seleciona CIRCLE visíveis, conserva os bloqueados para
  leitura e identifica UUIDs ambíguos sem distinguir caixa. IDs repetidos em
  qualquer família tornam a leitura dos valores indisponível e bloqueiam a
  seleção pelos guards compartilhados. A geometria continua disponível na camada.
- `confirmedCircleResult` exige geometria com raio positivo, status CALCULATED,
  calibração com resultado vigente e `measurement.calibration_id` correspondente.
  Raio, diâmetro e circunferência precisam ser finitos, positivos e expressos
  em mm. A apresentação utiliza os três campos oficiais retornados pelo backend.
- Resultado ausente, status de calibração/dimensões, fingerprint desatualizado,
  dados inválidos ou falha de leitura são estados explícitos de indisponibilidade.
  O workspace também confere a disponibilidade das dimensões originais antes de
  desenhar a circunferência e habilitar a seleção geométrica pelo quadro.
- `CircleOverlay` desenha circunferência, centro, borda e valor com o amarelo
  do DS, seguindo os pixels originais. Traço, pontos e texto têm tamanho estável
  no zoom. A posição do rótulo é limitada à imagem, e o texto conserva a orientação
  legível durante o espelhamento. Círculos degenerados legados conservam a marca
  do centro e indicação de resultado inválido.
- `CaseImageCircleValues` oferece lista compacta com seleção, valor, identificação
  acessível, motivo da indisponibilidade e ícones de bloqueio/ambiguidade.
  Quadro e lista usam a mesma seleção por imagem e recusam a troca quando existe
  uma edição alterada ou um recibo em recuperação.
- Diâmetro é a leitura inicial prevista no plano. Os componentes recebem o modo
  raio/diâmetro/circunferência, preparando a escolha local da etapa 9. A formatação
  reutiliza o padrão de comprimentos em mm de Distância, com precisão de apresentação
  separada dos valores oficiais.
- O workspace liga a camada e a lista somente em Ferramentas → Medidas com Círculo
  ativo. As abas de informações, arquivos, imagem/calibração e as outras ferramentas
  ficam fora dessa condição de exibição. A recuperação própria continua no quadro.

A criação, edição dinâmica, menu e habilitação do catálogo seguem as etapas
7 a 10. A etapa 6 apresenta os objetos persistidos em modo de seleção.

**Revisão de conclusão** — TypeScript do web aprovado, catálogos JSON válidos
com as mesmas chaves de Círculo em pt-BR/en e `git diff --check` aprovado.
Revisados os quatro itens previstos, seleção compartilhada, flags legadas,
IDs globais, conferência dos três valores/unidades e da calibração, dimensões,
falha de leitura, orientação do texto e condição de visibilidade da camada.
O aceite funcional no navegador com a API continua na etapa 11.

### 7. Conectar criação no quadro

- Posicionar centro e borda em dois cliques/toques, com progresso local.
- Oferecer posicionamento central acessível pelo teclado, usando os mesmos guards.
- Iniciar criação quando houver nenhum salvo e exigir seleção quando houver vários.
- Usar Novo círculo para criação adicional e cancelar somente o rascunho correspondente.

**Entrega** — Criação completa de um CIRCLE com identificação estável.
**Aceite** — Eventos repetidos ou antigos respeitam o passo e o UUID capturados.

#### Entrega da etapa 7 — 06/11/2026

- O modo `circle` recebe posicionamento em centro e borda. O visualizador
  confirma cada ponto no fim de um clique/toque dentro da imagem, com tolerância
  de movimento de 4 px. Arrastes, soltura externa e eventos de outro ponteiro
  conservam o passo. O segundo ponto precisa formar um raio positivo.
- `ViewerCirclePlacementOverlay` apresenta centro, cursor e circunferência
  provisória com o amarelo do DS e tamanho de tela estável. A geometria completa
  entra no rascunho pelo schema estrito, com o mesmo UUID, nome e revisão.
- `CaseImageCircleCreationControls` usa o padrão de Ângulo para progresso 1/2,
  Novo círculo, posicionamento central e cancelamento. As ações possuem nomes
  acessíveis e instruções pt-BR/en. Enter completa o posicionamento central,
  com bloqueio da repetição da tecla e das ações durante um gesto de ponteiro.
- `centeredCircleGeometry` posiciona centro em `(0,5; 0,5)` e usa raio inicial
  de 15% do menor lado em pixels originais. Essa ação substitui os pontos da
  criação em andamento. A borda é normalizada por eixo, preservando a forma
  circular em imagens retangulares. O tamanho é um ponto de partida ajustável.
- Os callbacks capturam UUID e passo pendente. `placePoint` e `placeCentered`
  conferem contexto, revisão e passo atual no cache antes da alteração. A mudança
  de ferramenta participa da geração de contexto, e o retorno de foco também
  confere QueryClient, caso e imagem.
- O workspace conecta a entrada à retomada do rascunho, criação quando não há
  salvo e seleção quando existem vários. Novo círculo exige edição anterior
  limpa. Cancelar criação descarta somente o rascunho correspondente, e a camada
  dos objetos confirmados continua vinculada ao plano salvo.
- O handler de entrada está ligado ao catálogo com a habilitação pública
  reservada à etapa 10. Os controles de criação aparecem apenas com Círculo ativo
  em Medidas. A gravação com confirmação e o menu completo serão ligados na etapa 9.

**Revisão de conclusão** — TypeScript do web aprovado, catálogos JSON válidos
com as mesmas chaves de Círculo em pt-BR/en e `git diff --check` aprovado.
Revisados os quatro itens previstos, dois pontos, raio nulo, posicionamento
central, repetição de eventos, imagem retangular, limites inclusivos, pan,
espelhamento, cancelamento do gesto, rascunho remontado e isolamento de contexto.
A validação funcional manual permanece na etapa 11.

### 8. Editar e calcular prévia em tempo real

- Mover centro/borda juntos e ajustar a borda para redimensionar com centro fixo.
- Conectar alças e setas, Shift e espelhamento aos pixels originais.
- Derivar primeiro diâmetro, depois raio e circunferência, seguindo a ordem do backend.
- Atualizar quadro/lista durante o gesto e restaurar o estado anterior ao cancelá-lo.

**Entrega** — Ajuste dinâmico com prévia local distinguida do resultado oficial.
**Aceite** — Geometria inválida é recusada, e pan/zoom preservam os valores derivados dos mesmos pontos.

#### Entrega da etapa 8 — 06/11/2026

- O workspace liga CIRCLE salvos ao editor e prepara a edição do UUID
  selecionado. Alvos bloqueados ou com geometria inválida ficam em seleção
  somente leitura. Os demais círculos conservam o desenho e os valores salvos.
- Centro/interior movem centro e borda juntos, e a borda redimensiona com centro
  fixo. A conversão para normalizado conserva pontos que permaneceram fixos,
  evitando conversões adicionais desses pontos. As alças e setas usam pixels
  originais, com Shift para passo ampliado e direção horizontal espelhada.
  Os atalhos 1/2 selecionam mover/borda, e Alt com setas ajusta a borda.
- `circleValuesPreview` usa as dimensões originais e `mm_per_pixel` da escala
  salva. Calcula primeiro `2 * hypot(dx, dy) * mm_per_pixel`, depois raio por
  divisão do diâmetro por 2 e circunferência por `Math.PI * diameter`, seguindo
  a ordem conferida no backend. Campos não finitos, raio nulo, coordenadas fora
  dos limites ou escala/dimensões inválidas tornam a prévia indisponível.
- Um estado de gesto transitório atualiza quadro e lista durante o arraste.
  O rascunho só recebe a geometria ao concluir um gesto válido. Escape,
  pointercancel, perda de captura ou desfoque eliminam essa prévia e retomam
  a geometria anterior ao gesto, inclusive quando já havia uma edição local.
- `CircleOverlay` combina salvos e prévia pelo UUID, e o editor desenha a
  geometria ativa. O rótulo acompanha os pontos atuais e a lista utiliza a mesma
  prévia. Ambos identificam a fonte local, com `≈` e descrições acessíveis.
  Os três modos oficiais são calculados e aceitos pelos componentes, com
  diâmetro como apresentação inicial. A escolha do modo será ligada na etapa 9.
- A prévia exige imagem/revisão correspondentes, contexto ativo, escala salva,
  dimensões originais, política DICOM, IDs únicos e leitura sem erro. Revisão
  desatualizada, conflito ou contexto inválido conserva a geometria e indica
  indisponibilidade. Objetos com identificação ambígua mantêm sua indicação.
- A geometria do gesto é vinculada ao QueryClient, caso, imagem, UUID, revisão
  e geração do contexto. Zoom e pan atuam na visualização. Os valores locais
  ficam separados de `measurement`, e o comando continua enviando os pontos
  editáveis para que a API retorne o resultado oficial.

**Revisão de conclusão** — TypeScript do web aprovado, catálogos JSON válidos
com as mesmas chaves de Círculo em pt-BR/en e `git diff --check` aprovado.
Revisados os quatro itens previstos, fórmula, validação de valores, centro fixo,
movimento limitado pelos pontos, setas/Shift, espelhamento, cancelamento,
sincronização quadro/lista e distinção entre fonte local e resultado oficial.
A validação funcional manual com o serviço real segue na etapa 11.

### 9. Conectar menu, apresentação e salvamento

- Montar mover, ajuste da borda e leitura raio/diâmetro/circunferência no menu do quadro.
- Reutilizar expansão lateral, divisórias, tooltips, movimento reduzido e `ViewerEditActions`.
- Guardar olhinho e modo de leitura no cache local de apresentação por imagem.
- Conectar salvar/cancelar, foco, Sonner e recuperação, com X/check após o gesto parar.

**Entrega** — Jornada de criação, edição e gravação ligada à seleção ativa.
**Aceite** — Modo de leitura escolhe o campo publicado correspondente, e aviso de recuperação aparece quando há ação necessária.

#### Entrega da etapa 9 — 06/11/2026

- `CaseImageCircleToolbar` reúne mover, ajuste da borda, escolha da medida,
  olhinho e Novo círculo no padrão escuro do quadro. Somente a linha acionada
  se expande, com expansão exclusiva, divisórias entre modos, Escape com retorno
  ao acionador e CSS compartilhado que respeita movimento reduzido.
- Mover/borda aceitam setas e Shift pelo menu e pelo visualizador. O hook usa
  os mesmos operadores em pixels originais e reconhece o UUID sem distinguir
  caixa. O alvo bloqueado ou com geometria inválida conserva a leitura.
- `circleMeasures` e `hiddenCircleValues` guardam modo e visibilidade do valor
  por UUID no cache de apresentação da imagem, dentro do QueryClient da organização.
  Entradas anteriores usam diâmetro como padrão. O olhinho oculta o rótulo no
  quadro, e a lista conserva a leitura. Preferências de apresentação ficam
  separadas da geometria, das flags do objeto e dos comandos enviados à API.
- Quadro e lista usam o campo oficial correspondente a raio, diâmetro ou
  circunferência, com a mesma escolha também aplicada à prévia local. A escolha
  do modo preserva o UUID e os pontos atuais.
- `CaseImageCircleActions` reutiliza `ViewerEditActions`, com X/check compactos
  próximos ao ponto de ajuste. Os controles aparecem para edição alterada ou
  necessidade de recuperação, e o visualizador os oculta durante ponteiro/setas
  ativos. Criação incompleta possui cancelamento e conferência de leitura próprios.
- `useCircleSaveActions` conecta salvar e conferir ao writer compartilhado,
  com deduplicação local da ação, contexto/geração capturados e notificações Sonner.
  O writer confere o comando confirmado e fornece a transição para o resultado
  oficial. O foco retorna à medida salva, ao acesso da ferramenta ou ao quadro,
  respeitando mudança de contexto e novas edições iniciadas.
- Erro definitivo conserva o rascunho. Conflito exige descarte explícito, e
  resposta incerta usa conferência por GET. Os controles diferenciam conferir,
  salvar e carregar salvo. A recuperação fornece a notificação da conferência,
  com uma única emissão do resultado observado.

**Revisão de conclusão** — TypeScript do web aprovado após repetição com menor
uso de memória, catálogos JSON válidos com as mesmas 88 chaves de Círculo em
pt-BR/en e `git diff --check` aprovado. Revisados os quatro itens previstos,
modo por UUID, preferência legada, visibilidade, isolamento da apresentação,
revisão/comando, foco, teclado, movimento reduzido, mensagens e recuperação.
O aceite funcional no navegador e as gravações com o serviço real ficam na etapa 11.

### 10. Conectar exclusão e habilitar o catálogo

- Ligar lixeira à confirmação capturando UUID, revisão e snapshot do rascunho.
- Substituir ajustes locais por intenção de exclusão somente após confirmar.
- Tratar bloqueado, conflito, ausência já observada e conferência por GET.
- Habilitar Círculo em Medidas após concluir a ligação de todas as operações.

**Entrega** — Exclusão pelo writer e ferramenta disponível para a jornada completa.
**Aceite** — Cancelar a confirmação inicial conserva os ajustes e o objeto fica visível enquanto a escrita aguarda confirmação.

#### Entrega da etapa 10 — 06/11/2026

- Círculo está habilitado em Medidas. A entrada retoma o rascunho ou círculo
  salvo, inicia criação quando não existe CIRCLE visível e exige seleção quando
  há vários. O limite global impede a entrada em criação sem impedir leitura e
  edição dos salvos. Escala, dimensões, DICOM, bloqueios e concorrência continuam
  participando dos guards compartilhados.
- `CaseImageCircleToolbar` oferece lixeira para o CIRCLE salvo selecionado.
  Alvo bloqueado, ambíguo ou de outro editor fica indisponível para exclusão.
  A criação adicional usa Novo círculo, e a exclusão concluída aguarda nova
  ação explícita para criar outro objeto.
- `useCircleDeletion` captura UUID, revisão, nome, clone do editor, QueryClient,
  identidade da query e geração do contexto. Cancelar o diálogo inicial fecha
  somente a confirmação. Alterações posteriores no rascunho exigem nova confirmação.
- `confirmDelete` valida alvo/revisão/snapshot e retorna o comando confirmado.
  `submit` aceita esse comando de exclusão para conferir a intenção exata no cache
  antes de gravar. Isso permite a transição para o rascunho de exclusão antes da
  renderização seguinte, preservando a conferência de snapshot do salvamento
  normal e o reconhecimento exato usado pelo writer.
- A confirmação usa o PUT do plano pelo fluxo já integrado. A geometria permanece
  no plano confirmado enquanto a resposta aguarda conferência. Conflito conserva
  a intenção e oferece descarte explícito. Ausência observada em revisão posterior
  informa `CIRCLE_ALREADY_REMOVED`, e resposta incerta segue para GET.
- `CaseImageCircleDeleteDialog` usa o DS, pt-BR/en e o portal do fullscreen.
  O visualizador fica inativo durante a confirmação, cancelando gestos transitórios.
  O estado normal de progresso apresenta a ação de exclusão em andamento. Mensagens
  de recuperação aparecem conforme o estado efetivamente observado.
- O diálogo confirmado é retomado de um rascunho de exclusão após remontagem.
  Callbacks antigos, exclusão de imagem/caso, query recriada e contexto alterado
  recusam operações sobre a intenção antiga. Cancelar ou concluir restaura o foco
  com fallback para o acesso da ferramenta ou quadro.

**Revisão de conclusão** — TypeScript do web aprovado, catálogos JSON válidos
com as mesmas chaves de Círculo em pt-BR/en e `git diff --check` aprovado.
Revisados os quatro itens previstos, cancelamento inicial, snapshot independente,
transição antes do render, flags/IDs, revisão concorrente, ausência observada,
retomada por GET, foco, fullscreen, proteção de contexto e habilitação do catálogo.
A validação funcional no navegador com o serviço real é a etapa 11.

### 11. Realizar aceite manual integrado

- O usuário valida a matriz abaixo no navegador com o backend real.
- Registrar resultados e corrigir os pontos encontrados na jornada.
- Conferir resultado salvo/reaberto e preservação dos demais objetos e da calibração.
- Atualizar o status da integração com os cenários efetivamente aceitos.

**Entrega** — Jornada validada e pendências identificadas.
**Aceite** — Conclusão funcional vinculada aos resultados observados pelo usuário.

## Matriz de aceite manual

| Área | Conferir |
| --- | --- |
| Geometria | Imagem retangular, centro/borda, raio nulo, coordenadas no limite e circunferência parcialmente externa. |
| Cálculo | Raio, diâmetro e circunferência em mm, ordem da fórmula, precisão, escala e fingerprint após recalibrar. |
| Criação/edição | Dois pontos, opção central, arraste, setas/Shift, mover conjunto, redimensionar e cancelar gesto. |
| Apresentação | Amarelo do DS, linha ativa no menu, expansão única, divisórias, olhinho, X/check compactos, claro/escuro e pt-BR/en. |
| Visualizador | Zoom, pan, espelhamento, resize, fullscreen, toque, teclado, Escape e movimento reduzido. |
| Persistência | Criar, salvar, reabrir, atualizar o mesmo UUID e excluir com confirmação. |
| Concorrência | Duplo clique, duas abas, revisão alterada, ferramentas com rascunho e comandos concorrentes. |
| Recuperação | Erro definitivo, resposta perdida, GET de conferência, conflito e recibo remontado. |
| Integridade | Calibração e outros objetos, visible/locked, IDs ambíguos, limite global de 500 e isolamento de organização. |
| Ciclo de vida | Troca de painel/imagem/caso, saída com rascunho, exclusão de imagem/caso, callbacks antigos e retorno de foco. |

## Próxima execução

Realizar a etapa 11 por validação manual do usuário no navegador, seguindo a
matriz de aceite. Registrar os cenários observados com o backend real e corrigir
os ajustes encontrados na jornada completa. As etapas de implementação 0–10
estão entregues. O aceite funcional depende dos resultados dessa rodada manual.
