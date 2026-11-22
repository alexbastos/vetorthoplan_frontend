# Plano de implementação — Osteotomia e simulação TPLO

Status em 19/11/2026 — etapas 0 a 12 concluídas. Contrato, schemas,
operações puras, transporte, BFF, writer, recuperação, estado, rascunho e canal
de geometria do visualizador, leitura dos resultados salvos e posicionamento
inicial, edição do fragmento, rotação, composição da prévia e parâmetros/tabela
revisados, com card, confirmação, reabertura, exclusão e entrada pública conectados.
Etapa 13 pendente: aceite manual integrado.
O usuário confirmou o aval do backend para continuar a integração.
O usuário também confirmou a demonstração inicial com um único tipo de caso,
contendo planejamento TPLO. A implementação das próximas etapas seguirá esse escopo.
Avançar uma etapa por vez, revisar e entregar antes de iniciar a seguinte.
Na etapa 7, o usuário autorizou automatizar as verificações que podem ser
executadas localmente, para reduzir o aceite manual. Usar testes isolados de
lógica/contrato e DOM simulado, além das checagens estáticas. O aceite visual,
clínico e de ponta a ponta com o backend real permanece manual após a integração.
Essa autorização substitui a restrição anterior de executar somente checagens
estáticas; os registros das etapas anteriores conservam o que foi feito na época.

## Objetivo e limites

Permitir posicionar a geometria da osteotomia, delimitar o fragmento proximal,
informar uma rotação, visualizar seu efeito e salvar/reabrir a simulação na
radiografia. O backend calcula os resultados persistidos e a transformação.

- Reutilizar plano, revisão, cache, writer e recuperação compartilhados por imagem.
- Editar objetos `TPLO` da coleção `document.objects`, com UUID estável.
- Preservar o contorno de origem e aplicar a rotação sobre esses pontos.
- Acrescentar a leitura e edição restrita dos parâmetros TPLO necessários à
  consulta da tabela de rotação, com salvamento explícito.
- Manter a ferramenta TPA existente com seus quatro pontos e método salvo.
- Preservar calibração/recalibração → Ferramentas → Distância, inclusive a linha
  inicial, suas gravações autorizadas e as distâncias subsequentes.
- Seguir o card escuro, os controles, os tooltips e os modais universais atuais.
- Coordenar um único rascunho com alterações por imagem entre as ferramentas.

Ficam para outras entregas a seleção de implantes, as medidas clínicas
adicionais, a revisão/aprovação clínica, a finalização e os relatórios.
A demonstração inicial cobre casos TPLO, conforme alinhamento informado pelo
usuário. Relatórios para outros tipos de caso ficam fora deste recorte.
Este plano também exclui detecção automática, recomendações de lâmina/rotação,
interpolação de tabela, simulação biomecânica, undo/redo e autosave de TPLO.

## Contrato e evidências conferidos em 17/11/2026

O OpenAPI público continua anunciando versão `0.9.0`, branch `protese` e
commit `ea242ce`. A fonte foi lida na revisão completa já identificada pelo
projeto, `ea242ce971412f371c8004d64630289055b53ad4`.
O repositório local do backend está em outra revisão e serve como referência
histórica. A semântica abaixo foi conferida na fonte pública fixada.

Fontes primárias consultadas durante a criação deste plano

- [OpenAPI público](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/openapi.json) e [Swagger](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/docs).
- [Schemas de entrada, fragmento e simulação](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/api/schemas.py).
- [Derivação de medidas, correção e transformação do fragmento](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/domain/planning/measurements.py).
- [Tabela e comparação numérica exata](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/domain/planning/rotation_table.py).
- [Consulta de tabela e protocolo](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/api/routes/tplo.py).
- [Salvamento, proteção de objetos bloqueados e revisão clínica](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/application/use_cases/image_plans.py).
- [Prévia da radiografia e URL assinada](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/application/use_cases/get_image_preview.py).

A leitura foi pública, sem credenciais, chamadas de gravação ou execução do backend.
A configuração autenticada atual da tabela e do protocolo ainda precisa ser
observada pelo fluxo existente durante a integração. O `configured=false`
anterior se referia ao protocolo clínico e não comprova o estado atual da tabela.

### Dados de entrada e resultados

| Elemento | Contrato confirmado |
| --- | --- |
| Objeto | `PlanTplo` em `document.objects`, com `type: TPLO` e UUID. |
| Geometria obrigatória | `center`, `edge` e `rotation_degrees`. Centro e borda distintos. |
| Coordenadas de entrada | `x/y` finitos entre 0 e 1 na matriz original. |
| Raio | Distância entre centro e borda convertida para pixels originais e depois para mm pela calibração. |
| Rotação | Graus entre -180 e 180, inclusive. Zero é válido. |
| Fragmento | Opcional/nulo, com `points` de 3 a 500 pontos e `label` opcional/nulo de até 120 caracteres. |
| Identidade do fragmento | Pertence ao objeto TPLO, sem UUID próprio publicado. |
| Apresentação do objeto | `label` opcional/nulo até 120 caracteres, `visible=true` e `locked=false` como defaults. |
| Medida oficial | `measurement.status`, `values.radius`, `values.rotation`, unidades `mm` e `degrees`, `calibration_id`. |
| Simulação oficial | `simulation.status`, `center_px`, `radius_mm`, `rotation_degrees`, `affine_matrix`, `transformed_fragment_points_px` e `calibration_id`. |
| Leitura e escrita | `GET` e `PUT /api/v1/images/{image_id}/plan`, com revisão otimista no PUT. |
| Consulta de tabela | `GET /api/v1/tplo/rotation-table`, com filtros opcionais `tpa_degrees` e `blade_diameter_mm`. |
| Limite da coleção | Até 500 objetos no documento, compartilhados com as demais ferramentas. |

`PlanFragment` valida quantidade e coordenadas. A fonte conferida não impõe
área mínima, orientação dos vértices, ausência de auto-interseção ou repetição
do primeiro ponto no fim. A UI deve favorecer um contorno simples e legível,
sem atribuir ao backend validações topológicas que ele não oferece.
Contornos já salvos precisam continuar legíveis mesmo se forem degenerados.

| Resultado | Estados publicados |
| --- | --- |
| `measurement.status` | `CALCULATED`, `CALIBRATION_REQUIRED`, `IMAGE_DIMENSIONS_REQUIRED`. |
| `simulation.status` | `SIMULATED`, `CALIBRATION_REQUIRED`, `IMAGE_DIMENSIONS_REQUIRED`, `FRAGMENT_REQUIRED`. |
| `tplo_correction.status` | `CALCULATED`, `LANDMARKS_REQUIRED`, `BLADE_DIAMETER_REQUIRED`, `ROTATION_TABLE_NOT_CONFIGURED`, `EXACT_TABLE_MATCH_REQUIRED`, `TARGET_SLOPE_MISMATCH`, `TARGET_SLOPE_REQUIRED`. |

Um objeto com raio válido e `fragment=null` pode ser persistido e produzir
medida oficial junto de `FRAGMENT_REQUIRED`. A UI deve representar essa etapa
incompleta e oferecer a continuação do contorno.
Confirmação de escrita depende da entrada e da revisão observadas, mesmo se
o backend ainda indicar um resultado incompleto.

### Transformação geométrica

Com largura original `W`, altura original `H`, centro normalizado `(cx, cy)`
e ângulo informado `theta`, a fonte usa

```text
Cx = cx * W
Cy = cy * H
c = cos(theta * pi / 180)
s = sin(theta * pi / 180)

M = [[c, -s, Cx - c*Cx + s*Cy],
     [s,  c, Cy - s*Cx - c*Cy]]

X = point.x * W
Y = point.y * H
X' = M[0][0]*X + M[0][1]*Y + M[0][2]
Y' = M[1][0]*X + M[1][1]*Y + M[1][2]

radius_mm = hypot((edge.x-cx)*W, (edge.y-cy)*H) * mm_per_pixel
```

- Matriz afim de duas linhas por três colunas, aplicada a pontos em pixels
  originais. O eixo Y cresce para baixo. Rotação positiva aparece no sentido
  horário na imagem sem espelhamento.
- Em SVG/CSS, a ordem equivalente é
  `matrix(M00, M10, M01, M11, M02, M12)`. A máscara é definida na origem
  antes de transformar a camada do fragmento.
- `transformed_fragment_points_px` mantém a ordem e a quantidade do contorno
  de origem. A transformação é sempre aplicada à origem, sem acumular rotações.
- A conversão para a matriz original precede a rotação. Girar diretamente
  coordenadas normalizadas distorce a geometria em imagens retangulares.
- Pontos transformados podem ficar fora da imagem. Conservar esses valores e
  limitar apenas o desenho ao quadro, sem clamp dos resultados ou do payload.
- Pan, zoom, fullscreen, tamanho da prévia e espelhamento são apresentação.
  Aplicar a transformação de apresentação ao conjunto completo uma única vez.
  A rotação persistida conserva o sinal no referencial original espelhado ou não.
- Escala e dimensões originais são necessárias para a simulação oficial desta
  revisão. A proteção atual contra DICOM anisotrópico continua aplicável.

Exemplo analítico para revisão da convenção, sem execução de teste.
Em uma imagem de 1000×2000 pixels, centro `(0.5, 0.5)` equivale a `(500, 1000)`.
O ponto de origem `(0.6, 0.5)` equivale a `(600, 1000)` e deve produzir

| Rotação | Resultado em pixels originais |
| --- | --- |
| 0° | `(600, 1000)` |
| +90° | `(500, 1100)` |
| -90° | `(500, 900)` |
| +180° ou -180° | `(400, 1000)` |

As coordenadas transformadas são aproximadas dentro da precisão numérica.
Em +90°, normalizar o resultado produziria `(0.5, 0.55)`, demonstrando por
que girar a diferença normalizada diretamente não reproduz a matriz original.

### Simulação, correção e parâmetros do plano

| Campo | Responsabilidade |
| --- | --- |
| `objects[].rotation_degrees` | Rotação geométrica escolhida explicitamente pelo usuário. |
| `objects[].center/edge/fragment` | Centro, raio geométrico e contorno de cada osteotomia. |
| `document.tplo` | Metadados e parâmetros únicos do plano da imagem. |
| `document.tplo.blade_diameter_mm` | Diâmetro usado pela consulta/correção de tabela, maior que 0 e até 100 mm. |
| `document.tplo.current_slope_degrees` e `target_slope_degrees` | Entradas opcionais/nulas entre 0 e 90 graus. |
| `document.tplo.laterality` | Obrigatório ao criar os metadados, `LEFT` ou `RIGHT`. |
| `document.tplo.projection` | `MEDIOLATERAL`, `CRANIOCAUDAL` ou `UNKNOWN`. |
| `document.tplo_correction.rotation_mm` | Deslocamento oficial obtido da tabela, em mm. |

O backend aceita vários objetos TPLO. A correção por tabela é única por imagem
e não tem vínculo publicado com o UUID de uma osteotomia. O raio geométrico
do objeto e o diâmetro nos metadados também não são sincronizados pelo backend.
Editar uma osteotomia não deve substituir parâmetros globais implicitamente.
Qualquer ação futura de usar seu diâmetro na tabela precisa ser explícita.

A simulação geométrica não depende dos landmarks, da elegibilidade clínica ou
da existência de uma correspondência na tabela. A leitura de TPA e da correção
deve explicar suas próprias pendências, sem criar essa dependência no editor.
O TPA medido continua descrevendo os landmarks originais após a simulação.
Um TPA pós-operatório calculado pelo frontend não faz parte desta entrega.

A correção consultada no backend

- Usa TPA oficial e diâmetro dos metadados, com comparação decimal exata.
- Requer tabela configurada e inclinação-alvo disponível e compatível.
- Pode obter a inclinação-alvo da tabela quando a entrada estiver nula.
- Retorna mm, sem publicar uma conversão para o ângulo geométrico da osteotomia.
- Mantém `recommendation_enabled=false` na consulta e
  `clinically_validated=false` na correção.

Não arredondar o TPA para encaixar numa linha da tabela, interpolar,
fixar um alvo clínico padrão ou converter `rotation_mm` em graus sem contrato.
Versão, fonte e checksum disponíveis pertencem aos detalhes da consulta.
Tabela ausente, sem correspondência, falha de consulta e sessão indisponível
precisam de apresentações distintas.

## Experiência prevista

Entrada proposta em Ferramentas → Planejamento → **Simulação TPLO**, ao lado
do acesso TPA existente. Habilitar a nova entrada somente na etapa 12.

```text
Abrir → selecionar osteotomia salva ou criar
  → posicionar centro e borda do corte
  → delimitar e concluir fragmento
  → ajustar rotação e comparar original/simulado
  → confirmar → resultado oficial → reabrir/editar/excluir
```

- Card compacto no quadro, usando `ViewerMeasurementCard` e seções existentes.
  Expor o diâmetro/raio do corte e a rotação com unidades claras.
- Controles de centro, borda, fragmento e rotação agrupados e alinhados.
  Movimento do conjunto pelo corpo, conforme os demais menus.
- Para vários objetos, reutilizar seleção compacta expansível, mostrando o
  item selecionado inicialmente. Evitar listas extensas abertas por padrão.
- Ajuda breve no tooltip universal alinhado ao rótulo. Explicações da matriz,
  revisão técnica e configuração ficam nos detalhes apropriados.
- X/check junto à marcação nos momentos aplicáveis e ocultos durante o gesto.
  Ação de concluir contorno disponível também por controle semântico.
- Valor em branco no card. No quadro, usar tokens existentes com legenda
  acessível à função, sem depender apenas da cor. Proposta para revisar na etapa 5
  é lâmina/contorno original em `--radiograph-mark-interest` e resultado
  transformado em `--radiograph-mark-accent`. TPA mantém anatomy verde e
  medidas mantêm os tokens já adotados.
- Ocultação de valores e comparação original/simulado são estado de apresentação
  da sessão. `visible` e `locked` salvos são respeitados na leitura e seleção.
- Exclusão reutiliza o modal minimalista universal, ícone cinza, descrição breve
  e botões pill. Após excluir, conservar a ferramenta e selecionar um item restante.

## Reaproveitamento da arquitetura

Os caminhos de código são relativos a `apps/web/src/`. Os novos nomes são
propostas, a consolidar somente quando sua etapa for implementada.

| Responsabilidade | Ponto de extensão |
| --- | --- |
| Schemas de entrada e leitura | `features/cases/schemas/image-plan.schema.ts`, já contém TPLO, fragmento, simulação e correção. |
| Comandos, merge e reconhecimento | `features/cases/schemas/image-plan-command.schema.ts`. |
| Serviço, rota e BFF | `features/cases/services/image-plan-api.ts`, `app/api/cases/[caseId]/images/[imageId]/plan/edits/route.ts`, `lib/server/image-plan-bff.ts`. |
| Writer, recibos e recuperação | `image-plan-saving.ts`, `calibration-save-state.ts`, `hooks/use-measurement-save-recovery.ts`. |
| Rascunhos e contexto | `image-plan-draft.ts`, `hooks/use-image-plan-drafts.ts`, `hooks/use-workspace-draft.ts`, `hooks/cases-query-keys.ts`. |
| Tabela e protocolo | `services/tplo-reference-api.ts`, `schemas/tplo-reference.schema.ts`, `lib/tplo-reference-query-options.ts`, BFFs existentes. |
| Estado da ferramenta | Proposta `hooks/use-image-tplo.ts`, `lib/tplo-editor.ts` e `lib/tplo-draft.ts`. |
| Geometria, resultados e prévia | Proposta `lib/tplo-geometry.ts`, `lib/tplo-interaction.ts`, `lib/tplo-result.ts`, `lib/tplo-preview.ts`. |
| Adaptador e visualizador | `lib/viewer-editor.ts`, `lib/image-point-space.ts`, `components/case-image-viewer.tsx`. |
| Overlays | Proposta `components/tplo-overlay.tsx` e overlay de edição no padrão existente. |
| Apresentação | `ViewerMeasurementCard`, `ViewerMeasurementSection`, `ViewerMeasurementAction`, `ViewerMeasurementVisibility`, `ViewerEditActions`, `ViewerMeasurementDeleteDialog`, `CasePanelChoice`. |
| Composição | `case-image-workspace.tsx`, `case-image-tools-panel.tsx`, `use-image-display-settings.ts`, traduções pt-BR/en. |

Fluxo de persistência previsto

```text
Rascunho TPLO → comando restrito → writer compartilhado
  → PATCH same-origin /plan/edits → leitura e merge no BFF
  → um PUT upstream com base_revision → reconhecimento → cache/resultado oficial
```

Comandos propostos para o BFF, sem novos endpoints remotos

| Comando | Entrada permitida |
| --- | --- |
| `tplo-create` | `baseRevision`, UUID, centro, borda, rotação, fragmento opcional/nulo e label. |
| `tplo-update` | `baseRevision`, UUID e geometria editável completa, incluindo fragmento e seu label. Preservar o label do objeto e suas flags, salvo ação explicitamente incluída no escopo. |
| `tplo-delete` | `baseRevision` e UUID. |
| `tplo-parameters-set` | `baseRevision` e entradas restritas `laterality`, `projection`, `current_slope_degrees`, `target_slope_degrees` e `blade_diameter_mm`, com presença/nulidade definida na etapa 0. |

Criar todos com owner TPLO no writer. Geometria e parâmetros usam o mesmo
lock e rascunho coordenado, com submissões explícitas e sequenciais.
O navegador não envia documento completo, medida, matriz, contorno transformado,
resultado de correção, aceitação, qualidade, elegibilidade ou auditoria.

## Etapas de implementação

### 0. Fechar decisões de contrato e interação

- Revalidar a revisão publicada ao iniciar e registrar qualquer evolução.
- Consolidar os campos dos comandos, a edição de parâmetros globais e a
  distinção entre diâmetro geométrico e lâmina da tabela.
- Definir presença, omissão e nulidade dos parâmetros. Ao criar `document.tplo`,
  exigir lateralidade explícita ou fonte clínica já confirmada. Espelhamento
  visual não determina lateralidade. Preservar projeção/qualidade/elegibilidade
  já salvas e os processos internos existentes.
- Definir `fragment=null` como remoção explícita do contorno em uma atualização,
  sem excluir automaticamente a osteotomia ou os parâmetros globais.
- Registrar exemplos analíticos de 0°, +90°, -90° e ±180°, imagem retangular,
  centro fora da origem, saída fora da imagem e imagem espelhada.
- Observar tabela e protocolo por consultas autenticadas existentes quando
  disponíveis. Falta de configuração não bloqueia etapas independentes.
- Fixar a convenção de movimento do corpo, centro isolado, borda e vértices.
  Proposta de translação do corpo move centro, borda e contorno de origem juntos.
- Definir a composição visual da radiografia e do fragmento com a URL da prévia
  existente. Investigar carregamento e filtros sem introduzir novos serviços.

**Entrega e aceite** — decisões anotadas aqui, exemplos e origem dos dados
identificados. O levantamento inicial acima é complementado pela entrega
registrada a seguir. O aceite funcional permanece na etapa 13.

#### Entrega da etapa 0 — contrato, comandos e interação fechados

Concluída em 17/11/2026. A conclusão desta etapa registra a definição da
integração. O aceite funcional continua na etapa 13.

##### Escopo confirmado e revalidação de fonte

- A demonstração contempla planejamento TPLO, conforme confirmação do usuário
  nesta rodada. O editor de simulação mantém as dependências geométricas
  documentadas, enquanto revisão e relatórios seguirão o fluxo TPLO do backend.
- O OpenAPI público foi consultado novamente e anunciou `0.9.0`, branch
  `protese`, commit `ea242ce`, correspondente à fonte fixada acima.
- Os oito schemas `PlanTplo`, `PlanFragment`, `PlanTploSimulation`,
  `TploPlanMetadata`, `TploCorrectionPlan`, `TploRotationTableResponse`,
  `TploClinicalProtocolResponse` e `PlanDocument` coincidem com o snapshot
  publicado de 29/10/2026, comparados com decodificação UTF-8 correta.
- A fonte dessa revisão confirmou a geração da matriz e dos pontos em pixels,
  os estados sem escala/fragmento, os validadores de entrada e a comparação
  decimal exata da tabela.
- `PlanTplo` admite geometria persistida sem fragmento. `SIMULATED` depende
  de escala e fragmento, com derivação independente dos landmarks ou da tabela.
- A rotação transforma o polígono informado, sem ajustar seu contorno ao
  círculo/lâmina automaticamente. O círculo define centro e raio geométrico.
  O profissional delimita o fragmento que deseja transformar.

##### Formato dos comandos e identificação da intenção

Todos os comandos usarão `baseRevision` e o owner `tplo`. O formato abaixo
define o contrato interno do BFF a implementar na etapa 1.

| Comando | Campos e semântica fechados |
| --- | --- |
| `tplo-create` | `kind`, `baseRevision`, `id`, `center`, `edge`, `rotation_degrees`, `fragment` opcional/nulo e `label` opcional/nulo. Canonicalizar fragmento e label omitidos para nulo. |
| `tplo-update` | `kind`, `baseRevision`, `id`, `center`, `edge`, `rotation_degrees` e `fragment` obrigatório, completo ou nulo. O label do objeto e suas flags são conservados do documento atual. |
| `tplo-delete` | Somente `kind`, `baseRevision` e `id`. |
| `tplo-parameters-set` | `kind`, `baseRevision` e `parameters`, objeto estrito com ao menos uma das cinco entradas autorizadas na tabela seguinte. |

- IDs são UUIDs, normalizados como nas ferramentas atuais. A identidade é
  estável entre rascunho, envio e reconhecimento.
- `fragment`, quando presente, contém somente `points` e `label`. Omitir seu
  label equivale a nulo. Cada atualização contém o fragmento inteiro desejado,
  com ordem e coordenadas exatas, inclusive ao ajustar um único vértice.
- `fragment=null` remove explicitamente o contorno. Omitir `fragment` em update
  é inválido. Rascunhos parciais de 1 ou 2 pontos ficam fora do payload.
- Novo TPLO começa com rotação 0°, `visible=true` e `locked=false`. A criação
  usa label localizável no padrão das ferramentas, sem significado clínico
  inferido. A leitura mantém qualquer label anterior.
- `measurement`, `simulation`, `affine_matrix`, pontos transformados,
  `tplo_correction`, qualidade, elegibilidade e auditoria são recusados como
  campos dos comandos. Merge preserva os campos alheios no documento atual.
- Geometria e parâmetros são duas intenções de edição exclusivas. Alternar
  entre elas segue salvar/cancelar/retomar do workspace. Uma confirmação envia
  um comando e faz um PUT, sem gravar parâmetros como efeito lateral de um corte.

##### Parâmetros globais, presença e nulidade

`parameters` será um patch restrito de `document.tplo`. Ausência de uma chave
conserva o valor salvo. O BFF faz o merge com os metadados atuais.

| Chave permitida | Valor presente | Valor nulo | Metadados ainda ausentes |
| --- | --- | --- | --- |
| `laterality` | `LEFT` ou `RIGHT`. | Inválido. | Obrigatório para criar `document.tplo`, mediante escolha explícita. |
| `projection` | `MEDIOLATERAL`, `CRANIOCAUDAL` ou `UNKNOWN`. | Inválido. | Omissão usa o default publicado `UNKNOWN`. |
| `current_slope_degrees` | Número finito entre 0 e 90, inclusive. | Limpa a entrada. | Pode permanecer ausente. |
| `target_slope_degrees` | Número finito entre 0 e 90, inclusive. | Limpa a entrada e permite ao backend usar o alvo da tabela, se configurado. | Pode permanecer ausente. |
| `blade_diameter_mm` | Número finito maior que 0 e até 100 mm. | Limpa a lâmina da tabela. | Pode permanecer ausente. |

- Patch vazio, campos extras, `parameters=null` ou limpeza integral dos
  metadados são inválidos para esse comando.
- A identidade clínica da lateralidade vem dos metadados salvos ou da escolha
  do profissional. `CaseImage` atual não contém lado clínico confirmado.
  Os tipos do adapter em memória, `imageOrientationPatient` e o espelhamento
  não fornecem autorização para preencher essa escolha.
- Na criação, usar os defaults publicados para os demais campos necessários
  ao schema, como `image_quality=LIMITED`, `eligibility=PENDING` e lista vazia
  de motivos. Esses defaults não confirmam critérios clínicos.
- Metadados existentes conservam `notes`, qualidade, elegibilidade e motivos,
  inclusive quando projeção ou lateralidade forem alteradas explicitamente.
  Recusas do servidor são exibidas sem reescrever esses campos para contorná-las.
- O editor não preenche inclinação atual com TPA automaticamente e não escolhe
  alvo de 5°, lâmina ou correspondência aproximada por conveniência.
- Excluir osteotomia ou limpar fragmento conserva os parâmetros globais.
  Os rótulos de UI serão **Diâmetro do corte** e **Lâmina da tabela**, com
  tooltip curto para a diferença. O card geométrico não duplica o formulário
  de parâmetros globais.
- Nesta entrega, a UI não inclui uma ação de sincronizar corte e lâmina da
  tabela. Cada valor pode ser informado explicitamente em seu contexto.
  A consulta da tabela não altera a geometria de nenhum objeto.

##### Reconhecimento, orçamento e resultados

- No retorno do PUT, manter o reconhecimento existente de revisão exatamente
  anterior + 1. Na recuperação por GET, exigir revisão maior que `baseRevision`
  e observar a intenção do comando nessa revisão.
- Criar/atualizar compara UUID, tipo, centro, borda, rotação e fragmento com
  quantidade, ordem, pontos e label canonicalizado. Criação também compara
  label do objeto. Comparar os números da entrada sem arredondamento clínico.
- Excluir reconhece ausência do UUID em revisão posterior. Parâmetros reconhecem
  os campos enviados, com ausência/nulo equivalentes somente nas três entradas
  numéricas opcionais. As demais chaves e objetos ficam fora dessa comparação.
- O resultado derivado não é condição para reconhecer a escrita. A apresentação
  de `SIMULATED` requer matriz 2×3, números finitos, escala/fingerprint atuais
  e contorno de origem disponível. Pontos derivados válidos ficam em pixels,
  inclusive se ultrapassarem a imagem.
- Usar 64 KiB para `tplo-create`/`tplo-update` e 4 KiB para exclusão/parâmetros.
  Um contorno canônico com 500 pontos, duas coordenadas com até 25 caracteres
  numéricos cada e estrutura JSON ocupa aproximadamente 31 KiB, deixando
  margem para labels e os outros campos. O limite mede UTF-8 real. Whitespace
  arbitrário pode excedê-lo mesmo em um JSON estruturalmente válido.
- As etapas seguintes mantêm os limites próprios das famílias já integradas.
  A mudança da leitura máxima da rota não amplia o orçamento das demais.

##### Interação definida para centro, raio e fragmento

| Ação | Efeito no rascunho de origem |
| --- | --- |
| Criar | Escolher centro e depois borda. Nenhuma localização anatômica ou de calibração é reaproveitada automaticamente. |
| Arrastar corpo/circunferência | Transladar centro, borda e todos os pontos de origem pelo mesmo deslocamento. |
| Ajustar somente centro | Mover o pivô e transladar a borda pelo mesmo deslocamento, conservando raio e direção. O fragmento de origem permanece na localização escolhida. |
| Ajustar borda | Alterar apenas `edge`, mantendo centro e pontos de origem. |
| Informar diâmetro do corte | Com centro/borda definidos, usar `raio_px = diâmetro_mm / (2 * mm_per_pixel)` e conservar a direção centro→borda. Mostrar raio como detalhe. |
| Ajustar vértice | Mover somente o vértice selecionado da origem. Junto à sua alça, a seleção explícita prevalece sobre cortes sobrepostos, inclusive de outro TPLO. |
| Mover fragmento | Arrastar interior do polígono move seus pontos de origem, conservando centro, borda e rotação. Alças/contorno do corte têm precedência no hit testing padrão; um vértice explicitamente selecionado tem a exceção descrita acima. |
| Inserir/remover vértice | Ação explícita no contorno selecionado, conservando ordem e os limites de pontos. |
| Alterar rotação | Modificar somente `rotation_degrees` e derivar a prévia novamente a partir da origem. |

- Translações compartilham um limite calculado para o conjunto afetado.
  Evitar clamp por vértice e qualquer deformação silenciosa do polígono.
  Centro isolado respeita os limites do centro e da borda transladada.
- Valor numérico inviável para o diâmetro deixa a edição com pendência clara.
  O valor não é reduzido silenciosamente para caber na matriz.
- O contorno de origem permanece editável em **Original**. Em **Simulado**,
  o contorno transformado serve à comparação. Selecionar um vértice para
  ajustar retorna à origem, sem reinterpretar um ponto rotacionado como entrada.
- Rotação será oferecida por campo numérico e alça própria ao redor do centro.
  O gesto usa `atan2` em pixels originais, desfaz o espelhamento da apresentação
  e conserva o sinal do backend. Os valores persistíveis ficam em [-180, 180].
- Deslocamento por teclado segue os passos e Shift já usados no visualizador.
  A interação de rotação deve conservar a precisão do rascunho e unidades
  explícitas. Os controles numéricos não introduzem presets clínicos.
- Esc, cancelamento do ponteiro, perda de captura ou mudança de geração
  descartam apenas o gesto transitório. Concluir o gesto atualiza o rascunho.
  Salvar continua sendo uma ação explícita posterior.
- Contorno parcial fica no rascunho até concluir ou cancelar. Salvar sem
  fragmento é oferecido antes de iniciá-lo ou após descarte explícito.
- A ordem dos vértices é preservada. Polígono visual fecha do último para o
  primeiro ponto. Se um registro anterior repetir o primeiro ponto no fim,
  ler e conservar a entrada, sem normalização destrutiva automática.

##### Composição visual e dependências do visualizador

A leitura de `case-image-viewer.tsx` confirmou que o `<img>` atual recebe o
filtro de brilho/contraste/inversão e que seu contêiner aplica pan, zoom e
espelhamento ao `<img>` e aos overlays. `useCaseImagePreview` e
`useImagePreview` já controlam carregamento e renovação da URL assinada.
`image-point-space.ts` mantém a conversão pela matriz original.

- A camada do fragmento usará SVG com `<image>`, `clipPath` em pixels originais
  e a mesma URL da prévia confiável existente. Expor a referência de imagem
  de maneira tipada ao renderer TPLO quando essa camada for implementada.
- Mapear a textura à largura/altura originais. A resolução menor da prévia
  influencia sua nitidez, sem mudar as coordenadas ou o raio do plano.
- Em **Original**, desenhar a radiografia e a geometria de origem. Em
  **Simulado**, mascarar a região de origem na camada base e compor o recorte
  transformado com a matriz oficial ou transitória correspondente.
  A região descoberta usa o fundo neutro do quadro. O contorno de origem
  permanece identificável como guia, sem criar anatomia para preencher lacunas.
- Aplicar filtros à base e à textura, mantendo textos/contornos sem filtro.
  Aplicar pan, zoom e espelhamento no contêiner comum apenas uma vez.
  A ordem SVG da matriz permanece a documentada acima.
- A comparação mostra a simulação do objeto selecionado. Outros TPLOs podem
  conservar suas guias salvas, sem executar uma sequência implícita de cortes.
- A camada é visual e não exige ler pixels em canvas, gerar blob ou exportar
  arquivo. A compatibilidade do carregamento de `<image>` com a URL assinada
  será verificada manualmente na etapa 13. Falha da textura mantém a geometria
  e informa a indisponibilidade da camada, sem perder o rascunho.
- Uma URL renovada é encaminhada às duas camadas pelo mecanismo existente.
  A renovação isolada não muda identidade, entrada clínica ou revisão.
- Centro/borda e o contorno original usam as mesmas dimensões de edição do
  workspace. Crop/rotação persistidos de `image_transform` são preservados
  no documento, sem reinterpretar os pontos do TPLO como coordenadas de recorte.
  A fonte de `GetImagePreview` confirma que essa rota lê os metadados e o
  objeto de prévia da imagem, sem consultar `document.image_transform`.
  A camada do fragmento segue esse mesmo referencial usado na imagem base.
  Qualquer futura aplicação de crop/rotação persistidos ao visualizador exige
  composição consistente das duas camadas e dos overlays.

##### Exemplos analíticos e limites para revisão manual posterior

Estes exemplos foram deduzidos da fórmula conferida por leitura. Eles definem
resultados esperados para a implementação e para o aceite manual posterior.

| Situação | Entrada no referencial original | Resultado esperado |
| --- | --- | --- |
| Centro deslocado | W=1000, H=2000, C=(0.25, 0.25), P=(0.35, 0.25), +90°. | C=(250, 500), P'=(250, 600) em pixels, ou (0.25, 0.30) normalizado. |
| Saída da imagem | W=1000, H=2000, C=(0.9, 0.5), P=(0.7, 0.5), 180°. | P'=(1100, 1000). Conservar 1100 no resultado e limitar somente o desenho ao quadro. |
| Espelhamento | Exemplo do centro deslocado com espelhamento horizontal. | C visual=(750, 500), P' visual=(750, 600), com entrada +90° e resultado original (250, 600) conservados. |
| Recalibração | Centro/borda separados por 100 px, escala muda de 0.1 para 0.2 mm/px. | Raio muda de 10 para 20 mm, fingerprint muda e pontos/matriz geométrica permanecem iguais. |
| Lâmina global diferente | Diâmetro geométrico 20 mm e `blade_diameter_mm=25`. | Simulação usa o raio geométrico. Consulta/correção usa 25 mm, sem sincronização automática. |
| Fragmento ausente | Centro/borda válidos e escala disponível, `fragment=null`. | Medida calculada e `simulation.status=FRAGMENT_REQUIRED`. |
| Tabela sem correspondência | TPA oficial 24.74° e única entrada pertinente em 25°. | Nenhum arredondamento para 25° e correção `EXACT_TABLE_MATCH_REQUIRED` se os demais pré-requisitos estiverem atendidos. |

Os casos de 0°, -90° e ±180° usam a tabela analítica já registrada na seção
de transformação. Reabrir e alterar a rotação deriva todos os pontos da origem,
evitando acumulação dos resultados de rotações anteriores.

##### Configuração observável e limites da entrega

- As consultas públicas sem credenciais a `/api/v1/tplo/rotation-table` e
  `/api/v1/tplo/clinical-protocol` retornaram HTTP 401 nesta etapa.
- O material disponível não contém resposta autenticada atual desses recursos.
  Tabela configurada, versão ativa, disponibilidade de linhas e alvo clínico
  permanecem por observar pelo fluxo autenticado já integrado na etapa 10.
- O `configured=false` informado anteriormente pelo usuário continua sendo
  evidência histórica do protocolo, sem atualização presumida para esta rodada.
- O aval para a demonstração TPLO confirma o recorte do produto. Ele não
  preenche dados de configuração nem substitui o cálculo/aceite do servidor.
- A consulta autenticada depende da sessão normal do aplicativo quando
  disponível. Seguir com etapas geométricas independentes mantém esse limite
  explícito, sem solicitar credenciais ou criar um bloqueio adicional.

##### Revisão desta entrega

Foram lidos schemas, derivações, comparação de tabela, persistência e caminhos
do visualizador/prévia. Foram fechados os contratos internos, a nulidade,
os gestos, a composição e o recorte TPLO da demonstração.
A alteração desta etapa é documental. A checagem cobre links locais,
integridade UTF-8, whitespace e consistência do checklist. TypeScript, lint
e traduções acompanham as etapas que alterarem esses respectivos arquivos.
Testes funcionais, gravação clínica e comportamento de renderização continuam
no aceite manual. O repositório do backend conserva seu estado anterior.

##### Testes manuais da etapa 0 — executar após a integração completa

- [ ] E0-01 — Criar corte com rotação 0°, escala e fragmento. Aceite: simulação sem deslocamento; TPA, tabela e parâmetros não são preenchidos automaticamente.
- [ ] E0-02 — Alterar geometria e depois parâmetros. Aceite: são intenções exclusivas e cada confirmação conserva os campos alheios do plano.

### 1. Schemas estritos, comandos e operações puras

- Separar entrada editável TPLO dos derivados já aceitos na leitura.
- Validar UUID, coordenadas, raio não nulo, rotação inclusiva, labels e
  fragmento de 3 a 500 pontos. Permitir rascunho parcial fora do payload.
- Criar comandos de geometria, exclusão e parâmetros com campos restritos.
- Fazer merge somente do alvo ou dos parâmetros autorizados. Nas atualizações
  geométricas, remover os derivados do alvo para recálculo pelo servidor.
- Invalidar `tplo_correction` quando seus parâmetros forem editados. Conservar
  os demais campos e permitir que o backend recalcule as derivações afetadas.
- Preservar calibração, medidas, landmarks, métodos, outros TPLOs, implantes,
  apresentação e revisão/auditoria. Respeitar UUIDs únicos e objetos bloqueados.
- Confirmar por UUID, entrada completa e revisão posterior. Para parâmetros,
  comparar somente campos autorizados e semântica normalizada de nulidade.

**Aceite** — operações isoladas, todos os objetos anteriores conservados e
nenhum resultado calculado pelo navegador aceito como entrada clínica.

#### Entrega da etapa 1 — schemas, comandos e operações puras

Concluída em 17/11/2026. Foram alterados os dois módulos existentes
`image-plan.schema.ts` e `image-plan-command.schema.ts`.

- Extraídos `PlanFragmentInputSchema`, `PlanTploInputSchema` e
  `TploParametersInputSchema`. A leitura reutiliza as estruturas extraídas,
  mantendo os campos, limites e defaults que já aceitava.
- A entrada TPLO exige raio não nulo, coordenadas finitas normalizadas e
  rotação em [-180, 180], inclusive zero. O fragmento mantém os limites de
  3 a 500 pontos e labels de até 120 caracteres.
- Criados `CreateTploSchema`, `UpdateTploSchema`, `DeleteTploSchema`,
  `SetTploParametersSchema` e a união estrita `SaveTploSchema`.
- Criar canonicaliza fragmento/label omitidos para nulo. Atualizar exige
  `fragment` completo ou nulo e conserva label do objeto e flags salvas.
- `TploParametersPatchSchema` conserva somente campos autorizados, trata
  `undefined` como omissão e rejeita o patch vazio após canonicalização.
  Nulos explícitos das três entradas numéricas continuam sendo ações de limpeza.
- O merge de parâmetros exige lateralidade ao criar metadados e aplica os
  defaults publicados de projeção, qualidade, elegibilidade e motivos vazios.
  Em metadados existentes, conserva as entradas omitidas e os campos internos.
  Essa operação invalida apenas `tplo_correction` no nível do documento.
- As operações de objetos verificam unicidade de UUID, colisão de criação,
  limite total da coleção, tipo do alvo e bloqueio de edição/exclusão.
  Atualizar remove somente `measurement` e `simulation` do TPLO editado.
  Excluir remove apenas o alvo. Parâmetros globais e outros objetos são conservados.
- O reconhecimento exige revisão posterior e compara a entrada geométrica,
  ordem/pontos/label do fragmento e, na criação, label do objeto. A ausência
  observada após exclusão é reconhecida em revisão posterior. Parâmetros
  comparam somente as chaves enviadas, respeitando limpeza por nulo.
- Campos derivados, qualificação clínica e auditoria são recusados nas
  entradas novas. Seu valor atual no documento é preservado conforme a
  responsabilidade de cada comando e recalculado pelo backend ao gravar.

##### Integração limitada às operações puras nesta etapa

`applyPlanCommand` e `planCommandMatches` agora recebem também `SaveTploInput`
por uma união interna `PlanOperationSchema`, reutilizando os pontos centrais
de merge e reconhecimento.
`SavePlanEditSchema` e `PlanSaveCommandSchema` continuam representando as
famílias atualmente integradas ao transporte. Isso mantém a conexão dos
comandos TPLO ao BFF na etapa 2, junto de preflights e limites de fragmento.
Owner, recibos e rascunhos do writer serão conectados nas respectivas etapas.

##### Revisão e checagens da etapa 1

- Revisão de criação, atualização, exclusão, patch de metadados, defaults,
  valores nulos/omitidos, UUIDs em caixa diferente, locks e revisão.
- Conferência de preservação de calibração, objetos alheios, landmarks/método,
  parâmetros omitidos, qualidade, revisão/auditoria e apresentação.
- Conferência dos caminhos existentes de calibração, Distância, Ângulo,
  Círculo e Referências nas funções compartilhadas.
- TypeScript do web aprovado com `tsc --noEmit --incremental false` pelo
  binário local instalado. `pnpm` estava indisponível no PATH desta sessão.
- Lint dos dois arquivos TypeScript aprovado pela API do ESLint, com o parser
  TypeScript já instalado via `eslint-config-next`, sem mudança de configuração.
- Os 28 arquivos JSON pt-BR/en foram lidos com sucesso. As 1215 chaves de
  `cases.json` coincidem entre os idiomas. Traduções permanecem com seu conteúdo atual.
- Whitespace, links locais e checklist revisados na documentação atualizada.
  A entrega inclui somente código puro e documentação do frontend.

O aceite funcional continua na etapa 13. Nesta etapa foram realizadas somente
análise de código e checagens estáticas, conforme combinado com o usuário.

##### Testes manuais da etapa 1 — executar após a integração completa

- [ ] E1-01 — Salvar/reabrir criação, atualização e remoção de TPLO. Aceite: UUID, pontos, rotação e ordem do contorno coincidem; demais objetos e calibração são preservados.
- [ ] E1-02 — Inspecionar payload de parâmetros com omissão e nulo. Aceite: omissão conserva o salvo, nulo limpa somente o campo numérico escolhido e campos derivados não entram no comando.
- [ ] E1-03 — Tentar concluir geometria/contorno inválidos. Aceite: não há envio de centro igual à borda, pontos fora de 0–1, rotação fora de ±180° ou contorno com menos de 3/mais de 500 pontos.

### 2. Transporte, limites e BFF

- Usar o PATCH existente e um PUT remoto por comando.
- Manter validações de acesso, vínculo caso/imagem, prontidão, revisão,
  unicidade de UUID e resposta.
- Criação/edição geométrica exigem dimensões originais, escala confirmada e
  política DICOM existente. Exclusão dispensa preflights de geometria/escala.
  Parâmetros sem geometria seguem suas dependências reais de contrato.
- Ampliar a leitura limitada da rota por família. Aplicar 64 KiB para
  criar/atualizar TPLO com até 500 vértices, 4 KiB para exclusão/parâmetros,
  mantendo os limites atuais de 4 KiB das demais ferramentas e 12 KiB de qualidade.
  Medir bytes UTF-8 reais e revisar o orçamento com o payload máximo suportado.
- Conferir a estrutura dos resultados usados para renderizar, além da leitura
  genérica existente. Resultado incompleto não equivale a escrita fracassada.
- Reaproveitar as consultas de tabela/protocolo, sem outra API ou cache de plano.

**Aceite** — BFF monta o documento sobre a revisão observada, preserva os
campos alheios e classifica recusas e respostas incertas como nas ferramentas atuais.

#### Entrega da etapa 2 — transporte, limites e BFF

Concluída em 17/11/2026. A revisão cobriu os cinco arquivos de código
alterados nesta etapa.

| Arquivo em `apps/web/src/` | Alteração |
| --- | --- |
| `features/cases/schemas/image-plan-command.schema.ts` | União estrita de transporte, tipo compartilhado de entrada e orçamento de corpo por comando. |
| `features/cases/services/image-plan-api.ts` | Envio de TPLO pelo PATCH existente e preflight de tamanho do JSON serializado. |
| `app/api/cases/[caseId]/images/[imageId]/plan/edits/route.ts` | Leitura limitada a 64 KiB e aplicação do orçamento específico aos bytes originais. |
| `lib/server/image-plan-bff.ts` | Validação de comandos TPLO, preflights próprios e reutilização de merge, PUT e reconhecimento compartilhados. |
| `features/cases/schemas/image-plan.schema.ts` | Validação estrutural dos resultados de simulação presentes na leitura/resposta. |

##### Contrato de transporte e limites

`SavePlanEditTransportSchema` reúne as famílias já integradas e os quatro
comandos de `SaveTploSchema`. Serviço e BFF validam a mesma união.
`PlanOperation` é o tipo compartilhado para operações de calibração e edição.
O writer ainda usa `SavePlanEditSchema`/`PlanSaveCommandSchema` até a conexão
de owner, recibos e rascunhos na etapa 3. Essa separação mantém os chamadores
atuais válidos durante a integração por etapas.

O serviço serializa a entrada uma vez e usa `TextEncoder` para conferir os
bytes UTF-8 que enviará. O BFF mede o corpo recebido antes da canonicalização,
incluindo espaços e sequências escapadas. Os limites vêm de
`planEditBodyLimit`, compartilhado entre serviço e rota.

| Operação | Limite do corpo |
| --- | --- |
| `tplo-create` e `tplo-update` | 64 KiB. |
| `tplo-delete` e `tplo-parameters-set` | 4 KiB. |
| Qualidade radiográfica | 12 KiB. |
| Distância, Ângulo, Círculo, Referências e tipo desconhecido na inspeção inicial | 4 KiB. |

O stream continua limitado por `readBoundedRequestBody`, inclusive com
`Content-Length` ausente ou divergente. JSON e UTF-8 inválidos são recusados
antes de qualquer PUT. Excesso de tamanho no servidor mantém HTTP 413 e o
tratamento `REQUEST_NOT_ALLOWED` do wrapper atual. A recusa local do serviço
usa `VALIDATION_ERROR`, com resultado definitivo anterior ao envio.
O limite de 500 vértices continua sendo validado pelo schema de fragmento.

##### Preflights e preservação do plano

| Comando TPLO | Dimensões e política DICOM | Escala confirmada | UUIDs únicos |
| --- | --- | --- | --- |
| Criar/atualizar | Exigidas. | Exigida. | Exigidos na coleção. |
| Excluir | Dispensadas para esta operação. | Dispensada. | Exigidos na coleção. |
| Editar parâmetros globais | Dispensadas para esta operação. | Dispensada. | Coleção conservada pela operação de parâmetros. |

- Todos os comandos mantêm sessão/organização pelo wrapper existente,
  vínculo caso/imagem, prontidão da imagem, revisão base, leitura estrita
  do plano e validação da resposta.
- Criação/atualização reutilizam a restrição atual de anisotropia DICOM,
  considerando os dois espaçamentos publicados e a tolerância existente.
- Exclusão e parâmetros chegam ao merge sem exigir escala ou dimensões.
  Locks, tipo do alvo, criação de metadados com lateralidade e campos
  permitidos continuam sendo conferidos pelas operações da etapa 1.
- O BFF lê o plano, compara `baseRevision`, aplica somente o comando restrito
  e executa um PUT. A resposta exige revisão anterior + 1 e reconhecimento
  da intenção. Recálculo de medida/simulação/correção pertence ao servidor.
- Confirmação depende da entrada persistida e da revisão, sem exigir um
  estado final `SIMULATED` ou correção `CALCULATED`.
- A tabela e o protocolo continuam com seus serviços, BFFs e query keys
  existentes. Esta etapa usa o endpoint de plano já integrado.

##### Estrutura dos resultados e respostas incertas

A leitura mantém os estados publicados e os campos opcionais. Foram
acrescentadas verificações de estrutura somente aos valores de simulação
quando presentes.

- Centro vazio/ausente é aceito para resultados incompletos. Um centro
  preenchido precisa conter `x/y` finitos.
- Matriz vazia/ausente é aceita. Uma matriz preenchida precisa ter duas
  linhas de três números finitos cada.
- Pontos transformados presentes precisam conter `x/y` finitos, preservando
  campos numéricos adicionais do mapa publicado. A coleção aceita até 500
  pontos, incluindo a coleção vazia dos estados sem resultado.
- Pontos em pixels podem ficar fora dos limites da imagem. A validação de
  resultado não aplica a restrição normalizada da entrada.
- Ausência de fingerprint, campos derivados ou resultado final continua
  sendo representável. A coerência completa necessária à apresentação é
  responsabilidade da etapa 6, conforme seu aceite.
- Resposta estruturalmente inválida depois de iniciar o PUT mantém
  `INVALID_RESPONSE` com `uncertain=true`. Falhas de transporte depois da
  tentativa também mantêm incerteza. A operação não repete o PUT.
- Recusas locais, conflito de revisão e recusas conhecidas 400/403/404/409/422
  conservam sua classificação. A recuperação por GET será conectada ao
  owner TPLO na etapa 3.

##### Revisão e checagens da etapa 2

- Revisão por leitura dos quatro comandos, orçamento de bytes, rejeição de
  campos extras, sinais/zero, nulos, fragmento ausente e resultados vazios.
- Conferência do caminho serviço → PATCH → BFF → um PUT, com preservação
  das verificações de contexto, vínculo caso/imagem, revisão e resposta.
- Conferência de exclusão/parâmetros sem preflights de escala/geometria,
  de dados malformados antes/depois do PUT e de erro sem replay automático.
- Conferência dos caminhos existentes de calibração, medidas e referências
  após ampliar os tipos do serviço e a leitura máxima da rota.
- TypeScript do web aprovado com `tsc --noEmit --incremental false` pelo
  binário local instalado.
- Lint dos cinco arquivos TypeScript aprovado, sem avisos, pela API do ESLint
  com o parser TypeScript instalado via `eslint-config-next`.
- Os 28 JSONs pt-BR/en foram lidos e as 1215 chaves de `cases.json` coincidem.
- Whitespace, links locais e checklist revisados na documentação atualizada.

Foram realizadas somente checagens estáticas e revisão do código. O aceite
HTTP/funcional continua manual na etapa 13. O produto ainda precisa das
etapas seguintes de writer, estado e visualizador para expor a ferramenta.

##### Testes manuais da etapa 2 — executar após a integração completa

- [ ] E2-01 — Conferir a rede ao salvar cada tipo de intenção. Aceite: um PATCH restrito por confirmação, sem documento completo vindo do navegador nem repetição automática de gravação.
- [ ] E2-02 — Remover um corte ou editar parâmetros sem escala. Aceite: essas operações não exigem preflights geométricos; criar/atualizar geometria exige escala, dimensões e política DICOM válida.
- [ ] E2-03 — Enviar contorno de 500 pontos e provocar excesso de corpo/entrada inválida pelo procedimento manual autorizado. Aceite: o corpo válido cabe; excesso e campos indevidos são recusados sem alterar o plano.

### 3. Writer e recuperação

- Integrar owner TPLO à coordenação de gravação, recibos, locks e limpeza.
- Reconhecer escrita incerta por GET, sem repetir automaticamente o PUT.
- Conservar intenção em conflito. Carregar salvo/descartar são ações explícitas.
- Reconhecer exclusão já observada em revisão posterior, no padrão das medidas.
- Limpar somente o rascunho que corresponde ao comando confirmado.
- Proteger o escopo de organização/caso/imagem e callbacks antigos após troca,
  exclusão, unmount, mudança de query ou retorno tardio de consulta.
- Reutilizar a recuperação compartilhada e o card de pendências em Ferramentas.

**Aceite** — uma escrita por imagem, recuperação de cada comando identificável
e nenhum reaproveitamento de recibo para outro UUID ou parâmetros diferentes.

#### Entrega da etapa 3 — 17/11/2026

O owner `tplo` participa do writer único da imagem. `SavePlanEditSchema` e
`PlanSaveCommandSchema` incluem criar, atualizar, excluir e editar parâmetros.
`SavePlanEditTransportSchema` passa a ser um alias do mesmo schema, encerrando
a separação transitória documentada na etapa 2. O transporte e o BFF mantêm
o contrato e os limites já conferidos.

##### Recibos, concorrência e confirmação

- Operações geométricas identificam o alvo por UUID e tipo de comando.
  Parâmetros globais não recebem UUID artificial. Seu recibo corresponde ao
  patch canonicalizado completo e à revisão enviada, preservando nulos e
  omissões. Outro patch ou outro objeto não reutiliza a pendência anterior.
- Requisições idênticas em andamento compartilham a promessa. Intenções
  diferentes recebem `OPERATION_BLOCKED`. Bloqueios de imagem/caso e
  alterações pendentes nas outras ferramentas continuam aplicáveis.
- Resposta incerta usa somente GET. Revisão inalterada mantém incerteza;
  revisão posterior divergente gera conflito. A confirmação compara os
  campos enviados e exige revisão posterior, sem exigir medida, simulação
  ou correção calculadas. Nenhum PUT é repetido automaticamente.
- `tplo-delete` reconhece ausência em revisão posterior e informa
  `TPLO_ALREADY_REMOVED`, distinguindo ausência observada de autoria da remoção.
- Conflito/erro conservam o comando. O descarte exige a intenção exata e
  ação explícita. Recibos em saving/checking/uncertain só permitem conferência
  quando não há requisição ativa, inclusive após desmontagem/remontagem.

##### Rascunho mínimo e recuperação no workspace

Foi acrescentado `lib/tplo-draft.ts` como contrato mínimo de cache necessário
à limpeza segura desta etapa. Guarda intenção/revisão, UUID quando aplicável,
geometria parcial, fragmento parcial ou patch de parâmetros. A projeção para
comando usa os schemas estritos; geometria incompleta não forma payload.
O editor interativo, sua geração e ações de criação/seleção continuam na etapa 4.

- A limpeza exige correspondência canonicalizada do comando, incluindo revisão,
  e a mesma referência do rascunho capturada no início da operação. Um retorno
  tardio conserva um rascunho mais recente, mesmo com geometria coincidente.
- `imageTploDraft` participa dos guards compartilhados, das notificações de
  rascunhos e da limpeza por exclusão de imagem/caso. O cache permanece em
  memória no QueryClient da organização, sem armazenamento persistente.
- `useTploSaveRecovery` reutiliza `useMeasurementSaveRecovery`. Conferência e
  descarte verificam comando, QueryClient, caso/imagem, identidade da query,
  geração de contexto, montagem e bloqueios atuais. Callbacks antigos não
  descartam recibos novos nem publicam notificações em outro contexto.
- `CaseImageTploRecovery` segue o card escuro e os controles/tooltips universais,
  com estado acessível, conferência por GET e descarte de erro/conflito.
- O workspace direciona a pendência para Ferramentas e preserva seu acesso
  mesmo sem escala ou com estado local de calibração aberto. Enquanto houver
  recuperação TPLO, os canais de edição das outras ferramentas ficam inativos.
  Guards de navegação e avisos de leitura usam as mensagens próprias em pt-BR/en.
- A entrada pública, a edição da osteotomia e seus overlays continuam pendentes.
  O fluxo de calibração → Distância e seus cálculos não foram alterados.

##### Arquivos e revisão estática da etapa 3

- Schemas e coordenação em `schemas/image-plan-command.schema.ts`,
  `lib/image-plan-saving.ts`, `lib/calibration-save-state.ts`,
  `lib/image-plan-draft.ts`, `lib/tplo-draft.ts` e `lib/image-deletion.ts`.
- Cache e recuperação em `hooks/cases-query-keys.ts`,
  `hooks/use-image-plan-drafts.ts`, `hooks/use-workspace-draft.ts`,
  `hooks/use-measurement-save-recovery.ts` e `hooks/use-tplo-save-recovery.ts`.
- Workspace/card em `components/case-image-workspace.tsx` e
  `components/case-image-tplo-recovery.tsx`, com traduções nos dois `cases.json`.
- Revisão por leitura dos quatro comandos, patches diferentes, UUIDs distintos,
  duplo envio, GET sem confirmação, conflito, exclusão já observada, rascunho
  substituído e retorno tardio após troca/desmontagem/exclusão do contexto.
- TypeScript aprovado com `tsc --noEmit --incremental false` pelo binário local.
- Lint dos 13 arquivos TypeScript aprovado, sem erros ou avisos, pela API do
  ESLint com o parser instalado via `eslint-config-next`, sem alterar configuração.
- Os 28 JSONs pt-BR/en foram lidos. As 1240 chaves de `cases.json` coincidem,
  incluindo as 25 novas chaves TPLO. Whitespace e links locais revisados.

Foram realizadas somente revisão de código e checagens estáticas. Não foram
executados testes automatizados/funcionais, gravações remotas ou o backend.
O repositório do backend e arquivos `.env` não foram alterados nem acessados.
O aceite funcional permanece manual na etapa 13. A documentação instalada do
Next continua indisponível em `dist/docs`; esta etapa reutiliza as APIs atuais.

##### Testes manuais da etapa 3 — executar após a integração completa

- [ ] E3-01 — Perder a resposta do salvamento e verificar a pendência. Aceite: somente consulta GET, com confirmação da intenção exata ou manutenção da incerteza/conflito, sem replay da gravação.
- [ ] E3-02 — Provocar conflito e tentar outro UUID/patch. Aceite: a intenção original permanece, a outra não reutiliza o recibo e o descarte é explícito.
- [ ] E3-03 — Confirmar operação antiga após substituir rascunho/contexto; conferir remoção já feita em outra revisão. Aceite: ajuste novo é preservado e ausência observada não é apresentada como nova exclusão.

### 4. Estado e rascunho

- Criar editor com intenção, UUID, revisão base, geração de contexto, centro,
  borda, rotação e fragmento parcial ou completo.
- Separar seleção, vértice ativo, expansão e modo de comparação de alteração
  clínica. Rascunhos incompletos permanecem editáveis e não formam comandos.
- Abrir retoma rascunho ou objeto selecionado. Nova osteotomia gera um UUID
  estável e rotação inicial de 0°, sem reutilizar centro de calibração ou TPA.
- Parâmetros existentes são preservados. Iniciar editor não cria metadados,
  seleciona lâmina ou salva geometria automaticamente.
- Integrar navegação, troca de ferramenta, descarte e exclusão de imagem/caso.
  Revisão antiga bloqueia envio e edição sem perder o rascunho.

**Aceite** — estado de TPLO participa das mesmas proteções de todas as ferramentas.

#### Entrega da etapa 4 — 17/11/2026

`lib/tplo-editor.ts` e `hooks/use-image-tplo.ts` completam a base de estado
sobre o contrato de cache introduzido na etapa 3. O hook recebe imagem,
prontidão da prévia, bloqueio do caso e opções `active`, `toolActive` e
`calibrationEditing`, no padrão das ferramentas existentes.

##### Intenção clínica e apresentação

- `TploEditor` mantém os quatro tipos de intenção, revisão base, UUID quando
  aplicável, centro/borda parciais, rotação e fragmento parcial/completo.
  `contextGeneration` pertence ao hook e invalida callbacks de um contexto
  anterior; não é um dado clínico enviado ao backend.
- `imageTploEditorUi` guarda seleção, ponto/vértice ativo, expansão dos
  detalhes e comparação Original/Simulado. Esses valores ficam em uma query
  separada, sem participar de `hasChanges`, do comando ou da confirmação.
- Selecionar ponto/vértice retorna o modo à origem. Alterar fragmento limpa
  o vértice ativo e conserva a ordem dos pontos. A comparação é somente estado
  local nesta etapa; desenho e composição continuam nas etapas 5–9.
- `fragmentComplete=false` conserva um contorno em edição, inclusive quando
  já tiver três ou mais pontos, e impede formar um comando. A conclusão
  explícita exige 3–500 pontos válidos. `fragment=null` continua sendo a
  remoção explícita do contorno e permite geometria sem fragmento.
- Centro/borda completos precisam ser distintos, normalizados e finitos.
  Rotação e parâmetros usam os limites dos schemas do backend, sem cálculo
  de prévia ou conversão de coordenadas acrescentados nesta etapa.

##### Abrir, retomar, editar e enviar

- Abrir retoma a intenção local. Sem rascunho, usa o objeto selecionado ou
  o único TPLO visível. Com múltiplos objetos, conserva a seleção explícita.
  Objetos ocultos não viram alvos de edição e objetos bloqueados ficam
  disponíveis apenas para seleção/leitura.
- Nova osteotomia recebe um UUID único e estável, label localizável pelo
  mecanismo existente, rotação de 0° e pontos vazios. Não reaproveita centro
  de calibração/TPA, não seleciona lâmina e não salva ao abrir.
- Reabrir um objeto copia somente suas entradas de origem, preservando
  rotação, ordem dos vértices e label do fragmento. O label do objeto é
  conservado no merge. Resultados derivados não entram no editor.
- A intenção de parâmetros começa com patch vazio e sem alterações clínicas.
  Não copia defaults, TPA ou escolhas do caso para os metadados. Só escolhas
  explícitas entram no patch; omissão conserva o salvo e nulo limpa a entrada.
  Sem metadados anteriores, o comando aguarda lateralidade explícita.
- Trocar entre geometria e parâmetros conserva a exclusividade da intenção.
  Alterações pendentes exigem salvar ou descartar. Editor limpo pode ser fechado
  ao trocar de ferramenta, sem alterar o plano confirmado.
- Criar/atualizar exige escala confirmada, dimensões e proteção DICOM atual.
  Excluir dispensa os preflights de geometria; parâmetros também dispensam
  escala/dimensões e não dependem de UUIDs únicos na coleção conservada.
  Operações sobre objetos continuam exigindo IDs únicos e alvo desbloqueado.
- `command`/`submit` conferem revisão, snapshot exibido, UUID, query e bloqueios
  novamente no evento. O envio é explícito pelo writer da etapa 3, sem autosave,
  rebase automático ou repetição de PUT. Erro/conflito usam a recuperação.

##### Concorrência e integração do workspace

- Geração considera QueryClient, caso/imagem, identidade das queries de plano,
  recibo, rascunho e UI, ativação da seção/ferramenta, disponibilidade e contexto
  de dimensões/DICOM. Desmontagem e exclusão invalidam ações antigas.
- Alterações clínicas e escolhas de apresentação efetivas invalidam callbacks
  anteriores. Repetir uma escolha idêntica não incrementa geração sem mudança
  de cache, evitando inutilizar callbacks quando o React Query reutiliza valores.
- Uma revisão posterior preserva o rascunho e bloqueia seleção de outro alvo,
  edição e envio. Descartar é explícito; a recuperação continua limpando somente
  o rascunho correspondente ao comando confirmado/descartado.
- O workspace integra intenção TPLO, retomada, guard de saída e descarte geral.
  Calibrar fecha somente um editor TPLO limpo. Ferramentas existentes respeitam
  a pendência pelo guard compartilhado e fecham o editor limpo na transição.
- Rascunho e UI são removidos com a imagem/caso e ficam somente no QueryClient
  da organização. Preferências de apresentação isoladas não bloqueiam exclusão.
- A entrada pública, controles de criação/rotação/fragmento, formulário de
  parâmetros, overlays e canal TPLO do ViewerEditor continuam nas etapas próprias.
  O visualizador mantém os outros canais inativos enquanto a intenção TPLO
  estiver selecionada. Calibração → Ferramentas → Distância foi preservado.

##### Arquivos, revisão e checagens da etapa 4

- Novos `lib/tplo-editor.ts` e `hooks/use-image-tplo.ts`; extensão de
  `lib/tplo-draft.ts`, `lib/plan-object-label.ts`, `hooks/cases-query-keys.ts`,
  `hooks/use-workspace-draft.ts`, `lib/image-deletion.ts` e
  `components/case-image-workspace.tsx`.
- Traduções pt-BR/en para bloqueio da troca de ferramenta, README da feature
  e roadmap atualizados junto deste plano.
- Revisão por leitura de criação vazia, retomada, seleção e valores apenas
  locais, contorno parcial/completo, patch vazio/nulo, metadados ausentes,
  revisão antiga, UUID/tipo/flags, cliques repetidos, contexto/query substituídos,
  desmontagem, exclusão e confirmação antiga com rascunho mais recente.
- TypeScript aprovado pelo binário local com `--noEmit --incremental false`.
- Lint dos oito arquivos TypeScript aprovado, sem erros/avisos, com o parser
  instalado via `eslint-config-next` e sem alterar configuração.
- Os 28 JSONs pt-BR/en foram lidos. As 1242 chaves de `cases.json` coincidem,
  incluindo 27 chaves TPLO. Whitespace, encoding, links locais e checklist revisados.

Somente revisão de código e checagens estáticas foram realizadas. Não foram
executados testes automatizados/funcionais, gravações remotas ou o backend.
O repositório do backend e `.env` permanecem intocados. A documentação instalada
do Next continua ausente em `dist/docs`; não foram introduzidas APIs novas do Next.
O aceite integrado continua manual na etapa 13. Próxima implementação é a etapa 5.

##### Testes manuais da etapa 4 — executar após a integração completa

- [ ] E4-01 — Abrir, sair e retomar um rascunho parcial. Aceite: mesmo UUID e pontos, sem autosave; nova osteotomia começa vazia e com rotação 0°.
- [ ] E4-02 — Selecionar ponto/vértice, expandir detalhes e alternar comparação. Aceite: essas escolhas não tornam um editor limpo pendente nem entram no payload.
- [ ] E4-03 — Marcar três pontos sem concluir o contorno e abrir parâmetros sem lateralidade salva. Aceite: nenhum desses rascunhos forma envio antes da conclusão/lateralidade explícita, respectivamente.
- [ ] E4-04 — Atualizar revisão em outro contexto, trocar de ferramenta e tentar excluir imagem/caso. Aceite: edição/envio antigos ficam bloqueados; rascunho pendente é preservado até decisão explícita; preferências isoladas não bloqueiam exclusão.

### 5. Canal do visualizador e geometria

- Acrescentar canal próprio ao `ViewerEditor` e adaptadores de coordenadas.
- Implementar seleção de objeto, centro, borda, corpo e vértices com hit testing
  consistente em zoom e toque. Respeitar `visible` e `locked`.
- Calcular círculo e raio em pixels originais, incluindo ajuste numérico em mm.
  Se o valor solicitado ultrapassar a geometria possível, informar a limitação
  sem deformar silenciosamente o raio escolhido.
- Conter translações de entrada como um conjunto, sem clamp individual que
  deforme o contorno. Resultados transformados mantêm liberdade fora da imagem.
- Reutilizar pan, zoom, fullscreen, toque, teclado/Shift, captura e cancelamento.
  Vincular o gesto à identidade, revisão, geração e geometria capturadas.
- Pointer move/setas atualizam somente prévia transitória. Commit do gesto
  atualiza o rascunho, mantendo a gravação remota explícita.
- Revisar tokens e separação visual de origem, corte, resultado, TPA e valores.

**Aceite** — nenhuma geometria TPLO entra nos callbacks de calibração, LINE,
CIRCLE ou ANGLE. Cancelamento restaura o estado anterior ao gesto.

#### Entrega da etapa 5 — visualizador e geometria

`ViewerEditor` passa a ter canais próprios `tplo` e `tplo-select`. O adaptador
mantém o marcador de calibração/LINE nulo e os outros canais de medida vazios.
`tplo-geometry.ts` e `tplo-interaction.ts` operam somente a geometria de origem,
sem calcular rotação simulada ou interpretar o TPA como parte do corte.

##### Coordenadas, raio e limites

- Centro, borda e cada vértice são convertidos entre normalizado e pixels
  pela largura/altura originais. O círculo usa `hypot(edge-center)` nesses
  pixels, inclusive em radiografia retangular. Pontos inalterados conservam
  as coordenadas normalizadas originais para evitar deriva de conversão.
- `tploRadiusMm` usa a escala confirmada. `tploWithDiameter` preserva centro,
  direção e fragmento, usando `diâmetro / (2 * mm_per_pixel)` para o raio.
  O hook expõe `setCutDiameter`, com resultado `available`, `invalid` ou
  `out-of-bounds` e mensagens pt-BR/en preparadas para o controle da etapa 7.
  Solicitação inviável não altera nem reduz silenciosamente o diâmetro.
- Arrastar conjunto/circunferência move centro, borda e todos os vértices.
  Centro isolado move o pivô e a borda juntos, conservando raio/direção e
  deixando o fragmento no lugar. Borda altera somente o raio/direção.
  Fragmento move somente seus pontos; vértice move somente o ponto escolhido.
- Translações calculam um único deslocamento permitido para o grupo afetado.
  Não há clamp individual que deforme o conjunto. Ajustes isolados de borda
  ou vértice respeitam as bordas inclusivas da matriz original.
- `TploGeometry.fragmentClosed` é apresentação local derivada da conclusão
  do rascunho. Contorno parcial permanece aberto. O callback de origem só
  modifica pontos existentes, preservando label, quantidade, ordem, rotação
  e estado de conclusão. Não insere/remove vértices nem conclui o fragmento.
- Resultados transformados continuam em outro modelo de leitura. Nenhum
  helper de limites de origem recebe os pontos de simulação do servidor.

##### Seleção, gestos e commit

- Hit testing mede tolerâncias em pixels de tela, independentemente do zoom.
  Alças/circunferência do corte têm prioridade sobre o contorno/interior do
  fragmento, com seleção de vértice e desempate estável. Ocultos não são
  escolhidos; bloqueados podem ser selecionados, sem edição.
- O canal reaproveita ponteiro primário, captura, pan, zoom, fullscreen,
  foco e espelhamento do visualizador. O ponteiro volta ao referencial da
  matriz antes do hit testing/arraste; setas horizontais são refletidas uma vez.
- Movimento de ponteiro atualiza somente a prévia interna. Soltar o ponteiro
  confirma um arraste deliberado no rascunho. Clique curto apenas seleciona
  o alvo, sem provocar alterações geométricas ou gravação remota.
- Setas acumulam prévia transitória em referência síncrona, incluindo teclas
  simultâneas/repetição. O passo é 1 pixel original ou 10 com Shift. Soltar
  todas as setas confirma uma vez; Esc e perda de foco cancelam a prévia.
  Atalhos 1/2/3/4 selecionam conjunto/centro/borda/fragmento; vértices usam
  a seleção explícita mantida pelo editor, a ser exposta na etapa 8.
- Gesto captura identidade de interação, UUID, revisão, geração, geometria,
  alvo, dimensões, URL da imagem, espelhamento, disponibilidade e enquadramento.
  Mudança de contexto, zoom/layout, ferramenta ou captura invalida o gesto.
  Cancelamento não modifica o rascunho anterior nem chama outro canal.
- A seleção do alvo é incorporada junto do commit geométrico para não mudar
  a geração no início do arraste e cancelar a própria captura. Seleção entre
  objetos leva revisão/geração no token, sem serializar toda a coleção em
  cada quadro de prévia.
- Nenhum gesto chama o writer ou a fila de autosave de Distância.

##### Renderização, escopo e checagens

- `ViewerTploEditorOverlay` desenha círculo, raio guia, contorno de origem e
  alças com tamanho constante na tela. Origem usa o token de interesse com
  traço interrompido; corte usa o token de acento. Tokens TPLO próprios
  mantêm TPA verde e medidas ciano. O token de resultado fica reservado à
  leitura/composição das etapas seguintes, sem desenhar resultado local como salvo.
- O workspace encaminha apenas o editor geométrico completo ao canal TPLO.
  A seleção de objetos usa entradas de origem; a apresentação de resultados
  oficiais/salvos continua na etapa 6. Posicionamento inicial, edição do
  contorno, rotação/composição, card e entrada pública continuam nas etapas 7–12.
- Arquivos novos `lib/tplo-geometry.ts`, `lib/tplo-interaction.ts` e
  `components/viewer-tplo-editor-overlay.tsx`. Integração em `lib/viewer-editor.ts`,
  `lib/tplo-editor.ts`, `hooks/use-image-tplo.ts`, `components/case-image-viewer.tsx`
  e `components/case-image-workspace.tsx`; aliases em `app/globals.css` e textos
  pt-BR/en em `cases.json`.
- TypeScript aprovado com `--noEmit --incremental false`. Lint dos oito arquivos
  TypeScript sem erros; um aviso `@next/next/no-img-element` já existia no `<img>`
  do visualizador, confirmado por comparação estática com HEAD. Nenhuma regra
  foi suprimida e nenhuma API nova do Next foi introduzida; `dist/docs` segue ausente.
- Os 28 JSONs pt-BR/en foram lidos; 1248 chaves de `cases.json` coincidem,
  incluindo 33 chaves TPLO. Whitespace, encoding, links locais e checklist revisados.

Somente revisão de código e checagens estáticas foram realizadas. Não houve
execução de testes automatizados/funcionais, gravação remota, execução ou
alteração do backend, nem acesso a `.env`/credenciais. As listas abaixo são
pendências de aceite manual para o encerramento da integração.

##### Revisão complementar da etapa 5 — 17/11/2026

A segunda revisão comparou o plano com os caminhos de ponteiro/teclado,
adaptadores, hook e integração do workspace. Foram identificados e corrigidos
os seguintes casos por leitura do código, sem executar testes funcionais.

- **Início do arraste dentro da tolerância da alça** — borda e vértice usavam
  diretamente a posição do ponteiro e podiam saltar ao começar o movimento.
  Passam a aplicar o deslocamento a partir da posição capturada, conservando
  a distância inicial entre ponteiro e alça. Deslocamento zero conserva o ponto.
- **Ponteiro capturado fora da imagem** — o mapeamento TPLO conserva o
  deslocamento do ponteiro sem clamp antecipado. O limite é aplicado depois,
  ao grupo de origem, para permitir alcançar a borda mesmo com o ponto de
  captura afastado da alça. O resultado de origem continua limitado à matriz.
- **Ausência das dimensões originais** — o visualizador base admite dimensões
  da prévia para exibir a radiografia. O canal TPLO agora bloqueia desenho e
  hit testing sem dimensões originais, conservando rascunho e operações que
  dispensam geometria. A resolução da prévia não substitui a matriz original.
- **Continuidade indevida de tecla cancelada** — cada gesto de teclado mantém
  suas teclas aceitas e seu owner. Repetição de tecla de um gesto cancelado por
  Esc, foco ou contexto não inicia nem interfere em outro gesto, mesmo quando
  outra seta é pressionada. Uma nova pressão é necessária para aceitar a tecla.
  O token de teclado TPLO acompanha identidade, revisão e geração do gesto.
- **Perda de foco do quadro durante arraste** — além do blur da janela, sair
  do foco do quadro cancela a captura/prévia TPLO sem commit. Os outros canais
  mantêm o comportamento anterior.
- **Seleção em limite geométrico** — quando o limite impede deslocamento,
  o alvo escolhido ainda é atualizado na query de UI. O rascunho clínico não
  é substituído nem passa a contar como alteração por uma seleção isolada.
- **Raio e escala numéricos** — a validação recusa raio não finito e o cálculo
  de diâmetro evita overflow intermediário ao dobrar uma escala finita muito
  alta. Solicitações não representáveis continuam sem alterar a geometria.

TypeScript, lint dos oito arquivos da etapa, traduções pt-BR/en e whitespace
foram conferidos novamente. O lint mantém somente o aviso preexistente de
`<img>`. Critérios E5-07 a E5-09 foram acrescentados e permanecem pendentes.
Etapa 6 e entrada pública não foram iniciadas. Backend e `.env` permanecem
intocados; nenhum teste automatizado ou funcional foi executado nesta revisão.

##### Testes manuais da etapa 5 — executar após a integração completa

- [ ] E5-01 — Usar imagem retangular e escala conhecida. Aceite: raio/círculo usam pixels originais; em 1000×2000, centro (0,5; 0,5), borda (0,6; 0,5) e escala 0,1 mm/px produzem raio 10 mm e diâmetro 20 mm.
- [ ] E5-02 — Mover conjunto, centro, borda, fragmento e vértice. Aceite: somente o grupo definido acima muda; limites preservam forma, raio/direção quando aplicáveis, labels, rotação e ordem dos pontos.
- [ ] E5-03 — Repetir com espelhamento, zoom, pan, toque e fullscreen; selecionar registros ocultos/bloqueados. Aceite: alças permanecem selecionáveis com tolerância de tela; ocultos não são escolhidos e bloqueados não são editados.
- [ ] E5-04 — Arrastar/segurar setas e cancelar com Esc, perda de foco/captura ou troca de contexto. Aceite: a prévia desaparece e o rascunho anterior permanece; concluir atualiza uma vez, sem requisição de gravação. Shift usa 10 pixels originais.
- [ ] E5-05 — Informar diâmetro viável e depois inviável na mesma direção. Aceite: o viável conserva centro/fragmento e corresponde à escala; o inviável informa o limite e mantém a geometria anterior, sem redução silenciosa.
- [ ] E5-06 — Reabrir Distância, Ângulo, Círculo e TPA e repetir calibração → Ferramentas → Distância. Aceite: canais, cores, gestos e linha inicial existentes continuam funcionais, sem dados TPLO em seus callbacks/payloads.
- [ ] E5-07 — Arrastar borda/vértice começando ao lado da alça, dentro da tolerância, e levar o ponteiro capturado para fora da imagem. Aceite: sem salto inicial; a alça alcança a borda sem ultrapassá-la; translação do conjunto preserva a forma; no limite o alvo pode ser selecionado sem criar alteração clínica.
- [ ] E5-08 — Abrir imagem com prévia, mas sem dimensões originais. Aceite: nenhum desenho/seleção TPLO usa a resolução da prévia; o rascunho é preservado.
- [ ] E5-09 — Segurar seta, cancelar por Esc/Tab/troca de contexto e manter a tecla pressionada, inclusive ao pressionar outra seta. Aceite: repetições antigas são ignoradas; somente nova pressão aceita a tecla; soltar as setas aceitas conclui uma vez, sem gravação remota. Tab durante arraste também cancela sem commit.

### 6. Leitura e apresentação das osteotomias salvas

- Selecionar todos os TPLOs salvos por UUID, mantendo os demais objetos.
- Ler raio/rotação oficiais com estados e unidades apropriados.
- Validar fingerprint da calibração e dimensões para apresentar resultados
  geométricos consistentes. Distinguir dados atuais, ausentes e desatualizados.
- Para `SIMULATED`, conferir matriz 2×3, números finitos, pontos com `x/y`
  válidos em pixels e correspondência de quantidade com a origem.
- Renderizar origem e resultado oficial. Compatibilidade de resposta antiga
  sem pontos transformados pode usar a matriz oficial válida sobre a origem,
  com a mesma convenção. Matriz ausente/inválida gera estado indisponível.
- Não preencher resultados oficiais ausentes com cálculo local apresentado
  como salvo. Refetch em falha conserva o editor e oferece recuperação.

**Aceite** — resposta parcial é representada sem quebra do quadro ou corrupção
do documento, e objetos ocultos/bloqueados conservam seu comportamento.

#### Implementação entregue e revisão da etapa 6 — 17/11/2026

- `lib/tplo-result.ts` seleciona todos os objetos TPLO por UUID, sem alterar o
  documento ou absorver LINE/ANGLE/CIRCLE/IMPLANT. Confere a identidade da
  imagem e detecta UUIDs duplicados, inclusive entre tipos distintos.
- A origem é projetada pelo schema de entrada. Contornos degenerados aceitos
  pelo backend continuam legíveis, conservando quantidade e ordem dos pontos.
  Objetos ocultos permanecem no modelo de leitura e ficam fora do desenho,
  lista visível e seleção por ponteiro; editor restaurado também respeita essa
  ocultação. Bloqueados podem ser consultados/selecionados, sem liberar edição.
- Raio e rotação são lidos exclusivamente de `measurement.values.radius` e
  `measurement.values.rotation`, com status `CALCULATED`, unidades `mm` e
  `degrees` e fingerprint da calibração atual. Zero e ±180° são válidos.
  A coerência com a geometria em dimensões originais é conferida; cálculo
  local não completa campos oficiais ausentes nem substitui seus valores.
- A simulação é validada independentemente da medida. `SIMULATED` exige
  calibração/fingerprint atuais, fragmento original, matriz finita 2×3 e
  transformação rígida coerente com pivô, rotação e dimensões originais.
  Centro, raio e rotação derivados, quando presentes, também são conferidos.
  Pontos oficiais exigem `x/y` finitos, quantidade e ordem correspondentes e
  coerência com a aplicação da matriz oficial ao contorno original.
- Somente a ausência de `transformed_fragment_points_px` habilita a
  compatibilidade antiga: aplicar a matriz oficial válida sobre os pontos de
  origem. Lista presente vazia, inválida ou divergente não usa esse fallback.
  Matriz ausente/vazia/inválida continua indisponível, sem gerar outra matriz.
  Pontos transformados podem ultrapassar a imagem e não recebem clamp.
- A comparação numérica usa tolerância relativa/absoluta de `1e-9` apenas
  para coerência de ponto flutuante; não é tolerância clínica ou arredondamento
  de tabela. Dimensões ausentes e DICOM anisotrópico impedem resultado elegível.
- `components/tplo-overlay.tsx` desenha os cortes/contornos de origem e o
  contorno oficial selecionado, com tokens TPLO, distinção contínuo/tracejado,
  descrição acessível e texto contraespelhado. O editor existente continua
  dono da geometria em edição, evitando desenhar a origem duas vezes.
- O contorno oficial acompanha o estado de comparação `simulated`, separado
  de `original`, já definido na etapa 4. Os controles de comparação, rotação
  local e composição da textura continuam na etapa 9. Esta etapa oferece a
  leitura/renderização oficial, sem antecipar esses controles.
- `components/case-image-tplo-saved.tsx` apresenta uma lista compacta,
  expansível e acessível, inicialmente com um item, valores brancos e unidades.
  Seleção e recuperação usam o hook existente. Estados ausente, incompleto,
  desatualizado, inválido, não conferido e pré-requisitos são identificados
  separadamente para medida e simulação, com traduções pt-BR/en.
- O workspace reutiliza as origens validadas para picking. O gesto transitório
  tem owner por imagem, UUID, revisão, geração, geometria e QueryClient; durante
  gesto/rascunho alterado, valores e contorno oficiais anteriores não são
  apresentados como resultado do ajuste atual. Nenhuma gravação por movimento.
  O seletor é memoizado e o aviso de gesto só altera estado ao iniciar/encerrar,
  sem revalidar todos os contornos a cada movimento do ponteiro.
- Falha de GET mantém editor/cache e oferece `Conferir plano`, reutilizando
  `refreshRead`. O resultado em cache fica não conferido e não vira prévia
  local. Recebimentos incertos/conflitos continuam no card de recuperação da
  etapa 3. Não houve nova operação de escrita ou endpoint.

Checagens estáticas da entrega:

- TypeScript sem emissão aprovado, sem novas APIs do Next.
- ESLint dos quatro arquivos TS/TSX da etapa: zero erros e zero avisos,
  usando o parser TypeScript instalado pelo `eslint-config-next`.
- Os 28 JSONs pt-BR/en foram lidos; 1272 chaves de `cases.json` coincidem,
  incluindo 57 chaves TPLO, com os mesmos placeholders entre idiomas.
- Whitespace, UTF-8, links locais da documentação e revisão do escopo
  conferidos. Os arquivos não versionados desta etapa entram na conferência.
- Nenhum teste automatizado/funcional/E2E, execução do backend ou gravação
  remota. Backend e `.env` preservados. Entrada pública e etapas 7–13 pendentes.

##### Testes manuais da etapa 6 — executar somente ao final da integração

- [ ] E6-01 — Carregar vários TPLOs junto de outras marcações, incluindo oculto e bloqueado. Aceite: cada UUID mantém sua origem/resultado, lista começa compacta, oculto não aparece e bloqueado permite leitura sem edição; outros objetos permanecem intactos.
- [ ] E6-02 — Consultar raio/rotação oficiais com 0° e ±180°, depois retirar valores/unidades ou mudar calibração/dimensões. Aceite: valores atuais têm unidades corretas; campos ausentes ou resultados divergentes ficam indisponíveis/desatualizados, sem números locais apresentados como salvos.
- [ ] E6-03 — Consultar `SIMULATED` normal e resposta antiga sem pontos transformados. Aceite: desenha os pontos oficiais; na resposta antiga aplica somente a matriz oficial à origem, inclusive para pontos fora da imagem, com zoom/espelhamento e contornos degenerados preservados.
- [ ] E6-04 — Consultar matriz ausente/inválida, contagem divergente, ponto não finito e UUID duplicado. Aceite: resultado incoerente não é desenhado como salvo; falha estrutural de leitura preserva cache/rascunho e informa indisponibilidade, sem fallback que esconda corrupção ou seleção ambígua.
- [ ] E6-05 — Arrastar/ajustar uma osteotomia, cancelar e provocar falha de consulta seguida de `Conferir plano`. Aceite: resultado anterior não representa o gesto/rascunho atual; cancelar recupera a apresentação anterior; GET preserva intenção local e não repete PUT nem grava por movimento.

### 7. Posicionamento inicial da osteotomia

- Conectar centro → borda por mouse/toque e alternativa por teclado.
- Permitir ajustar centro, borda e tamanho físico, com controles alinhados.
- Conservar o centro escolhido ao ajustar o raio. Mover o conjunto segue a
  convenção fechada na etapa 0 e conserva o ângulo informado.
- Permitir concluir a geometria sem fragmento, com a pendência correspondente.
- Manter a entrada pública desabilitada até concluir os fluxos restantes.

**Aceite** — entrada completa gera um TPLO válido e não gera landmarks,
referência de calibração ou recomendações clínicas.

#### Entrega e revisão da etapa 7 — 17/11/2026

- `lib/tplo-placement.ts` representa centro → borda, converte a posição parcial
  em pixels originais e fornece a prévia por teclado. Setas usam 1 pixel,
  Shift usa 10, com bordas inclusivas e direção horizontal refletida uma vez.
  A posição inicial sugerida é somente um cursor; não cria geometria, não
  escolhe lâmina e exige confirmação explícita de cada ponto.
- `ViewerEditor` mantém o canal próprio TPLO e agora adapta também o estado
  parcial, sem marcador de calibração/LINE nem canais CIRCLE/ANGLE/landmarks.
- `CaseImageViewer` confirma no pointer-up um clique/toque primário breve
  dentro da imagem. Arrastar e retornar à posição inicial, soltar fora,
  cancelar captura, perder foco ou trocar de geração/contexto não confirma.
  No teclado, Enter exige prévia visível; repetição de Enter não confirma o
  ponto seguinte. Esc/foco/contexto eliminam prévia e ignoram repetições antigas.
- O owner do gesto inclui o passo e o centro parcial, além de UUID, revisão,
  geração, contexto, dimensões e apresentação já protegidos na etapa 5.
  O callback usa `placePoint` do hook existente, que também confere o passo,
  a identidade e a revisão antes de alterar o rascunho. Não grava remotamente.
- `ViewerTploPlacementOverlay` mostra centro, borda transitória e círculo do
  corte com o token TPLO e alças de tamanho de tela constante. A prévia parcial
  não é uma simulação nem um resultado oficial.
- `CaseImageTploCutControls` usa card escuro, Centro/Borda lado a lado, ajuda
  e tooltips universais, foco explícito no quadro e diâmetro em mm com aplicação
  explícita. Digitar não altera o rascunho. Aceita vírgula/ponto decimal e
  recusa vazio, zero, negativos, valores não finitos e sintaxe inválida.
- O diâmetro usa as dimensões originais e a escala salva. `setCutDiameter`
  conserva centro, direção da borda, fragmento, labels e rotação. Pedido inviável
  informa o problema e mantém a geometria anterior, sem redução silenciosa ou
  sincronização com `document.tplo.blade_diameter_mm`.
- Ajustar o centro move centro/borda juntos e mantém o fragmento. Mover o
  conjunto pelo corpo mantém o comportamento da etapa 5. Não há botão de
  mover conjunto, controles de vértices, rotação ou lâmina de tabela nesta etapa.
- Centro e borda distintos completam a geometria e permitem formar o comando
  com `fragment=null`. A UI indica que a simulação ainda exige fragmento;
  `FRAGMENT_REQUIRED` salvo é legível, sem inventar contorno ou landmarks.
- Falhas de leitura e revisão antiga têm orientação explícita e preservam
  rascunho. O campo numérico é renovado ao mudar geração, identidade, revisão,
  geometria ou escala, sem reaproveitar texto pendente de outro contexto.
  Descarte é explícito e conserva o objeto salvo. Entrada pública,
  criação de contorno, rotação, confirmação/persistência pela UI e exclusão
  continuam nas etapas próprias 8–12; nenhuma delas foi antecipada.

##### Automação executada na etapa 7

Foram acrescentados dois arquivos, sem dependências novas e sem acessar o
backend, credenciais ou `.env`. Os casos usam os módulos reais do frontend;
o teste DOM bloqueia `fetch` e exige zero requisições.

- `apps/web/test/tplo-placement.test.mjs`: 11 testes de sequência, comandos
  estritos, entrada inválida, fragmento ausente, coordenadas retangulares,
  isolamento dos canais, teclado/limites, tamanho físico, rejeição de diâmetro
  inviável, preservação de rotação/fragmento e merge que conserva os demais dados.
- `apps/web/test/tplo-viewer-placement.test.mjs`: 7 testes de eventos em DOM
  simulado: mouse/toque, arraste/cancelamento/saída, espelhamento, teclado/Shift,
  Enter repetido, foco/geração/repetições antigas, somente leitura e formulário
  de diâmetro. O DOM não possui layout real e não substitui aceite visual.
- `apps/web/test/viewer-editor.test.mjs`: 5 testes existentes de regressão
  sobre conversão, calibração/Distância, arraste e teclado compartilhados.

Resultado: **23 testes aprovados**, zero falhas, sem requests ou gravações
remotas. Executar a partir de `apps/web`:

```text
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test --test-concurrency=1 test/tplo-placement.test.mjs test/tplo-viewer-placement.test.mjs test/viewer-editor.test.mjs
```

Checagens estáticas: TypeScript sem emissão aprovado; lint de oito arquivos
TS/TSX/MJS sem erros, com apenas o aviso preexistente de `<img>` no visualizador.
Os 28 JSONs de tradução são válidos; 1290 chaves de `cases.json` e seus
placeholders coincidem entre pt-BR/en, incluindo 75 chaves TPLO. Whitespace,
UTF-8 e links locais conferidos. Backend, `.env` e alterações acumuladas
preservados. Nenhuma execução remota ou alteração do contrato.

##### Testes manuais da etapa 7 — executar após a integração completa

- [ ] E7-01 — Em imagem real retangular, posicionar centro/borda por mouse e dispositivo de toque, repetindo com zoom, pan, espelhamento e fullscreen. Aceite: cursor/alças acompanham o ponto esperado e o círculo tem o tamanho correto, sem saltos, corte de controles ou sobreposição ruim.
- [ ] E7-02 — Navegar só por teclado e conferir ajuda/erros em pt-BR/en, tela estreita e leitor de tela. Aceite: passo atual, foco, unidades e ações são compreensíveis; setas/Enter/Shift/Esc funcionam no navegador e o diâmetro inviável mantém o corte anterior com orientação visível.
- [ ] E7-03 — No fluxo integrado, completar sem fragmento, salvar/reabrir e repetir com recalibração, revisão concorrente e falha de GET. Aceite: backend confirma o TPLO sem fragmento com a pendência correspondente; rascunho/revisão são preservados e calibração, TPA, outras marcações e parâmetros globais permanecem corretos.

### 8. Delimitação e ajuste do fragmento

- Posicionar vértices em sequência no referencial original com indicador breve
  da etapa. Oferecer concluir, cancelar e corrigir o último ponto localmente.
- Fechar o polígono visualmente entre último e primeiro vértices, sem exigir
  a duplicação desse ponto no payload.
- Oferecer seleção/ajuste por vértice e inserção/remoção explícitas, respeitando
  3 a 500 pontos e a revisão do gesto. Separar fragmento incompleto do salvo.
- Conservar ordem e precisão dos pontos. Não simplificar o contorno salvo,
  mover landmarks ou gerar curva anatômica automaticamente.
- Remover contorno é ação explícita sobre o objeto, com `fragment=null` e
  retorno ao estado sem fragmento, preservando centro, borda e rotação.
- Contorno degenerado deve produzir estado visual compreensível. Orientar
  correção sem aplicar restrições remotas inventadas ou apagar dados anteriores.

**Aceite** — contorno original persistível e editável, sem acumular transformações.

#### Entrega e revisão da etapa 8 — 18/11/2026

- `lib/tplo-fragment-editor.ts` concentra operações puras para iniciar,
  adicionar ponto, desfazer último, concluir, cancelar, inserir/remover vértice
  e remover contorno. Usa exclusivamente os pontos originais normalizados;
  não utiliza a matriz ou os pontos transformados da simulação.
- Iniciar/redesenhar cria contorno vazio com `fragmentComplete=false` e copia
  o anterior em `fragmentBeforeEdit`, campo exclusivo do rascunho local.
  Cancelar restaura essa cópia sem desfazer ajustes do corte. Para rascunhos
  incompletos antigos sem cópia, a recuperação usa o fragmento do plano da
  mesma revisão; criar sem fragmento retorna a nulo ao cancelar.
- A cópia preserva pontos/label e sobrevive à retomada do rascunho no cache.
  Concluir ou remover contorno limpa a cópia. `tploCommandFromDraft` continua
  projetando somente campos do comando estrito: cópia, conclusão, seleção e
  demais estados locais nunca entram no transporte.
- Contorno parcial não forma comando, mesmo depois do terceiro ponto.
  Conclusão explícita valida 3–500 pontos, conserva ordem/precisão e fecha
  somente a representação visual, sem acrescentar o primeiro ponto ao payload.
  Desfazer retira apenas o último ponto; não desfaz centro, borda ou rotação.
- Adição confere a quantidade esperada, além das proteções do hook contra
  revisão, geração, UUID, identidade das queries, bloqueios e callbacks antigos.
  O ponto 501 não é aceito. Nenhuma mudança grava automaticamente.
- `useImageTplo` expõe essas ações usando o mesmo `update` protegido. A inserção
  é explícita no ponto médio do trecho seguinte ao vértice selecionado,
  incluindo o trecho de fechamento. O novo vértice fica selecionado para ajuste.
  Remoção de vértice mantém no mínimo três pontos; remover contorno é uma ação
  distinta com `fragment=null`, preservando centro, borda e rotação.
- `ViewerEditor` e `CaseImageViewer` acrescentam modo próprio de marcação do
  fragmento. Clique/toque primário confirma no pointer-up; setas/Shift movem
  somente a prévia, e Enter confirma. O owner inclui pontos/estado do contorno.
  Arraste e retorno, saída da imagem, Esc, perda de captura/foco e geração antiga
  não confirmam pontos. Enter repetido não acrescenta um ponto seguinte.
- `ViewerTploFragmentPlacementOverlay` desenha só a prévia do trecho seguinte
  e seu cursor. O overlay do editor já fecha o contorno concluído e mantém o
  parcial aberto. Ajuste por alça ou teclado reutiliza a geometria em pixels
  originais e o commit transitório da etapa 5, com espelhamento desfeito uma vez.
- `CaseImageTploFragmentControls` usa seção compacta, ajuda universal,
  contador, concluir/cancelar, correção do último ponto e seletor de vértice.
  Inserir/remover ficam lado a lado; redesenhar/remover contorno ficam nos
  detalhes. Durante a marcação, o card oculta os controles do corte para manter
  o foco no contorno, conservando o descarte do rascunho e a recuperação de GET.
- Pontos sobrepostos/alinhados recebem orientação para revisão sem impedir
  conclusão/envio que o backend aceita. A detecção é apenas visual e não impõe
  área clínica mínima; não elimina duplicatas, reordena ou simplifica o contorno.
  Polígonos pequenos e contornos degenerados anteriores são conservados.
- Calibração, landmarks/TPA, outras marcações, parâmetros globais e labels
  permanecem fora dessas operações. A entrada pública, rotação/composição,
  parâmetros, confirmação e exclusão do TPLO continuam nas etapas 9–12.

##### Automação e checagens da etapa 8

- Novo `apps/web/test/tplo-fragment.test.mjs`: 9 testes de sequência e
  conclusão explícita, cancelamento/cópia e compatibilidade antiga, limites,
  coordenadas inválidas, inserção/remoção, precisão/ordem, movimento de vértice,
  contorno degenerado persistível e remoção que conserva os demais dados.
- `apps/web/test/tplo-viewer-placement.test.mjs` recebeu 9 testes de DOM/hooks:
  marcação do fragmento, cursor/teclado/geração, limite e somente leitura,
  fechamento visual e ajuste de vértice, controles, restauração, callbacks
  antigos, revisão concorrente e fluxo concluir → inserir → remover → limpar.
  Os hooks usam cache sintético e `fetch` bloqueado; nenhuma consulta remota.
- Suíte direcionada: **41 testes aprovados**, incluindo 18 novos e os 23 da
  entrega anterior. Não são testes do backend nem aceite clínico/visual.

Executar a partir de `apps/web`:

```text
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test --test-concurrency=1 test/tplo-fragment.test.mjs test/tplo-placement.test.mjs test/tplo-viewer-placement.test.mjs test/viewer-editor.test.mjs
```

TypeScript sem emissão aprovado. ESLint dos 11 arquivos TS/TSX/MJS da etapa
sem erros; permanece apenas o aviso preexistente de `<img>` no visualizador.
Os 28 JSONs foram lidos; 1317 chaves de `cases.json`, incluindo 102 TPLO,
coincidem entre pt-BR/en com os mesmos placeholders. Whitespace, UTF-8, links
locais e escopo conferidos, incluindo arquivos não versionados. Nenhuma nova
API do Next, execução/escrita remota, alteração do backend ou de `.env`.

##### Revisão complementar da etapa 8 — 18/11/2026

Revisão solicitada antes de iniciar a etapa 9, incluindo operações puras,
projeção estrita do comando, cópia/cancelamento, limites, UI, vínculo entre
workspace/hook/visualizador e bloqueios de revisão/contexto.

Foi reproduzido e corrigido um problema de precedência: um vértice selecionado
no menu podia estar sobre centro, borda ou circunferência do corte. O hit testing
escolhia o corte e o arraste alterava outro alvo. A sobreposição com outro TPLO
também podia selecionar aquele objeto em vez de ajustar o vértice escolhido.

- `tplo-interaction.ts` agora respeita um vértice explicitamente selecionado
  dentro da tolerância existente de 12 pixels de tela. Isso também permite
  separar vértices coincidentes sem alterar os outros pontos. Fora da alça,
  continuam válidas as prioridades padrão de centro/borda/circunferência.
- `pickTplo` recebe a preferência somente para o TPLO selecionado. O visualizador
  a encaminha no modo Marcar; pan/seleção padrão e objetos ocultos mantêm seu
  comportamento. Não muda a geometria, escala ou decisão clínica pelo clique.
- Um teste de regressão falhou com o código anterior e passou após a correção.
  Dois testes puros novos cobrem sobreposições com o próprio corte/outro TPLO,
  a prioridade padrão, vértices coincidentes e exclusão de objetos ocultos.
- Quatro testes novos de DOM cobrem workspace completo ao redesenhar/concluir/
  cancelar, commit de um único vértice com card desabilitado durante o gesto,
  arraste sobre a borda sem redimensionar o corte e sobreposição entre TPLOs.
  Usam componentes/hooks reais, cache sintético e `fetch` bloqueado.
- As demais verificações da etapa continuam coerentes: contorno aberto até
  confirmação explícita, 3–500 pontos, ordem/precisão/labels, cópia local fora
  do payload, remoção por `fragment=null`, preservação dos outros dados e
  rejeição de geração/revisão antigas. Não foi necessário alterar esses fluxos.

Resultado da revisão: **47 testes locais aprovados** (seis adicionais à entrega
da etapa 8), TypeScript sem emissão aprovado, lint de quatro arquivos sem erros
e apenas o aviso preexistente de `<img>`. JSONs/placeholder, UTF-8, whitespace e
links locais conferidos. A correção usa os limites e canais existentes, sem
nova API do Next ou mudança de configuração. Nenhuma chamada/escrita remota,
alteração do backend ou de `.env`. Etapa 9 permanece não iniciada.

##### Testes manuais da etapa 8 — executar após a integração completa

- [ ] E8-01 — Delimitar fragmento em radiografia real por mouse/toque e teclado, com zoom, pan, espelhamento e fullscreen. Aceite: os pontos seguem o local escolhido, o contorno parcial permanece aberto e a conclusão fecha o desenho sem ponto extra no payload; alças, contador e foco permanecem compreensíveis.
- [ ] E8-02 — Reabrir contorno salvo, ajustar vértice, inserir no trecho de fechamento, remover vértice e redesenhar/cancelar. Aceite: somente os pontos escolhidos mudam, ordem/precisão/labels são preservados, cancelar restaura o contorno anterior sem perder ajustes do corte e controles permanecem utilizáveis em tela estreita e leitor de tela.
- [ ] E8-03 — Completar 3 e 500 pontos, revisar contorno degenerado, remover contorno e salvar/reabrir no ambiente integrado. Aceite: backend recebe apenas a origem válida ou `fragment=null`; degeneração orienta sem restrição inventada, revisão/falhas preservam a intenção e calibração, TPA, rotação e parâmetros globais permanecem corretos.
- [ ] E8-04 — Selecionar um vértice sobre centro/borda/circunferência do corte, outro TPLO ou um vértice coincidente e arrastá-lo com diferentes níveis de zoom/espelhamento. Aceite: somente o vértice escolhido muda; corte, rotação e demais pontos ficam intactos. Sem essa seleção explícita, as prioridades normais do corte continuam funcionando.

### 9. Rotação, prévia pura e composição da imagem

- Implementar cálculo puro da prévia com a fórmula documentada, em pixels
  originais, validando dimensões, números finitos e escala conforme o resultado.
- Oferecer rotação numérica e interação equivalente, com 0°, sinais e extremos
  válidos. Calcular sempre da origem, inclusive ao alternar original/simulado.
- Durante o gesto, card e quadro usam a mesma geometria transitória.
- Exibir o contorno transformado e uma camada da radiografia recortada pelo
  fragmento de origem, transformada pela mesma matriz. Reutilizar a prévia
  já carregada, alinhamento, brilho, contraste, inversão e espelhamento.
- Comparação original/simulado e contornos precisam permitir distinguir a
  camada movida da origem. Lacunas entre fragmentos não recebem preenchimento
  anatômico sintético. A imagem original e seus dados permanecem a fonte.
- A máscara e a matriz são apresentação local. Não gerar nova imagem clínica
  persistida, endpoint de recorte ou exportação nesta etapa.
- Carregamento/expiração da imagem segue o mecanismo existente. Falha da
  textura preserva contorno, valores e rascunho com feedback adequado.
- Distinguir estimativa local e resultado confirmado de forma breve, sem
  confundir `SIMULATED` com validação clínica.

**Aceite** — prévia e resultado oficial usam a mesma convenção. Os exemplos
analíticos da etapa 0 têm cobertura local executável. Alinhamento visual e
persistência no ambiente integrado continuam sujeitos ao aceite manual.

#### Entrega e revisão da etapa 9 — 18/11/2026

- `lib/tplo-preview.ts` calcula raio e matriz diretamente da origem em pixels
  originais, com dimensões retangulares, escala salva e proteção DICOM existentes.
  Valida números finitos, faixa inclusiva de −180° a +180° e fragmento concluído
  de 3–500 pontos. Zero é válido. Fragmento ausente/incompleto mantém a medida
  elegível separadamente da simulação. Não simplifica pontos nem limita a saída
  transformada à imagem; nenhuma transformação anterior vira entrada seguinte.
- `lib/tplo-rotation.ts` implementa alça própria, cálculo por `atan2` relativo ao
  pivô original e setas de 1°/Shift de 10°. Ponteiro é desespelhado antes do
  cálculo; teclas aumentam/diminuem o ângulo numérico original. A alça usa
  tamanho/distância de tela constantes e não reutiliza a semântica de ANGLE.
- `CaseImageTploRotationControls` oferece aplicação numérica explícita,
  aceitando vírgula decimal em pt-BR, alça e comparação Original/Simulado.
  O campo acompanha a rotação confirmada no quadro. Original permite editar a
  origem; Simulado não transforma alças do contorno em pontos de entrada.
  Alternar comparação e ativar rotação são somente apresentação.
- O canal próprio do `ViewerEditor` transporta rotação separada da geometria.
  Card, contorno transformado e textura usam o mesmo ângulo transitório;
  raio/diâmetro também acompanham a geometria transitória. A etapa 9 amplia o
  sinal de gesto da etapa 6 para carregar essa geometria, mantendo memoizada a
  validação dos objetos salvos. Soltar confirma apenas o rascunho local uma vez;
  Esc, perda de foco/captura e mudança de geração/contexto cancelam.
- `ViewerTploImageLayer` reutiliza a mesma URL existente, com um único `<image>`
  SVG referenciado por duas camadas. Recorta o fragmento na origem antes de
  aplicar a matriz; a base recebe máscara da região original. Ambas compartilham
  brilho/contraste/inversão e o contêiner de zoom/pan/espelhamento. As guias ficam
  fora do filtro. Lacunas revelam o fundo neutro do quadro, sem preenchimento
  anatômico. Só o UUID selecionado é composto; os demais objetos são preservados.
- A imagem HTML permanece acessível e visível durante carga/falha da textura.
  O contorno transformado e os valores continuam disponíveis com aviso breve.
  Repetir tenta a textura e usa a renovação da URL pelo GET já existente;
  falha desse GET conserva a imagem decodificada correspondente. Troca de URL
  exige novo carregamento e eventos antigos da textura são ignorados por dono.
  Erro da própria imagem base mantém o tratamento anterior. Não há canvas,
  blob, exportação, endpoint novo ou imagem clínica persistida.
- Workspace e painel de prévia distinguem resultado oficial validado de
  estimativa local (`≈`). Um editor limpo usa a matriz oficial; ausência ou erro
  oficial não recebe substituto local rotulado como salvo. Rascunho/gesto usa
  prévia pura e não altera revisão, escala, TPA ou parâmetros globais.
- A revisão manteve bloqueios de leitura, recibo, revisão, lock e outros
  rascunhos. Não habilitou tabela/parâmetros (etapa 10), confirmação/gravação
  pela nova UI (etapa 11), exclusão ou entrada pública (etapa 12).

**Verificações executadas** — 61 testes locais aprovados: os 47 anteriores e
14 novos, em cinco arquivos. Incluem resultados analíticos de 0°, ±90°, ±180°
em matriz retangular, pivô deslocado, saída da imagem, recalibração, degeneração,
limites, ausência de requisitos, não acumulação, ordem SVG e validação de matriz
oficial. DOM simulado cobre composição/máscara/filtros, fallback/repetição,
rotação espelhada, teclado/cancelamento/contexto, campo numérico, integração
card/quadro/rascunho e URL renovada. As suítes bloqueiam rede; não houve execução
do backend ou escrita remota. TypeScript aprovado; ESLint dos 16 arquivos sem
erros, com o aviso já existente de `<img>` agora no componente extraído.
JSON/paridade/placeholders pt-BR/en, UTF-8, links locais e whitespace conferidos.
Nenhuma credencial, `.env` ou arquivo do backend foi acessado/alterado.

#### Revisão complementar da etapa 9 — 18/11/2026

- Releitura da prévia pura, matriz/SVG, edição de origem, rotação, cancelamentos,
  fonte oficial/local e composição não encontrou divergência na fórmula nem
  item obrigatório da etapa sem implementação. Não foi necessário alterar o
  cálculo, o contrato, o transporte ou habilitar etapas seguintes.
- Dois defeitos foram reproduzidos em testes antes da correção. O campo de
  rotação podia manter erro de validação depois de um ângulo confirmado no
  quadro e restaurar texto antigo ao voltar ao ângulo anterior. O formulário
  agora reinicia texto/erro por ângulo confirmado; prévia transitória/cancelamento
  preservam a entrada ainda não aplicada. A sincronização conserva o foco do
  campo, sem remontar os controles durante a confirmação.
- Se a textura falhasse antes de a imagem HTML terminar de carregar, o `onLoad`
  da base apagava o sinal de recuperação. Uma falha posterior ao renovar a URL
  podia ocultar imagem/quadro. O estado de recuperação agora pertence à mesma
  imagem/URL e sobrevive à ordem desses eventos; só outro contexto inicia novo
  estado. Imagem em cache pode concluir antes dos efeitos passivos sem perder
  prontidão, e erro real da base continua com o tratamento existente.
- O estado de decodificação/falha e os callbacks de prévia também passaram a
  capturar cliente da query, caso, imagem, URL e elegibilidade. URL igual em
  outra imagem não herda prontidão. Callbacks antigos, imagem indisponível e
  desmontagem não modificam o contexto atual nem iniciam GET de renovação.
- Cinco regressões locais novas cobrem os dois defeitos, carregamento imediato,
  troca de imagem/URL/elegibilidade/desmontagem e cancelamento da alça por
  pointer-cancel, perda de captura, Esc, blur, geração e modo somente leitura.
  A suíte passou de 61 para **66 testes aprovados**, com rede bloqueada.
  TypeScript, lint dos 16 arquivos (sem erros; mesmo aviso de `<img>`), JSON,
  paridade/placeholders, UTF-8, whitespace e links locais foram conferidos.
  Backend, `.env` e credenciais permaneceram intocados. Aceite visual/clínico e
  persistência real continuam pendentes para a etapa 13.

**Testes manuais da etapa 9 — executar após todas as etapas**

- [ ] E9-01 — Usar radiografia retangular, 0°, ±90°, ±180°, rotação repetida, espelhamento, zoom/pan/fullscreen e toque. Aceite: pivô e sentido seguem a matriz original, card/quadro coincidem, guias permanecem legíveis e não há deriva acumulada.
- [ ] E9-02 — Alternar Original/Simulado com 3 e 500 pontos, saída da imagem e filtros. Aceite: textura acompanha exatamente o contorno transformado, região original sai da base, lacunas ficam neutras e origem/demais objetos permanecem intactos.
- [ ] E9-03 — Cancelar gestos, trocar contexto e provocar falha/expiração da textura/URL. Aceite: gesto antigo não confirma; contorno, valores e rascunho sobrevivem à falha de textura, renovação recupera a imagem e a UI funciona em tela estreita/teclado/leitor de tela.
- [ ] E9-04 — Salvar/reabrir e recalibrar pelo fluxo completo. Aceite: prévia local nunca aparece como resultado oficial/validação clínica, origem não é substituída pela saída transformada e o resultado do backend corresponde ao ângulo informado.
- [ ] E9-05 — Informar rotação inválida, ajustar/cancelar no quadro, voltar ao ângulo anterior e trocar rapidamente de imagem durante carregamento/falha. Aceite: confirmar elimina texto/erro obsoletos, cancelar mantém a entrada pendente, cada imagem exige sua própria prontidão e a falha do recorte não apaga a base já carregada.

### 10. Parâmetros e consulta de correção TPLO

- Conectar os parâmetros restritos definidos na etapa 0 ao writer existente,
  com confirmação explícita e proteção contra edição concorrente.
- Expor apenas entradas necessárias à tabela. Preservar qualidade, elegibilidade,
  auditoria e processos internos. Não criar painel manual de aprovação radiográfica.
- Usar TPA oficial e diâmetro informado na query. Vincular resposta à revisão,
  parâmetros e contexto capturados, descartando callbacks desatualizados.
- Reutilizar query keys e BFFs de tabela/protocolo. Manter a consulta autenticada
  nos mecanismos atuais, sem leitura de credenciais ou configuração de ambiente.
- Mostrar `rotation_mm` e os estados da correção oficial em detalhes compactos.
  Consulta da tabela, prévia de parâmetros e correção persistida têm origem clara.
- Nenhuma correspondência ou tabela indisponível gera preenchimento automático
  de `rotation_degrees`. Nenhuma mudança em parâmetros globais rotaciona objetos.
- Tratar vários TPLOs sem eleger um primário implícito. O parâmetro único do
  plano pode diferir do raio de um objeto e deve ser identificável na interface.

**Aceite** — simulação utilizável com tabela/protocolo não configurados e
correção apresentada fielmente ao que o backend retorna.

#### Entrega e revisão da etapa 10 — 18/11/2026

- `lib/tplo-parameters.ts` projeta somente os cinco campos autorizados da etapa
  0, respeitando omissão versus nulo. O formulário exige lateralidade explícita
  na criação e não usa espelhamento como lado clínico. Inclinações aceitam 0° e
  90°; lâmina deve ser maior que zero e até 100 mm. Não há alvo clínico padrão,
  cópia automática do TPA ou sincronização entre corte e lâmina da tabela.
- `CaseImageTploParameters` é um card próprio, no padrão escuro e com ajuda
  universal. Entrada incompleta/inválida fica em `parameterFields` no rascunho
  interno e protege a navegação; não forma comando. `tploCommandFromDraft`
  projeta apenas o patch estrito, sem texto, seleção ou outros dados da UI.
  Edição por campo não dispara gravação. Limpar uma entrada numérica existente
  gera nulo; deixar ausente uma entrada já vazia conserva a ausência.
- Acesso por **Parâmetros do plano** nos cards TPLO fecha somente um editor
  geométrico limpo. Rascunho geométrico pendente precisa ser resolvido antes.
  O formulário não duplica controles do corte. Parâmetros e geometria continuam
  intenções exclusivas por imagem, com revisão, geração, cliente e recibo comuns.
- **Salvar parâmetros** usa `useTploParameterSaveActions` e `useImageTplo.submit`
  sobre o writer existente. O navegador envia o PATCH restrito; o BFF mantém
  seu único PUT. A confirmação limpa só o rascunho correspondente e adota o
  plano confirmado. Conflito conserva a intenção; resposta perdida usa GET,
  sem repetição automática de escrita. A recuperação compartilhada permanece
  acessível. Recusa clínica/estado do plano é informada sem alterar auditoria,
  qualidade, elegibilidade, revisão ou flags para contornar a recusa.
- Falha de leitura bloqueia edição/envio e oferece atualizar o plano conservando
  os campos digitados. Revisão antiga conserva o rascunho, bloqueia envio e
  exige resolução explícita. Parâmetros continuam dispensando preflights de
  escala/geometria conforme o comando já implementado.
- `useTploTableConsultation` reutiliza as query keys, serviços e BFFs de tabela
  e protocolo, com GET sob ação explícita. Usa TPA oficial conferido (inclusive
  0°/90°) e lâmina informada nos parâmetros, conservando a precisão original no
  filtro e em sua identificação na UI. Não usa inclinação atual como TPA nem
  diâmetro da osteotomia selecionada como lâmina implícita.
- Resultado de consulta é vinculado ao cliente, caso/imagem, revisão,
  parâmetros/campos, geração e snapshots das queries/plano/rascunho. Troca de
  contexto ou alterações rejeitam callbacks/respostas antigas e removem sua
  apresentação. Repetições da mesma consulta em curso são deduplicadas.
- `CaseImageTploReference` usa detalhes compactos para consulta, correção salva
  e protocolo. Distingue prévia de parâmetros não salvos, ausência de tabela,
  nenhum match exato, ambiguidade/resposta incoerente, falha de serviço, acesso
  negado e sessão/contexto indisponível. Mostra versão, fonte, checksum e alvo
  quando fornecidos. Alvo informado diferente do alvo consultado gera aviso.
  Protocolo/tabela não configurados não condicionam a simulação geométrica.
- `lib/tplo-correction.ts` lê os estados oficiais e `rotation_mm` de
  `document.tplo_correction`, identificado pela revisão salva. Confere a
  coerência das entradas de um resultado calculado e não substitui o resultado
  por uma consulta local. A consulta só mostra deslocamento numérico quando
  filtros, contagem e linha retornada coincidem exatamente; não arredonda para
  outra linha, interpola ou converte mm em `rotation_degrees`. Valores abertos
  de uma entrada que não possam ser conferidos não viram resultado numérico.
- A correção continua única por imagem, sem UUID primário inferido, mesmo com
  vários TPLOs. Parâmetros não rotacionam objetos. Labels deixam claro que a
  consulta é informativa e a correção não representa validação clínica.
- O contrato fixado e os artefatos locais tipados foram a referência desta
  etapa. A tentativa de releitura pública da fonte fixada ficou indisponível;
  não foi declarada nova revalidação remota ou observação autenticada da
  configuração. Nenhum arquivo do backend, credencial ou `.env` foi acessado
  ou alterado. Não houve gravação remota nem execução do backend.
- Confirmação/reabertura da geometria, exclusão, entrada pública, revisão
  clínica, implantes e relatórios permanecem nas respectivas etapas seguintes.

**Verificações executadas** — **84 testes locais aprovados** em sete arquivos:
os 66 anteriores, 13 novos de parâmetros/consulta/integração e cinco testes já
existentes dos serviços/BFFs/cache de referência. Testes novos exercitam campos
estritos, omissão/nulo, limites, texto inválido, TPA oficial e filtros exatos,
todos os estados da correção, writer sem calibração, confirmação, conflito e
resposta perdida; DOM simulado cobre formulário/workspace, consulta explícita,
deduplicação, respostas tardias, revisão/imagem, ausência de tabela e sessão.
Transportes são sintetizados localmente e o DOM bloqueia rede real. TypeScript,
lint dos 12 arquivos (zero erros/avisos), JSON/paridade/placeholders pt-BR/en,
UTF-8, whitespace e links locais conferidos. Aceite visual, clínico e integrado
permanece pendente; testes locais não aprovam configuração/resultado clínico.

#### Revisão complementar da etapa 10 — 18/11/2026

- Três casos foram reproduzidos em regressões antes da correção. Um callback
  de consulta ainda podia iniciar GET com filtros antigos quando o cache mudava
  antes da notificação/renderização do React. `canReadReferences` agora reutiliza
  as proteções vivas do editor: snapshot/identidade das queries, revisão,
  prontidão, exclusão, recibo, outras intenções e leitura em andamento. Tabela e
  protocolo verificam essas condições no instante da ação; a resposta da tabela
  também precisa conservar esse vínculo. As identidades das queries de referência
  e mudanças de acesso entram no escopo da consulta, evitando prévia obsoleta ou
  indicador de carregamento preso após mudança de contexto.
- `configured=false` com eco opcional de filtros vazio era apresentado como
  resposta inválida. A ausência de configuração agora tem prioridade sobre a
  conferência de match. Em tabela configurada, filtros/contagem/linha continuam
  exigindo correspondência exata, sem arredondamento ou substitutos.
- A captura de erro inesperado de uma gravação podia emitir aviso depois de
  mudar a geração do editor na mesma imagem. A captura agora verifica a geração
  assim como o caminho de sucesso. Confirmação/foco/aviso só pertencem à edição
  correspondente; duplo clique continua produzindo uma única solicitação.
- Quatro testes novos cobrem esses casos, incluindo alterações do cache de
  parâmetros/exclusão/recibo/fetch antes da próxima renderização, ambos os
  callbacks de referência e confirmação atual sem duplicação. A suíte completa
  passou de 84 para **88 testes locais aprovados** em sete arquivos. TypeScript,
  lint dos 12 arquivos sem erros/avisos, traduções, UTF-8, links e whitespace
  conferidos. O aceite real E10-01–05 permanece pendente para a etapa 13.
- Uma falha da ferramenta durante a edição dos testes exigiu restaurar a suíte
  de interação pelo histórico desta conversa. Os 38 testes existentes foram
  recuperados e comparados integralmente com a fonte anterior; os 84 testes
  anteriores passaram novamente antes das novas regressões. Nenhuma alteração
  acumulada foi descartada. Não houve acesso/alteração de backend ou `.env`,
  execução remota ou habilitação da etapa 11.

**Testes manuais da etapa 10 — executar após todas as etapas**

- [ ] E10-01 — Criar parâmetros, escolher lateralidade, usar vírgula/0°/90°/100 mm, limpar campos, cancelar e salvar/reabrir. Aceite: somente entradas autorizadas mudam; vazio/nulo seguem o contrato; não há lado/alvo/TPA preenchido automaticamente; qualidade, auditoria e geometrias ficam intactas.
- [ ] E10-02 — Consultar com TPA oficial fracionário e lâmina global diferente do corte, inclusive com vários TPLOs. Aceite: filtros não arredondam, consulta e correção salva têm origens/versões identificáveis, troca de seleção não sincroniza lâmina/raio e mm não altera ângulo geométrico.
- [ ] E10-03 — Observar tabela/protocolo não configurados, nenhum match, match exato, alvo divergente e sessão/serviço indisponível no ambiente real. Aceite: estados ficam distintos, sem recomendação inventada, e simulação independente continua utilizável.
- [ ] E10-04 — Provocar revisão concorrente, leitura falha, resposta perdida e troca de imagem/organização durante consulta/gravação. Aceite: intenção é preservada, callbacks antigos não atualizam o novo contexto, conferência usa GET sem repetir PUT e recusa clínica não é contornada. Conferir foco, tooltips e formulário em tela estreita/leitor de tela.
- [ ] E10-05 — Sob latência, alterar parâmetros/iniciar outra operação enquanto consultas respondem e observar tabela não configurada. Aceite: consulta/aviso antigo não aparece na nova edição, não há carregamento preso, duplo clique não duplica gravação e ausência de configuração permanece distinguível de resposta inválida.

### 11. Card, confirmação e reabertura

- Conectar o card de propriedades, valores, ajustes, detalhes e comparação.
- Salvar/Atualizar envia somente o comando completo correspondente e adota a
  resposta confirmada. Evitar envio duplicado e gravação por movimento.
- Oferecer salvar geometria com `fragment=null` antes de iniciar o contorno
  ou depois de descartá-lo explicitamente. Contorno parcial fica no rascunho
  até concluir ou cancelar, sem ser substituído por nulo na gravação.
- Após salvar, manter seleção/contexto e reabrir editor limpo conforme o padrão.
  Cancelar alterações restaura o salvo sem fechar indevidamente a ferramenta.
- Integrar mensagens e notificações pelo wrapper universal do projeto.
- Refletir recusa clínica, bloqueio ou finalização sem remover revisão/auditoria
  ou reescrever o estado clínico para forçar a operação.

**Aceite** — confirmação reconhecida, editor limpo correspondente e resultado
oficial apresentados, com recuperação disponível nas falhas pertinentes.

**Entrega da etapa 11 — 18/11/2026**

- `CaseImageTploValues` concentra diâmetro e rotação, com indicação de estimativa
  local ou resultado oficial, detalhes recolhidos de raio/revisão e motivo de
  simulação indisponível. O card mantém identificação do objeto, ajustes de
  corte/fragmento/rotação, comparação e referência global. O valor da rotação
  não é duplicado. Ausência de resultado oficial não vira estimativa de um
  editor limpo nem validação clínica.
- `CaseImageTploActions` reutiliza `ViewerEditActions` e os tooltips universais.
  Salvar/Atualizar são explícitos, bloqueados durante gesto transitório,
  leitura inválida, revisão antiga, bloqueio ou contorno parcial. O comando
  estrito conserva UUID e pontos originais; não envia matriz, resultados ou
  campos clínicos. `fragment=null` é permitido antes do desenho ou depois de
  remoção explícita, sem converter contorno incompleto em nulo.
- `useTploGeometrySaveActions` integra confirmação e conferência ao writer e
  à recuperação existentes. Duplo clique não duplica envio. Resposta incerta
  usa GET sem repetir PATCH/PUT; conflito/recusa preserva a intenção e oferece
  descarte explícito. Avisos usam `@/lib/notifications`. A resposta confirmada
  precisa corresponder ao comando, à revisão e ao recibo atuais.
- O workspace aguarda a liberação do writer e a atualização dos observadores
  para reabrir um `tplo-update` limpo na revisão confirmada. Seleção e comparação
  permanecem no mesmo contexto. A passagem para o novo editor confere cliente,
  caso, imagem, identidades das queries, seleção e ausência de intenção mais
  recente; uma resposta tardia não substitui outro rascunho.
- Cancelar atualização restaura a geometria salva na revisão atual, em Original,
  mantendo a ferramenta aberta. Descartar criação volta à lista/estado vazio sem
  criar objeto. Se o servidor bloquear o objeto, ele permanece selecionado em
  leitura; finalização não força reabertura para edição. Metadados, auditoria,
  revisão clínica e demais objetos continuam sob as regras do writer/BFF.
- Arquivos: novos `case-image-tplo-values.tsx`, `case-image-tplo-actions.tsx`,
  `use-tplo-geometry-save-actions.ts` e `test/tplo-confirmation.test.mjs`;
  integração em `case-image-workspace.tsx`, `use-image-tplo.ts`,
  `case-image-tplo-cut-controls.tsx`, `case-image-tplo-rotation-controls.tsx`,
  `case-image-tplo-recovery.tsx` e traduções pt-BR/en. README e roadmap atualizados.
- Onze testes novos usam workspace/hooks/writer/serviço reais com transporte
  exclusivamente sintético local: criação sem contorno, atualização explícita,
  contorno parcial/nulo, cancelamento, resposta perdida, conferência GET,
  conflito, recusa clínica, troca de imagem/cliente, intenção mais recente,
  objeto bloqueado e caso finalizado. A suíte consolidada tem **99 testes em
  oito arquivos**. TypeScript, lint dos nove arquivos sem erros/avisos,
  traduções, UTF-8, links locais e whitespace conferidos.
- Na revisão, o motivo da simulação indisponível foi preservado nos detalhes
  compactos ao retirar o valor duplicado de rotação. O cenário de conflito
  também confere restauração na revisão nova observada pelo GET, sem rebase
  automático da intenção recusada. A entrada pública e a exclusão continuam
  desabilitadas até a etapa 12. Sem acesso/alteração de backend ou `.env`,
  chamadas remotas ou aceite visual/clínico declarado.

**Testes manuais da etapa 11 — executar após todas as etapas**

- [ ] E11-01 — Criar corte sem contorno, salvar, reabrir/recarregar e completar o fragmento. Aceite: envio único, UUID estável, resultado oficial identificado e editor limpo; ausência de contorno permite geometria salva sem apresentar simulação inexistente.
- [ ] E11-02 — Ajustar corte, vértices e rotação; salvar/atualizar e cancelar. Aceite: nenhuma escrita por movimento, pontos originais preservados, seleção/comparação mantidas após confirmação e cancelamento restaura o salvo sem fechar a ferramenta. Contorno parcial bloqueia envio; remoção explícita permite nulo.
- [ ] E11-03 — Provocar conflito, recusa clínica, resposta perdida e troca de imagem/organização sob latência. Aceite: recuperação mantém intenção, confirmação usa GET sem repetir escrita, descarte é explícito e resposta antiga não substitui outro editor; bloqueio/finalização não é contornado.
- [ ] E11-04 — Conferir card em tela estreita/fullscreen, foco, teclado e tooltips pt-BR/en. Aceite: nome/valores legíveis, detalhes recolhidos, ações acessíveis, sem duplicação de rotação ou aparência de aprovação clínica.

### 12. Exclusão e habilitação da entrada

- Excluir apenas o UUID selecionado com confirmação minimalista universal.
- Respeitar lock, revisão e recibo pendente. Preservar intenção se a resposta
  for incerta e usar GET de conferência.
- Preservar landmarks, calibração, demais objetos e metadados globais ao excluir.
  A ausência de vínculo global não autoriza limpar lâmina/alvo automaticamente.
- Manter Simulação TPLO aberta, escolher um objeto restante ou estado vazio
  com ação de criar. A exclusão não oculta todas as marcações da ferramenta.
- Habilitar a entrada com bloqueios reais de leitura, escala, prontidão,
  contexto e rascunho. Rever responsividade, foco, teclado e tooltips pt-BR/en.
- Atualizar README da feature com o fluxo efetivamente entregue.

**Aceite** — criar → salvar → reabrir → editar/cancelar → excluir disponíveis
pela entrada normal, sem habilitar revisão clínica, implantes ou relatórios.

**Entrega da etapa 12 — 19/11/2026**

- `CaseImageToolsPanel` habilita **Simulação TPLO** em Planejamento, mantendo
  TPA separado. O workspace usa `useImageTplo.open` para retomar rascunho,
  reabrir salvo ou iniciar centro/borda. **Nova osteotomia** cria UUID próprio
  somente por ação explícita e respeita escala, política DICOM, dimensões,
  prontidão, revisão, limite de objetos, recibo e outras intenções. Não consulta
  tabela automaticamente nem cria geometria a partir de calibração ou TPA.
- Salvos podem ser selecionados em leitura quando a geometria não está editável.
  A entrada mantém listagem/estado vazio após exclusão. Trocar entre um TPLO
  limpo e Distância fecha apenas o editor limpo, preservando a linha salva e
  a calibração; alterações pendentes continuam protegidas pelo fluxo existente.
- `useTploDeletion` captura UUID, revisão, snapshot do editor e identidades de
  cliente/caso/imagem/queries. `useImageTplo.confirmDelete` revalida o estado
  vivo antes de substituir somente a intenção correspondente pelo comando
  estrito `tplo-delete`. Não exige escala/dimensões para exclusão, mas exige
  leitura válida, objeto selecionado e desbloqueado, UUIDs únicos e revisão atual.
- `CaseImageTploDeleteDialog` reutiliza o modal minimalista universal, incluindo
  ícone cinza, descrição curta, botões pill, foco e portal em fullscreen.
  Cancelar preserva exatamente o rascunho anterior; havendo ajustes locais, o
  descarte junto da exclusão é avisado. Editor/seleção/controles e troca de
  ferramenta ficam bloqueados enquanto a confirmação está aberta.
- `useTploGeometrySaveActions` também trata exclusão pelo mesmo writer/serviço.
  Confirmação canônica do comando evita depender da ordem das propriedades.
  Cliques repetidos enviam uma vez; resposta perdida usa GET; incerteza mantém
  o modal com conferência GET sem replay. Conflito/recusa conserva intenção e
  oferece descarte explícito/carregar salvo. Uma revisão posterior já sem o
  UUID pode encerrar a intenção sem enviar nova exclusão.
- Após confirmação, o workspace aguarda o desbloqueio do writer e seleciona
  um TPLO restante visível ou apresenta estado vazio com Nova osteotomia.
  O restante das marcações não desaparece. Landmarks, calibração, outros objetos,
  lâmina/alvo globais, qualidade, elegibilidade e auditoria não são limpos para
  viabilizar a operação. Não há TPLO primário implícito ou vínculo novo entre
  corte e metadados globais. Recusas clínicas/finalização continuam soberanas.
- A revisão corrigiu a comparação de recibo com ordem diferente dos campos e
  separou operação em andamento de bloqueio por resposta incerta: a incerteza
  não mantém spinner infinito nem bloqueia seu GET de conferência. O estado
  reativo de processamento impede habilitar outra ação antes do término local.
- Novos arquivos: `hooks/use-tplo-deletion.ts`,
  `components/case-image-tplo-delete-dialog.tsx` e
  `components/case-image-tplo-menu-actions.tsx`. Integrações em
  `use-image-tplo.ts`, `use-tplo-geometry-save-actions.ts`, workspace,
  catálogo, cards salvo/corte, `viewer-tool-action.tsx` e
  `viewer-measurement-delete-dialog.tsx`; traduções pt-BR/en, README e roadmap.
- Dezesseis testes locais novos em `test/tplo-confirmation.test.mjs` exercitam
  entrada pública, criação/posicionamento, cancelamento/foco, múltiplos objetos,
  preservação de metadados/landmarks, exclusão do último, perda de resposta,
  incerteza e GET, conflito/recusa, escala/dimensões ausentes, lock, leitura
  falha, alteração de revisão/rascunho, resposta tardia, ausência já observada
  e alternância TPLO/Distância. Workspace/hooks/writer/serviço reais usam
  transporte exclusivamente sintético, sem rede. Total consolidado: **115 testes
  locais em oito arquivos**, com TypeScript, lint dos 12 arquivos sem
  erros/avisos, traduções/placeholder, UTF-8, links e whitespace conferidos.
- O fluxo está habilitado para o aceite integrado da etapa 13. Não houve
  acesso/alteração no backend ou `.env`, execução remota, habilitação de revisão
  clínica, implantes, finalização ou relatórios. Não foi declarado aceite visual,
  de dispositivo ou clínico a partir do DOM simulado.

**Revisão complementar da etapa 12 — 19/11/2026**

- Releitura do plano, entrada pública, seleção, confirmação, cancelamento,
  recuperação, passagem para o objeto restante e proteções de cache/contexto.
  Não foi necessário alterar comandos, transporte, BFF ou regras do backend.
- O modal identificava uma repetição de leitura como “Excluindo osteotomia…”.
  `useTploDeletion` agora distingue processamento de leitura e escrita: o GET
  pendente usa “Verificando salvamento…”, permanece bloqueado durante a leitura
  e exige nova confirmação explícita antes de enviar exclusão. Conferência de
  uma escrita incerta continua sendo somente GET, sem replay.
- Quatro regressões novas confirmam a identificação do GET pendente, um objeto
  bloqueado no cache antes da próxima renderização, finalização antes da
  confirmação sem descarte/gravação, e Esc com preservação do editor e retorno
  ao botão de exclusão. A suíte consolidada passou a **119 testes locais
  aprovados em oito arquivos**. TypeScript, lint sem erros/avisos, traduções,
  UTF-8, links e whitespace novamente conferidos.
- E12-01–05 e o novo E12-06 continuam pendentes nas partes reais/visuais. Sem
  acesso/alteração de backend ou `.env`, chamadas remotas ou avanço da etapa 13.

**Ajustes de UX do painel TPLO — 19/11/2026**

- O posicionamento inicial mostra apenas o ponto atual, orientação curta e
  descarte. Posicionar ponto aparece para retomar a marcação ao sair desse modo;
  confirmação, Nova osteotomia, rotação e referência clínica não ocupam essa fase.
- Centro/borda e diâmetro estão agrupados em Ajustar. Instruções, origem dos
  valores e significado do diâmetro usam `CasePanelHelp`, com os mesmos tooltips
  universais dos demais menus. Estimativas mantêm `≈`; falhas e conflitos não
  são ocultados. Raio/revisão continuam nos detalhes recolhidos da medida.
- Parâmetros, tabela, correção salva e protocolo ficam em Referência clínica,
  recolhida por padrão após definir o corte. Durante desenho do fragmento, o
  painel permanece focado nessa tarefa. Sem fragmento, rotação/comparação ficam
  recolhidas; o ângulo numérico continua acessível e não exige contorno.
- O diâmetro é exibido com até duas casas decimais sem arredondar os pontos ou
  o comando. Aplicar diâmetro só fica disponível depois de editar o campo,
  evitando que a simples apresentação reduzida altere a precisão armazenada.
  Nova osteotomia continua disponível após confirmação/editor limpo.
- Dois testes adicionais cobrem progressão da interface, acesso à rotação
  recolhida e preservação exata da geometria ao salvar outro ajuste com o
  diâmetro visualmente arredondado. O cenário de parâmetros abre a referência
  recolhida pelo mesmo controle da UI. Total consolidado: **121 testes locais
  aprovados**, TypeScript, lint dos seis arquivos sem erros/avisos, traduções,
  UTF-8, links e whitespace conferidos. E12-07 registra o aceite visual real.
- Apenas apresentação/entrada numérica local: sem mudança de contrato,
  fórmulas, writer, backend ou `.env`, sem escrita remota ou autosave.

**Padronização estrutural do menu TPLO — 19/11/2026**

- Reestudados `CaseImageDistanceToolbar`, `CaseImageAngleToolbar`, os controles
  de TPA, `ViewerMeasurementCard`, `ViewerMeasurementSection`, as linhas de
  valores e a barra flutuante de confirmação existente.
- `CaseImageTploCutControls` agora utiliza `ViewerMeasurementCard`, com slots
  opcionais de ajuda/cabeçalho que preservam o comportamento dos consumidores
  existentes. O TPLO deixa de reconstruir o cabeçalho e o corpo do card.
  `CaseImageTploValues` fornece somente o conteúdo dos valores, evitando o
  wrapper que removia a divisória inferior da seção pelo seletor `last`.
- Valores usam linhas alinhadas e a ênfase do padrão de medidas. Ajustar usa
  escolhas Centro/Borda centralizadas; Diâmetro tem seção própria, com unidade
  no rótulo e campo/confirmar na mesma linha. Fragmento e Rotação mantêm
  divisórias consistentes, sem bordas duplicadas nos detalhes recolhidos.
- No posicionamento inicial, o passo é o rótulo da seção, o ponto atual é uma
  ação de marcação e o descarte fica no rodapé padrão. Instruções completas
  permanecem nos tooltips universais, sem parágrafos soltos no corpo.
- Salvar/cancelar usam `contextControls` do visualizador, ancorados na borda do
  corte, como nas outras medidas. Não ocupam mais o rodapé do menu; o editor
  limpo não mostra confirmação sem alterações. Gesto ativo, contorno parcial,
  revisão antiga, modal de exclusão e recuperação continuam respeitados.
- Os testes existentes foram ajustados à ausência de confirmação no editor
  limpo e verificam que salvar está fora do card. Total mantido em **121 testes
  locais aprovados** em oito arquivos, com TypeScript, lint dos sete arquivos
  sem erros/avisos, traduções, links, UTF-8 e whitespace conferidos.
- A inspeção por Computer Use não pôde acessar o Chrome: a ferramenta retornou
  falta de autorização. Nenhuma ação no navegador ou gravação real foi feita.
  O aceite visual no aplicativo real segue pendente em E12-07/08. Backend,
  `.env`, contratos, fórmulas e writer não foram alterados.

**Cabeçalho e alinhamento da rotação — 19/11/2026**

- O descarte do posicionamento inicial usa `ViewerToolAction` no cabeçalho,
  com X vermelho, nome acessível e tooltip universais. A linha de descarte no
  rodapé foi removida. É a mesma ação local anterior, sem exclusão no backend;
  objetos salvos continuam usando a lixeira e seu modal de confirmação.
- Rotação usa o mesmo padding lateral/vertical e estilo de rótulo dos campos
  Ajustar/Diâmetro, com unidade em graus. O campo e seu botão de aplicar ficam
  na mesma linha. Comparação tem seção/divisória própria, fora do padding
  interno da rotação, evitando recuo duplicado; as duas opções são centralizadas.
- Referência clínica foi esclarecida como agrupamento de UI para parâmetros
  globais da imagem, consulta da tabela, correção oficial salva e protocolo do
  ambiente. Não é uma etapa necessária para desenho do corte/fragmento e
  rotação manual. A tabela retorna referência em mm e não aplica graus no corte.
  A área permanece recolhida nesta rodada; nenhum dado/endpoint foi removido
  ou transformado em aprovação clínica.
- TypeScript, lint dos dois componentes, traduções/placeholder, UTF-8, links
  e whitespace conferidos. Os 121 testes locais existentes passaram novamente;
  não foram acrescentados testes que apenas reproduzem estilos. E12-09 guarda
  a verificação visual/foco. Sem backend, `.env` ou escrita remota.

**Simplificação do menu e confirmação pelo Sonner — 19/11/2026**

- O cabeçalho do posicionamento inicial usa lixeira vermelha no lugar do X,
  mantendo descarte local, tooltip e nome acessível. Excluir um objeto salvo
  continua exigindo seu modal de confirmação.
- Referência clínica saiu do menu de osteotomia, inclusive do estado salvo.
  O workspace deixou de montar as consultas de tabela/protocolo e a entrada
  pública de parâmetros por essa área. Serviços, schemas, dados do plano e
  testes dessas funções permanecem preservados para uma localização futura.
  Rascunhos de parâmetros já existentes continuam retomáveis e protegidos.
- Rotação e Comparação compartilham o mesmo bloco, sem divisória intermediária.
  Detalhes da medida saiu do corpo do card: raio redundante e revisão deixam
  de ocupar o painel. Ajuda universal de Medidas reúne a explicação, eventual
  motivo da simulação indisponível e a distinção de validação clínica. Falhas
  de leitura/medida continuam visíveis; prévia e resultado oficial são distintos.
- Durante uma gravação normal, o menu e a prévia local permanecem visíveis,
  com edição/envio bloqueados. O card de salvamento não substitui o editor;
  a conclusão confirmada emite somente uma notificação universal Sonner,
  sem toast de carregamento. Recibos interrompidos, incerteza, conflito e
  erro mantêm recuperação explícita; conferência continua sendo GET, sem
  repetição automática da escrita. Nenhum contrato/cálculo foi alterado.
- Verificação: **122 testes locais em oito arquivos**, TypeScript, lint,
  traduções/placeholder, UTF-8, links e whitespace aprovados. A nova regressão
  usa transporte local sob latência e verifica menu estável, campos bloqueados,
  fonte local durante envio, retorno oficial e Sonner único após confirmação.
  Testes de conflito, resposta perdida e retomada de parâmetros passaram.
  Sem chamadas remotas, backend, `.env` ou aceite visual/clinicamente integrado.

**Padronização do desenho do fragmento — 19/11/2026**

- `case-image-tplo-fragment-drawing.tsx` apresenta um card compartilhado
  `ViewerMeasurementCard` focado no contorno em edição. Medidas do corte,
  diâmetro, rotação e opções de vértices só reaparecem após concluir/cancelar.
  Contador de pontos e desfazer por ícone ficam alinhados; instruções e
  atalhos usam a ajuda universal junto ao rótulo Fragmento. O limite de 500
  pontos continua visível quando atingido.
- A lixeira vermelha do cabeçalho descarta apenas o contorno em edição e
  restaura o anterior, preservando corte/rotação. O tooltip e nome acessível
  identificam essa ação; ela não exclui a osteotomia salva.
- Concluir/cancelar o contorno usam `ViewerEditActions` fora do menu, junto ao
  último vértice (ou à borda do corte antes do primeiro ponto). A conclusão
  exige 3–500 pontos, permanece local e não salva a osteotomia. O tooltip
  esclarece a confirmação posterior. Durante contorno parcial, o comando de
  salvar geometria não aparece; estados de revisão antiga/falha de leitura
  preservam aviso, releitura e descarte da intenção pelo fluxo existente.
- O componente de fragmento concluído mantém seleção/inserção/remoção de
  vértices, refazer e remover contorno, com lixeira para a remoção. Não houve
  alterações de geometria, writer, schema ou backend.
- Checagens desta rodada: **75 testes locais de interação/confirmação** em
  dois arquivos, TypeScript, lint sem erros/avisos, 28 JSONs, 1.437 chaves
  pt-BR/en com placeholders correspondentes, UTF-8, links e whitespace.
  As regressões verificam conclusão explícita, limites, bloqueio de edição,
  desfazer pelo ícone, restauração pela lixeira e ausência de escrita remota.
  A suíte consolidada segue com 122 testes; aceite manual segue pendente.

**Folga das ações flutuantes durante o contorno — 19/11/2026**

- A posição anterior seguia somente o último vértice com deslocamento de
  24 px, podendo cobrir outro ponto ou o próximo trecho do contorno. O canal
  de ações agora aceita `avoidPoints`; o desenho do fragmento informa todos
  os vértices, ou a borda do corte antes de marcar o primeiro.
- `viewer-context-placement.ts` calcula a posição fora dos limites do contorno
  com margem de 48 px na tela e tenta direita, esquerda, abaixo e acima,
  respeitando os limites do visualizador. Zoom, pan e espelhamento são aplicados
  aos pontos antes de posicionar a barra; botões e margem não escalam.
  Se o contorno ampliado preencher a tela inteira, a barra permanece alcançável
  na posição com menor sobreposição. Os outros menus preservam seu deslocamento.
- Três regressões novas verificam o comportamento anterior dos outros menus,
  folga do contorno inteiro, troca de lado, contenção e integração com zoom e
  espelhamento. **83 testes locais de visualizador/TPLO passaram**, assim como TypeScript;
  lint, traduções/placeholder, UTF-8, links e whitespace foram conferidos.
  A suíte consolidada passa a 125 testes. As verificações foram executadas
  separadamente após falta de memória; o TypeScript concluiu com limite de
  heap de 1 GiB e geração jovem de 2 MiB, sem mudar a configuração do projeto.
  Sem backend, `.env`, chamadas remotas ou aceite visual integrado.

**Lista compacta de osteotomias salvas — 19/11/2026**

- `CaseImageTploSaved` mostra até dois blocos verticais por padrão. A seta
  de expandir/recolher aparece apenas com mais de duas osteotomias visíveis;
  objetos ocultos não contam no limite. Ao recolher, uma seleção que estava
  além dos dois primeiros permanece visível junto ao primeiro item, sem
  reordenar ou alterar os objetos no plano.
- Os blocos usam tipografia, espaçamento, bordas e cores do menu atual,
  com nome, Diâmetro e Rotação alinhados. Diâmetro é a apresentação de duas
  vezes o raio oficial já validado, como no editor; não muda o contrato.
  Origem do resultado, estado da simulação, bloqueio e limite de validação
  clínica ficam na ajuda universal “?”. Avisos de leitura/medida indisponível
  e rascunhos continuam visíveis; resultados antigos não viram resultados oficiais.
- Selecionar segue o fluxo existente, com realce/foco acessíveis e bloqueios
  preservados; Nova osteotomia e recuperação de leitura permanecem disponíveis
  conforme as permissões. Expandir/recolher não gera comandos ou gravações.
- Uma regressão nova verifica dois blocos, expansão/recolhimento, filtragem de
  ocultos, permanência da seleção, bloqueio e estado vazio. A suíte consolidada
  passa a 126 testes. Nesta rodada, 43 testes DOM, TypeScript e whitespace
  passaram. Lint e validações finais de traduções/UTF-8/links ficaram pendentes:
  o ambiente esgotou o disco (erro 112), impedindo iniciar shell e Node REPL.
  Aceite visual pendente; sem backend, `.env` ou chamadas remotas.

**Testes manuais da etapa 12 — executar junto da etapa 13**

- [ ] E12-01 — Entrar por Ferramentas → Simulação TPLO, criar, salvar, reabrir/recarregar e usar Nova osteotomia. Aceite: UUIDs independentes, sem criação/gravação automática; rascunhos retomados, valores oficiais identificados e alternância com Distância preserva calibração/linha salva.
- [ ] E12-02 — Selecionar entre vários TPLOs e cancelar/confirmar exclusão, inclusive do último. Aceite: somente o UUID confirmado é removido, rascunho sobrevive ao cancelamento, demais marcações/landmarks/metadados ficam intactos e ferramenta permanece aberta com seleção restante ou criação disponível.
- [ ] E12-03 — Provocar resposta perdida, incerteza, 409/recusa clínica e troca de imagem/organização sob latência. Aceite: envio único, GET sem repetir escrita, intenção preservada, descarte explícito e nenhum retorno/foco/modal antigo no novo contexto.
- [ ] E12-04 — Conferir sem escala/dimensões, DICOM anisotrópico, prontidão, leitura falha, objeto bloqueado e limite de objetos. Aceite: criação/ajuste obedecem aos bloqueios reais; exclusão de salvo dispensa geometria, mas respeita leitura, UUID, revisão e lock; nenhuma recusa do backend é contornada.
- [ ] E12-05 — Conferir 320/768/1024/1440 px, fullscreen, toque, Tab/Enter/Esc e tooltips pt-BR/en. Aceite: modal contido, foco restaurado, botões legíveis/acessíveis, controles de fundo bloqueados e sem sobreposição ou informação clínica inventada.
- [ ] E12-06 — Sob latência, repetir uma leitura falha pelo modal de exclusão. Aceite: o carregamento indica verificação; nenhum PATCH/PUT ocorre durante o GET e excluir exige outra confirmação após a leitura bem-sucedida. Revalidar Esc e bloqueio recebido enquanto a confirmação está aberta.
- [ ] E12-07 — Conferir o painel desde centro/borda até fragmento e rotação, com mouse, toque, teclado e fullscreen. Aceite: etapa inicial compacta, controles acessíveis, tooltips no padrão universal, erros visíveis e diâmetro curto sem alterar precisão ao salvar outro ajuste; referência clínica ausente dessa área.
- [ ] E12-08 — Comparar TPLO com Distância/Ângulo/TPA e editar o corte em zoom/pan/fullscreen. Aceite: cabeçalho/seções/linhas seguem o card compartilhado; divisórias e campos ficam alinhados; confirmação aparece junto ao corte, fora do menu, some após salvar/cancelar e não permite enviar durante um gesto ou contorno parcial.
- [ ] E12-09 — Conferir a lixeira vermelha no cabeçalho durante centro/borda e abrir Rotação sem fragmento. Aceite: tooltip/nome acessível distinguem descarte local de exclusão; a ação não grava no backend; campo, rótulo, aplicar e comparação mantêm alinhamento com Diâmetro/Ajustar em tela estreita, fullscreen e teclado, sem divisória entre rotação e comparação.
- [ ] E12-10 — Salvar sob latência e provocar resposta incerta/conflito. Aceite: menu permanece visível e bloqueado durante envio, sem card/toast de carregamento; conclusão gera um Sonner; falhas mantêm recuperação por GET/descarte explícito. Sem Detalhes da medida no corpo: ajuda universal explica a origem dos valores e eventual indisponibilidade da simulação; erros continuam visíveis.
- [ ] E12-11 — Delimitar/refazer fragmento com mouse, toque, teclado e fullscreen. Aceite: card compacto sem Medidas durante desenho, ajuda universal junto ao rótulo, contador/desfazer alinhados e ações flutuantes junto ao contorno; concluir só com 3–500 pontos. Desfazer retira só o último vértice; lixeira/cancelar restauram o contorno anterior e preservam corte/rotação. Concluir volta aos ajustes sem gravar até confirmar a osteotomia; bloqueios/releitura continuam acessíveis.
- [ ] E12-12 — Aproximar o contorno de um vértice anterior, especialmente na região mostrada pelo usuário, e repetir com zoom/pan/espelhamento, toque e fullscreen. Aceite: check/X ficam fora da área delimitada com folga em pixels da tela quando há espaço; mudam de lado perto das bordas; marcar o próximo ponto não aciona nem é bloqueado pela barra. Confirmar/cancelar continuam acessíveis e não gravam automaticamente.
- [ ] E12-13 — Abrir Osteotomias salvas com uma, duas e três ou mais visíveis; expandir/recolher e selecionar, inclusive uma bloqueada. Aceite: blocos empilhados e no máximo dois recolhidos, seta só quando houver mais, seleção preservada, nome/Diâmetro/Rotação alinhados e detalhes no “?” universal. Conferir pt-BR/en, toque, teclado, tela estreita e fullscreen; expandir não grava e Nova osteotomia mantém o fluxo atual.

### 13. Aceite manual integrado pelo usuário

- Executar todas as listas `Testes manuais da etapa N` ao final da integração,
  incluindo as retroativas das etapas 0–4. Registrar resultado, ambiente e
  evidências; anotar correções necessárias e itens adicionais descobertos.
- Criar sem fragmento, conferir `FRAGMENT_REQUIRED`, completar, salvar,
  recarregar, reabrir, ajustar rotação, cancelar/salvar e excluir/cancelar exclusão.
- Conferir casos analíticos, retângulo, espelhamento, zoom/pan, fullscreen,
  toque, teclado/Shift e texto com unidade/alinhamento sem sobreposição.
- Conferir contornos de 3 e 500 pontos, correção de vértices, saída transformada
  da imagem, contornos degenerados anteriores e limite total de objetos.
- Conferir múltiplos TPLOs, ocultos/bloqueados e independência dos parâmetros globais.
- Conferir raio/diâmetro, ±180°, 0°, sinal e rotação repetida sem deriva acumulada.
- Consultas de tabela/protocolo e parâmetros globais aguardam definição de nova
  localização de UI; seus testes locais de contrato/concorrência permanecem.
  Conferir que um rascunho de parâmetros anterior pode ser retomado/descartado.
- Recalibrar e verificar geometrias preservadas, novos resultados/fingerprint
  e retorno à Distância. TPA original não vira resultado pós-operatório simulado.
- Conferir resposta perdida, 409, 422, falha de leitura, sessão expirada,
  troca de organização/imagem/caso, exclusão e cliques repetidos.
- Revalidar calibração, ângulos, círculos, distâncias e referências existentes.

**Entrega e aceite** — registrar verificações manuais e corrigir os problemas
observados. Checagem estática isolada não encerra esta etapa.

## Revisão obrigatória de cada entrega

- Comparar alterações com itens e aceite da etapa em execução.
- Conferir contrato, caminho normal de entrada, compatibilidade com dados
  anteriores, concorrência, callbacks e preservação dos demais campos.
- Rodar TypeScript, lint dos arquivos alterados, validação das traduções
  pt-BR/en e whitespace conforme o escopo da alteração.
- Usar o parser TypeScript já instalado pelo `eslint-config-next` quando
  necessário, conforme o procedimento atual, sem mudar configuração por conveniência.
- Registrar neste plano arquivos alterados, decisões, checagens e limites
  verificados. Manter aceite manual separado do status de implementação.
- Ao final de cada etapa, acrescentar uma lista breve de testes manuais com
  identificador e critério de aceite. Repetir um resumo na entrega ao usuário.
  Essas listas só serão executadas após todas as etapas, sem marcá-las como
  aprovadas por checagens estáticas.
- A partir da autorização da etapa 7, executar testes locais apropriados de
  lógica/contrato e DOM simulado, sem chamadas/gravações remotas. Não executar
  o backend nem alterar seu repositório ou `.env`. Não declarar aceite clínico,
  visual ou de ponta a ponta a partir desses testes locais.
- Preservar alterações e arquivos não versionados de outros trabalhos.
  CodeGraph entra antes da exploração somente se `.codegraph/` existir.
- Antes de novas APIs do Next, observar `apps/web/AGENTS.md` e a disponibilidade
  real da documentação instalada. Este plano usa as rotas e APIs existentes.

## Distribuição das verificações — atualizada na etapa 12

| Verificação | Responsável e execução | Situação |
| --- | --- | --- |
| TypeScript, lint, JSON/placeholder, whitespace, UTF-8 e links locais | Agente, automaticamente em cada etapa. | Executados até a etapa 12. |
| Sequência centro/borda, geometria em pixels, diâmetro, limites, comandos e preservação de campos | Agente, testes locais com dados sintéticos e módulos reais. | Cobertura da etapa 7 executada; inclui parte técnica de E1-03, E5-01/02/05 e E6-01. Não encerra o restante desses critérios. |
| Eventos, teclado/Shift, confirmação/cancelamento, espelhamento e bloqueios de interação | Agente, DOM simulado com rede bloqueada. | Cobertura de posicionamento executada; inclui parte técnica de E5-03/04/09 e E6-05. Layout real e todos os gestos de edição ainda exigem aceite integrado. |
| Construção/conclusão do fragmento, limites, cópia/cancelamento, edição de vértices e proteção de callbacks/revisão | Agente, módulos reais e hooks em DOM simulado com rede bloqueada. | 18 testes novos aprovados na etapa 8. Partes visuais e persistência real de E8-01–03 continuam pendentes. |
| Prévia analítica, matriz/SVG, rotação, comparação, máscara, fallback da textura e URL renovada | Agente, módulos reais e DOM simulado com rede bloqueada. | 19 testes novos aprovados na etapa 9 e revisão; total de 66. E9-01–05 ainda exigem aceite visual e integrado. |
| Parâmetros restritos, nulidade, rascunho inválido, writer/recuperação, tabela/protocolo, filtros exatos e respostas tardias | Agente, módulos/hook/workspace reais e transporte sintetizado localmente. | 13 testes novos da etapa 10, quatro da revisão e cinco regressões existentes de referência aprovados; total de 88. E10-01–05 continuam pendentes nas partes reais/visuais. |
| Card, confirmação explícita, cancelamento, reabertura limpa, conflito e resposta perdida | Agente, workspace/hooks/writer/serviço reais com transporte sintético sem rede. | Onze testes novos da etapa 11; total de 99. E11-01–04 aguardam aceite visual e persistência no ambiente integrado. |
| Entrada pública, exclusão, seleção/estado vazio, foco, leitura/lock/revisão e alternância com Distância | Agente, workspace/hooks/writer/serviço reais com transporte sintético sem rede. | Dezesseis testes novos na etapa 12, quatro na revisão e dois de UX/precisão; total de 121. E12-01–09 aguardam aceite real/visual integrado. |
| Matriz oficial, fallback antigo, resultados/estados completos, BFF, writer, 409, resposta perdida e callbacks de hooks | Automatizáveis pelo agente com fixtures e transporte simulado; não precisam de backend real. | Cobertura adicional possível nas próximas revisões. Não executada integralmente nesta etapa; E0–E6 continuam pendentes nas partes sem cobertura. |
| Alinhamento visual, radiografia real, zoom/pan/fullscreen, toque real, responsividade, tooltips e leitor de tela | Usuário, após habilitar o fluxo completo. DOM simulado não reproduz o layout/dispositivo. | Pendente. |
| Persistência no backend real, sessão/permissões, imagem/caso/organização, erro real, recalibração e reabertura | Usuário no ambiente integrado, após todas as etapas. | Pendente; sem escritas remotas pelo agente. |
| Correção clínica dos pontos, corte e fragmento, interpretação e fluxo cirúrgico | Usuário com validação clínica adequada. | Pendente; testes matemáticos não aprovam uma decisão clínica. |

As listas manuais E0–E12 continuam sem marcação automática: um cenário pode
combinar uma propriedade já testada localmente com visualização/persistência
real ainda pendentes. Na etapa 13, registrar o que a automação já cobre e
executar manualmente o restante, evitando repetir cálculos cobertos sem motivo.

## Checklist de acompanhamento

- [x] 0 — Decisões de contrato e interação.
- [x] 1 — Schemas, comandos e operações puras.
- [x] 2 — Transporte, limites e BFF.
- [x] 3 — Writer e recuperação.
- [x] 4 — Estado e rascunho.
- [x] 5 — Canal do visualizador e geometria.
- [x] 6 — Leitura e apresentação dos salvos.
- [x] 7 — Posicionamento inicial.
- [x] 8 — Delimitação e ajuste do fragmento.
- [x] 9 — Rotação, prévia e composição da imagem.
- [x] 10 — Parâmetros e consulta da correção.
- [x] 11 — Card, confirmação e reabertura.
- [x] 12 — Exclusão e habilitação da entrada.
- [ ] 13 — Aceite manual integrado.
