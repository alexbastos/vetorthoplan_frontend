# Plano de implementação — Ângulo

Status: etapas 0 a 10 implementadas; etapa 11 e aceite funcional remoto pendentes.
Ângulo está habilitado no catálogo após conectar criação, leitura, edição,
persistência e exclusão. A implementação está disponível para a validação
manual completa, sem representar aceite funcional já realizado. Distância
mantém seu fluxo atual e suas pendências de aceite manual.

## Objetivo e escopo

Integrar objetos `ANGLE` da API em Ferramentas → Medidas → Ângulo: criar,
selecionar, editar, salvar, reabrir e excluir. O valor oficial em graus vem do
backend; a atualização durante o ajuste é uma prévia local, sem persistência.

- Geometria com ponto inicial, vértice e ponto final: `start`, `vertex`, `end`.
- Criação explícita de ângulo, com UUID estável e salvamento pelo usuário.
  A calibração não cria um `ANGLE` nem transforma a distância em ângulo.
- Um editor com alterações por imagem; calibração, Distância e Ângulo
  compartilham o bloqueio e a revisão do plano.
- Marcações aparecem somente quando Ângulo está ativo no painel Medidas.
- Menu no quadro seguindo o padrão atual: mover, ajustes dos três pontos,
  olhinho e lixeira; apenas a faixa de Ajustes se expande horizontalmente.
- Resultado em etiqueta compacta e na imagem; X/check discretos perto do
  ajuste, ocultos durante arraste ou enquanto setas estão pressionadas.
- Ciano do DS para segmentos, alças, arco auxiliar e valor. Movimento reduzido,
  teclado, toque, fullscreen, zoom, pan e espelhamento preservados.

Ficam fora desta entrega: ângulo TPLO/TPA automático, referências anatômicas,
ângulo reflexo/orientado sem suporte confirmado, alternância arbitrária de
convenção, autosave, histórico de undo/redo e bloqueio de rotação da referência.

## Contrato conferido em 04/11/2026

Fonte: [OpenAPI público](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/openapi.json),
também apresentado no [Swagger](https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com/docs).
Leitura pública, sem autenticação, gravação clínica ou instalação do backend.

| Item | Confirmado |
| --- | --- |
| Identificação publicada | Versão `0.9.0`, branch `protese`, commit informado `ea242ce`. |
| Objeto | `PlanAngle`: obrigatórios `id`, `type: "ANGLE"`, `start`, `vertex`, `end`. |
| Coordenadas | `PlanPoint.x/y` entre 0 e 1, inclusive. |
| Apresentação | `label` opcional/nulo, máximo 120 caracteres; `visible: true` e `locked: false` como defaults. |
| Resultado | `measurement` opcional/nulo; valores do cliente são ignorados pelo backend. |
| Derivado | `status`, `calibration_id`, mapas `values` e `units`; `degrees` é uma unidade permitida. |
| Leitura | `GET /api/v1/images/{image_id}/plan`. |
| Gravação | `PUT` nessa mesma rota com `{ base_revision, document }`. |
| Exclusão | Não há operação específica para excluir um ANGLE; remover o alvo do documento e salvar pelo mesmo PUT. |

O schema local e o cliente gerado já leem `ANGLE`. Os comandos de Ângulo estão
registrados nas uniões operacionais do PATCH/BFF e do serviço same-origin.
A entrada de Ângulo pelo catálogo está habilitada, respeitando escala confirmada,
dimensões, DICOM e bloqueios do plano. Recuperação, seleção, rascunho, visualizador,
leitura, criação, prévia dinâmica, menu, salvamento e exclusão estão integrados;
a validação funcional de ponta a ponta permanece na etapa 11.

**Limite do OpenAPI:** esses schemas não especificam a chave do valor angular,
a fórmula, a base geométrica nem as regras de degeneração. Esses detalhes
foram conferidos na fonte da própria revisão anunciada pelo Swagger, conforme
as evidências da etapa 0 abaixo.

Não escolher o primeiro valor de `measurement.values`, não pressupor nomes como
`angle` ou `angle_degrees` e não tratar a prévia como resultado oficial salvo.

## Arquitetura e pontos de extensão

Os caminhos desta tabela são relativos a `apps/web/src/`.

| Responsabilidade | Reutilização / extensão |
| --- | --- |
| Modelo de leitura | `features/cases/schemas/image-plan.schema.ts`: extrair entrada editável de ANGLE, conservando o modelo remoto completo. |
| Comandos e merge | `features/cases/schemas/image-plan-command.schema.ts`: comandos estritos, aplicação no alvo e reconhecimento do resultado. |
| BFF e transporte | `lib/server/image-plan-bff.ts`, rota `app/api/cases/[caseId]/images/[imageId]/plan/edits/route.ts` e `features/cases/services/image-plan-api.ts`. |
| Gravação e recibos | `features/cases/lib/image-plan-saving.ts` e `calibration-save-state.ts`: mesmo writer/lock/revisão por imagem. |
| Donos de rascunho | `image-plan-draft.ts`, `use-image-plan-drafts.ts`, `use-workspace-draft.ts` e `cases-query-keys.ts`. |
| Estado de Ângulo | Novos módulos focados `angle-editor.ts`, `angle-draft.ts` e `use-image-angle.ts`, junto dos módulos de Distância. |
| Geometria e interação | Novos helpers de ângulo, reutilizando `image-point-space.ts` e o mapeamento do visualizador. |
| Visualizador | `viewer-editor.ts`, `case-image-viewer.tsx`, `case-preview-panel.tsx` e uma camada própria `angle-overlay.tsx`. |
| Menus | Reutilizar `viewer-toolbar.tsx`, `viewer-tool-action.tsx` e os padrões visuais existentes. Compartilhar estrutura idêntica sem fazer Ângulo depender dos hooks de Distância. |
| Orquestração | `case-image-workspace.tsx` e `case-image-tools-panel.tsx`: ferramenta ativa explícita e seleção independente. |
| Preferências | `use-image-display-settings.ts`: visibilidade local do valor, isolada da preferência de Distância. |

Fluxo de gravação:

```text
Ângulo → rascunho e comando → writer compartilhado
  → PATCH same-origin /plan/edits → BFF valida e altera só o ANGLE
  → PUT do plano com base_revision → confirmação → cache e resultado oficial
```

Não criar endpoint remoto inexistente, outro cache de plano, writer paralelo,
biblioteca de canvas ou armazenamento clínico em localStorage/sessionStorage.

### Cuidado obrigatório antes de habilitar Ângulo

Hoje há ramos que classificam qualquer edição diferente de qualidade como
Distância. Eles precisam de discriminação explícita por família de comando:

- BFF: preflights e permissões de geometria.
- Writer: dono, captura, reconhecimento e limpeza do rascunho correto.
- `image-plan-draft.ts`: identificação do dono do recibo.
- `use-image-distance.ts`: leitura/recuperação somente de comandos de distância.
- Workspace: intenção, editor, menu e retorno de navegação bloqueada.

Adicionar os novos tipos sem corrigir esses ramos pode fazer um recibo de Ângulo
abrir Distância ou limpar o rascunho errado. Os ajustes de tipagem/discriminação
necessários devem acompanhar a ampliação das uniões, mantendo cada etapa coerente.

## Etapas de implementação

Cada etapa entrega um resultado pequeno e revisável. Não avançar marcando como
concluído o que ainda depende de contrato, implementação ou validação manual.
Os nomes dos novos arquivos são propostas; evitar abstrações sem uso concreto.

### 0. Confirmar a semântica do resultado angular

- Completar a evidência do contrato com resposta real desidentificada ou fonte
  do backend: chave/unidade, convenção, limites, estados sem escala/dimensões e
  serialização dos três pontos.
- Conferir exemplos de ângulo reto, agudo, obtuso, colinear e braços nulos em
  imagem retangular; confirmar preservação do UUID e efeito da recalibração.
- Confirmar a base geométrica para DICOM: pixels originais ou coordenadas físicas,
  precedência de `pixel_spacing_mm`/`imager_pixel_spacing_mm` e tratamento de
  espaçamento anisotrópico. Até haver confirmação, preservar o bloqueio atual
  de geometria incompatível; não presumir pixels fisicamente quadrados.
- Registrar origem e limites da evidência neste documento, sem converter mocks
  em prova do comportamento publicado.

**Entrega:** decisões de leitura, prévia e reconhecimento sem suposições.
**Situação:** concluída por leitura de fonte da revisão anunciada pela API.
O aceite funcional contra o serviço publicado permanece na etapa 11.

#### Evidência de fonte obtida nesta implementação

Primeiro foi lido o commit histórico `67cf7d1eb37c1e46409adafbed5636479349308f`
disponível no repositório local de backend. Depois a leitura pública da fonte
`ea242ce` foi bem-sucedida, e o GitHub resolveu esse identificador para
`ea242ce971412f371c8004d64630289055b53ad4`, a revisão anunciada pelo Swagger.
Não houve checkout, fetch, alteração do backend, instalação nem execução.

Fontes primárias na revisão conferida:

- [Schemas: PlanPoint, PlanAngle e resposta do plano](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/api/schemas.py).
- [Derivação: ramo ANGLE e função _angle_degrees](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/domain/planning/measurements.py).
- [Rotas: model_dump e resposta de GET/PUT](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/api/routes/plans.py).
- [Caso de uso: derivação e persistência do documento](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/application/use_cases/image_plans.py).

| Regra na revisão `ea242ce` | Evidência |
| --- | --- |
| Resultado | `domain/planning/measurements.py`, ramo `ANGLE` de `derive_plan_measurements`: `status: CALCULATED`, `values.angle`, `units.angle: degrees`. |
| Convenção | `_angle_degrees`: `degrees(atan2(abs(cross), dot))`, ângulo interno não orientado de 0° a 180°. |
| Base geométrica | Vetores formados diretamente por diferenças de `x/y` normalizados; `_angle_degrees` não recebe largura, altura ou espaçamento físico. |
| Braços nulos | `api/schemas.py`, validador de `PlanAngle`: recusa inicial=vértice ou final=vértice. |
| Ângulo de 0° | Inicial=final é aceito se diferente do vértice; braços no mesmo sentido também produzem 0°. Não aplicar a regra de comprimento positivo de Distância. |
| Ângulo de 180° | Braços colineares opostos produzem 180°. Não rejeitar colinearidade indiscriminadamente. |
| Escala e dimensões | O ramo ANGLE ocorre antes do bloqueio de `mm_per_pixel`; calcula sem escala/dimensões e não inclui `calibration_id`. |
| Recalibração | O derivado é removido e recalculado ao salvar; a mesma geometria angular conserva o resultado independentemente da escala nessa fonte. |
| Identidade e precisão | `PlanAngle.id` é UUID e os pontos são floats. A rota serializa com `model_dump(mode="json")`; a derivação clona o documento e não troca UUID/pontos nem arredonda o resultado angular para apresentação. |

Casos analíticos de referência, deduzidos da fórmula e não executados:

| Inicial / vértice / final | Resultado da convenção conferida |
| --- | --- |
| `(1;0,5)` / `(0,5;0,5)` / `(1;1)` | Agudo: 45°. |
| `(1;0,5)` / `(0,5;0,5)` / `(0,5;1)` | Reto: 90°. |
| `(1;0,5)` / `(0,5;0,5)` / `(0;1)` | Obtuso: 135°. |
| `(0,75;0,5)` / `(0,5;0,5)` / `(1;0,5)` | Colinear no mesmo sentido: 0°. |
| `(1;0,5)` / `(0,5;0,5)` / `(0;0,5)` | Colinear oposto: 180°. |
| Inicial=final, ambos distintos do vértice | Válido: 0°. |
| Inicial=vértice ou final=vértice | Inválido: recusa no validador de braços. |

Consequências para as próximas etapas:

- A prévia de compatibilidade precisa usar as coordenadas normalizadas, como
  o backend. Multiplicar cada eixo pelos pixels produz outro resultado em
  imagens retangulares. Essa diferença frente ao ângulo visual/físico deve
  permanecer explícita no aceite; não corrigir só o frontend silenciosamente.
- A fórmula de ANGLE não usa espaçamento DICOM, portanto não há precedência
  entre seus campos nesse cálculo. Preservar os bloqueios atuais do produto;
  não apresentar essa fórmula como compensação física de pixels anisotrópicos.
- A futura leitura de ANGLE não deve exigir o fingerprint de calibração usado
  em Distância: ele não é incluído no derivado angular da revisão conferida.
- Os casos 0°/180° acima são deduções da fórmula e do validador inspecionados,
  não respostas obtidas por executar o backend nem fixtures de aceite real.

**Limite desta entrega:** a conferência é estática, com fonte identificada, como
previsto nesta etapa. Nenhum caso foi gravado na API; respostas reais e a
jornada integrada, inclusive a base geométrica esperada pelo produto, continuam
reservadas ao aceite manual da etapa 11.

### 1. Definir os comandos e o merge de ANGLE

- Criar entradas estritas `angle-create`, `angle-update` e `angle-delete`, com
  revisão, UUID e os três pontos; criação recebe nome inicial sem colisão.
- Rejeitar campos extras, resultados enviados pelo navegador, IDs ambíguos,
  alvo de outro tipo/bloqueado e limite global de 500 objetos.
- Validar braços não nulos e demais degenerações conforme a etapa 0.
- Aplicar somente o alvo; remover apenas seu derivado antigo ao editar.
  Preservar calibração, LINEs, flags, demais objetos e metadados clínicos.
- Reconhecer confirmação por identidade/geometria/revisão; resultado ausente
  não deve transformar uma gravação reconhecida em nova tentativa de escrita.
- Introduzir os predicados de família necessários nos consumidores existentes,
  sem deixar Ângulo cair no tratamento de Distância.

**Entrega:** schemas, tipos, merge e reconhecimento. Sem habilitar a UI.
**Aceite:** create/update/delete têm efeito restrito e não aceitam derivado local.

#### Entrega da etapa 1

- `PlanAngleInputSchema` separa entrada editável da leitura remota. Braços nulos
  são recusados, preservando a leitura de planos antigos e os casos 0°/180°.
- `CreateAngleSchema`, `UpdateAngleSchema`, `DeleteAngleSchema` e `SaveAngleSchema`
  aceitam somente intenção, revisão, UUID e campos permitidos. UUIDs de comando
  são normalizados para minúsculas; coordenadas continuam finitas em `[0,1]`.
- `applyPlanCommand` aplica create/update/delete apenas em ANGLE, verificando
  unicidade global de IDs, tipo do alvo, bloqueio e limite de 500 objetos.
  Editar remove somente seu `measurement` obsoleto; label, flags, demais objetos,
  calibração e metadados clínicos permanecem preservados.
- `planCommandMatches` reconhece ANGLE por UUID, três pontos, nome na criação
  e revisão posterior à observada. A ausência de resultado derivado não força
  repetição da gravação; exclusão é reconhecida pela ausência do alvo.
- `nextPlanObjectLabel` prepara nomes sem colisão para LINE/ANGLE, mantendo o
  comportamento e a interface de `nextDistanceLabel` existentes.
- `isDistanceCommand`, `isAngleCommand` e `planCommandOwner` substituem os ramos
  que presumiam Distância para qualquer operação diferente de qualidade.
- Na entrega original desta etapa, `PlanMutationInput` incluía ANGLE somente nas
  operações puras. A etapa 2 unifica esse contrato com `PlanSaveCommand`, agora
  registrado na rota e no transporte. Recibos/recuperação e interface próprios
  continuam nas etapas seguintes.

**Revisão:** verificação estática de tipos e diff aprovados; revisão independente
sem achados materiais. Nenhum teste automatizado, script do backend ou gravação
remota foi executado. O aceite funcional continua manual, conforme solicitado.

### 2. Conectar BFF e transporte existentes

- Registrar os comandos no PATCH atual e no serviço same-origin.
- Validar autenticação, vínculo imagem/caso/organização, estado da imagem,
  revisão e tamanho do corpo; reutilizar os limites existentes.
- Tornar a política de geometria/calibração explícita por família. Manter a
  barreira atual de acesso a Ferramentas; não confundir essa regra de produto
  com uma exigência matemática do cálculo angular.
- Enviar um único PUT do documento atualizado; conferir a resposta e manter
  as distinções de conflito, recusa definitiva e resultado incerto.

**Entrega:** comandos chegam ao backend pelo caminho já existente.
**Aceite:** nenhum dado clínico fora do ANGLE é sobrescrito pelo cliente.

#### Entrega da etapa 2

- `SavePlanEditSchema` registra as opções de `SaveAngleSchema` junto de qualidade
  e Distância. `PlanSaveCommandSchema` passa a validar a mesma união usada pelo
  merge/reconhecimento, sem manter um contrato puro paralelo.
- O serviço `saveImagePlanEdit` reutiliza essa validação, o PATCH same-origin,
  credenciais/contexto da organização e conferência da resposta por imagem,
  revisão seguinte e comando reconhecido. Não foi criado outro transporte.
- A rota mantém autenticação, organização esperada, origem confiável e JSON.
  Ângulo usa o limite de 4 KiB em bytes UTF-8, incluindo espaços/escapes; somente
  qualidade radiográfica conserva a exceção existente de 12 KiB.
- O BFF verifica imagem do caso em estado READY e aplica a política abaixo.
  Revisão divergente impede a escrita; IDs ambíguos recusam o plano antes do
  merge. Alvo inexistente, de outro tipo ou bloqueado é recusado localmente.
- O documento lido do servidor recebe somente a alteração permitida no ANGLE;
  criação/edição/exclusão seguem em um único PUT com `base_revision`. Campos
  clínicos e demais objetos não são fornecidos pelo navegador nem substituídos
  por um documento montado no cliente.
- A resposta exige a próxima revisão e o comando reconhecido. Derivado angular
  ausente não provoca repetição da escrita. Recusas definitivas, conflito e
  falhas após início do PUT conservam as classificações existentes; este caminho
  não repete automaticamente a gravação.

| Família | Dimensões e barreira de anisotropia DICOM | Calibração com resultado |
| --- | --- | --- |
| Calibração | Exigidas, como antes. | Não exigida previamente. |
| Qualidade radiográfica | Não exigidas. | Não exigida. |
| Distância | Exigidas, como antes. | Exigida, como antes. |
| Ângulo | Exigidas pela política atual de Ferramentas. | Exigida pela política atual de Ferramentas. |

As barreiras de Ângulo são regras atuais do produto, preservadas nesta etapa.
O cálculo publicado em coordenadas normalizadas não depende matematicamente
de escala nem de dimensões e não compensa espaçamento DICOM anisotrópico.
Não se alterou essa fórmula ou o fluxo de calibração/Distância.

**Limite:** a conexão é entregue no transporte/BFF; habilitação visual e integração
com os rascunhos/recuperação próprios de Ângulo permanecem pendentes. O aceite
remoto será manual; nenhuma gravação clínica foi realizada nesta implementação.

**Revisão:** verificação estática de tipos do web e `git diff --check` aprovados.
Foram revisados o caminho autenticado, os limites da rota, a discriminação das
famílias, o merge e a conferência da resposta. Nenhum teste automatizado ou
chamada de gravação ao backend foi executado; a validação funcional fica manual.

### 3. Integrar recibos, dono e recuperação

- Usar o mesmo recibo e writer por imagem, com dono explícito `angle`.
- Capturar e limpar somente a intenção correspondente ao comando confirmado;
  o hook de Distância não deve consumir nem restaurar recibos de Ângulo.
- Bloquear duplo envio e concorrência entre ferramentas. Conflito conserva o
  rascunho; resposta perdida oferece somente GET de conferência.
- Restaurar a ferramenta Ângulo após remontagem ou navegação bloqueada,
  sem redirecionar a recuperação para Distância.

**Entrega:** gravação/recuperação reconhecem cada família sem interferência.
**Aceite:** um comando de Ângulo não limpa nem assume um rascunho de outra área.

#### Entrega da etapa 3 — 05/11/2026

- `imagePlanSaveCommand` e `imagePlanSaveOwner` concentram a leitura da intenção
  e do dono do recibo. Ângulo usa o mesmo recibo/cache/writer por imagem; não há
  writer paralelo, armazenamento persistente ou nova rota remota.
- O writer continua deduplicando a mesma intenção e recusando comandos
  concorrentes diferentes. A conferência e o descarte exigem o comando capturado
  exato, incluindo família, UUID, revisão e pontos. Recibos de outra área ou
  outra intenção não podem ser descartados por um callback antigo.
- A confirmação de ANGLE não executa os ramos de limpeza de calibração,
  qualidade ou Distância. Recibos confirmados deixam de contar como pendência,
  mantendo a informação necessária para reconhecer chamadas repetidas.
- Conflitos preservam a intenção capturada. Resultado incerto é conferido por
  GET; uma revisão igual à observada mantém a incerteza, enquanto uma posterior
  sem reconhecimento informa conflito. A recuperação não reenviará o PUT.
- A ausência de um ANGLE após conflito de exclusão é reconhecida como
  `ANGLE_ALREADY_REMOVED`, com aviso informativo. Isso registra o estado observado
  sem atribuir a exclusão a uma escrita recusada nem tentar excluir novamente.
- `isImagePlanSaveInFlight` e `subscribeImagePlanSave` expõem o estado real da
  requisição por QueryClient/imagem. A assinatura é removida no unmount; o fim
  da requisição atualiza os observadores sem polling. Um recibo remontado em
  saving/checking sem requisição ativa oferece conferência, sem loading eterno.
- `useAngleSaveRecovery` observa somente comandos de Ângulo, bloqueia duplo
  clique e valida escopo, exclusão e identidade antes de agir. A resposta de
  contexto antigo não exibe avisos na imagem/organização nova.
- O workspace restaura Medidas e destaca Ângulo quando há seu recibo pendente,
  sem ativar a seleção/edição de Distância. Navegação bloqueada e mensagens usam
  o dono do recibo; as proteções compartilhadas de saída e exclusão reconhecem
  essa pendência. Fora do painel Medidas não aparece controle de recuperação.
- `CaseImageAngleRecovery` oferece conferência ou descarte explícito conforme
  o estado, no menu do quadro. Usa componentes/tokens existentes, tooltips com
  o motivo, status acessível e notificações com título/descrição em pt-BR e en.

**Limite da etapa:** aqui o rascunho recuperável é a intenção completa já
capturada no recibo. O estado de posicionamento antes do primeiro envio, sua
chave e a limpeza correspondente ao futuro editor pertencem à etapa 4; não
foram antecipados nem declarados concluídos. O catálogo só destaca Ângulo para
recuperação existente; não permite iniciar criação/edição visual nesta etapa.

**Validação manual ainda pendente:** resposta perdida seguida de GET, remontagem
durante salvamento, conflito, exclusão já realizada, navegação bloqueada e
isolamento entre ferramentas/imagens/organizações. Nenhuma gravação na API ou
teste automatizado foi executado durante esta implementação.

**Revisão de conclusão — 05/11/2026:** a primeira verificação de tipos encontrou
três notificações sem a descrição obrigatória do projeto. As chamadas e as
mensagens em ambos os idiomas foram corrigidas. A verificação estática de tipos
do web passou; JSON/chaves de recuperação pt-BR/en e `git diff --check` também
passaram. Foram revisados o comando exato do recibo, os bloqueios de concorrência,
o GET de conferência, a classificação da exclusão já observada e o retorno ao
painel correto. Isso encerra a implementação da etapa, sem substituir o aceite
funcional manual.

### 4. Acrescentar o estado de edição de Ângulo

- Criar chave e hook próprios para seleção, rascunho e fases de colocação dos
  três pontos; usar o QueryClient da organização atual.
- Integrar dono `angle` aos guards reativos, saída, beforeunload e exclusão
  de imagem/caso; impedir recriação por callbacks de contexto antigo.
- Preservar o rascunho ao ocultar o painel e descartar somente por ação explícita.
- Na troca de ferramenta, fechar editor limpo preservando seleção/plano.
  Com alterações, exigir salvar/cancelar; com recibo incerto, manter recuperação.

**Entrega:** `use-image-angle.ts` e ciclo de vida integrado.
**Aceite:** nenhuma seleção ou alteração atravessa imagem, caso ou organização.

#### Entrega da etapa 4 — 05/11/2026

- `angle-editor.ts` define criação, edição e exclusão, com colocação discriminada
  em `start → vertex → end → complete`. Os pontos são validados em `[0,1]`;
  braços nulos são recusados e 0°/180° continuam válidos. Um rascunho incompleto
  permanece protegido, mas não produz comando salvável.
- `imageAngleDraft` e `imageAngleSelection` usam o QueryClient da organização,
  caso e imagem atuais. Seleção e rascunho sobrevivem ao unmount/ocultação em
  memória, sem localStorage/sessionStorage. UUID e nome são gerados somente ao
  iniciar criação; os passos não recriam o objeto.
- `useImageAngle` oferece seleção, início de edição/criação/exclusão, colocação
  de pontos, atualização da geometria, comando, salvamento, cancelamento e
  fechamento de editor limpo. A recuperação do recibo continua compartilhada
  com a etapa 3. Objetos bloqueados podem ser selecionados, mas não alterados.
- Cada ação confere o escopo e a identidade da query. Trocas de organização,
  caso, imagem, disponibilidade ou painel invalidam callbacks antigos. Alterar
  geometria exige ainda o UUID esperado e a revisão atual; remover/recriar a
  query não permite que um callback antigo restaure o rascunho.
- `hasAngleDraft`, os guards reativos e o workspace passam a reconhecer o
  rascunho anterior ao primeiro envio. Saída, beforeunload e exclusão de
  imagem/caso são protegidos. A exclusão confirmada remove também seleção e
  rascunho de Ângulo do cache; callbacks antigos não os recriam.
- `closeOtherCleanMeasurementEditor` fecha somente o editor limpo da outra
  ferramenta ao iniciar uma medida, preservando seleção e plano. Editor
  alterado ou recibo pendente impede a troca. Ocultar o painel não descarta
  alterações; sair descartando ou cancelar são decisões explícitas.
- O writer recusa um comando diferente do rascunho alterado de Ângulo. Uma
  confirmação limpa somente o rascunho que corresponde exatamente à intenção
  enviada, inclusive UUID, revisão, label e três pontos; uma colocação ou edição
  mais nova fica intacta. A seleção confirmada é preservada, ou removida na
  exclusão do alvo, sem sobrescrever outra seleção mais recente.
- O workspace usa `useImageAngle` e seu descarte integrado à recuperação.
  Pendências aparecem no resumo de saída como Ângulo, sem assumir Distância.
  Mudança de ferramenta exige salvar/cancelar; recibo incerto permite somente
  a conferência já implementada. Os avisos foram adicionados em pt-BR e en.

**Limite:** o estado e os métodos estão conectados, mas o catálogo não inicia
criação/edição visual. Overlay, gestos, menu de edição e prévia angular continuam
nas etapas 5 em diante. Não houve mudança do fluxo salvo de calibração/Distância,
nem antecipação da habilitação pública de Ângulo.

**Aceite manual pendente:** colocação incompleta, cancelar/salvar, ocultar e
reabrir painel, fechar editor limpo, troca entre medidas com alteração, conflito,
confirmação tardia com rascunho mais novo, troca de organização/imagem/caso,
exclusão e callbacks antigos. Nenhum teste automatizado ou gravação clínica na
API foi executado durante esta etapa.

**Revisão de conclusão:** verificação estática de tipos do web aprovada após os
ajustes de tipagem do rascunho. `git diff --check`, leitura do JSON e equivalência
das chaves de Ângulo em pt-BR/en aprovados. Foram revisados os passos de colocação,
as identidades dos callbacks, o fechamento de editores limpos, os guards e a
limpeza seletiva na confirmação. As verificações são estáticas; não substituem
o aceite funcional manual reservado para a integração completa.

### 5. Preparar o visualizador para três pontos

- Acrescentar variante `angle` ao editor discriminado, com geometria própria;
  não converter ANGLE em marcador de calibração nem ignorar o vértice.
- Manter zoom/pan/captura/contextControls compartilhados; isolar a matemática
  de ângulo em helpers para não alterar o comportamento de linha/círculo.
- Incluir ferramenta, UUID, imagem e contexto na identidade dos gestos.
  Escape, cancelamento e perda de captura não confirmam geometria transitória.
- Adaptar a prévia e o estado de interação que oculta X/check para Ângulo.

**Entrega:** suporte estrutural sem ativar controles incompletos no catálogo.
**Aceite:** Distância e calibração mantêm seus gestos e seus dados originais.

#### Entrega da etapa 5 — 05/11/2026

- `ViewerEditor` tem variante `angle`, com UUID, revisão, geração de contexto,
  geometria de três pontos, alvo do teclado e callbacks próprios de prévia e
  alteração. O adapter fornece um canal angular separado, com marcador de
  calibração nulo; nenhum vértice é descartado nem ANGLE convertido em LINE.
- `angle-interaction.ts` concentra conversão entre coordenadas normalizadas e
  pixels originais, hit test de três alças/dois segmentos, movimento do conjunto,
  ajuste de cada ponto e teclado. O conjunto é limitado pela caixa dos três
  pontos, sem deformação; braços nulos são recusados e 0°/180° permanecem válidos.
  Pontos não movidos conservam seus valores normalizados originais.
- `ViewerAngleEditorOverlay` apresenta somente o rascunho ativo, em ciano do DS,
  com três alças e dois segmentos. Raios/espessura mantêm tamanho visual sob zoom;
  o espelhamento acompanha os controles e respeita movimento reduzido nas alças.
  Resultado oficial, rótulo em graus e arco auxiliar são entrega da etapa 6.
- O workspace conecta o editor somente em Ferramentas → Medidas. O visualizador
  compartilha pan, zoom, fullscreen, captura e `contextControls`; a matemática
  de linha/círculo permanece nos helpers anteriores.
- A identidade do gesto contém família, UUID, revisão, imagem/caso e geração
  do contexto da organização, além da geometria e das permissões. Para Ângulo,
  mudanças do zoom/viewport também invalidam a transformação durante o ajuste.
  Uma prévia angular de outro dono não aparece no contexto novo.
- Arraste publica apenas geometria transitória até pointerup válido. Escape,
  pointercancel, perda de captura, blur da janela, troca de contexto ou unmount
  descartam a prévia sem confirmar o rascunho. Callbacks de outro dono não podem
  iniciar nem finalizar gestos do contexto atual.
- Setas ajustam conjunto/inicial/vértice/final, com Shift para ampliar o passo e
  compensação do espelhamento. O mesmo estado compartilhado de interação oculta
  X/check durante arraste ou enquanto as setas estiverem pressionadas, incluindo
  os futuros controles de Ângulo no quadro.
- Os textos do editor e a orientação de teclado foram acrescentados em pt-BR
  e en. O catálogo continua sem ação para iniciar Ângulo; não há autosave nem
  novo endpoint/transporte nesta etapa.

**Limite:** estes pixels são base de desenho/interação, não uma mudança na fórmula
angular normalizada do backend. Leitura de resultados, colocação em três cliques,
prévia numérica e menus de edição completos seguem nas etapas 6, 7 e 8.
Cancelamento, toque, fullscreen, zoom, espelhamento e regressões de calibração/
Distância continuam na matriz de aceite manual; nenhuma gravação na API ou teste
automatizado foi executado nesta implementação.

**Revisão de conclusão:** os quatro itens previstos acima foram conferidos no
código e nos pontos de integração. A verificação estática de tipos do web,
`git diff --check` e a leitura/equivalência das chaves de tradução do visualizador
em pt-BR/en passaram. A revisão cobriu os ramos de calibração/Distância, a
separação do canal angular, a validação dos três pontos, a identidade da prévia,
o cancelamento sem commit e o estado compartilhado das ações. O aceite funcional
segue manual e não foi declarado aprovado nesta etapa.

### 6. Ler e apresentar ângulos salvos

- Selecionar somente objetos ANGLE visíveis e ler o derivado segundo a etapa 0.
- Exibir segmentos, alças, arco auxiliar e valor em graus no DS; preservar
  tamanho visual sob zoom e legibilidade no espelhamento.
- Diferenciar resultado oficial, prévia e resultado indisponível; não aplicar
  a regra de comprimento positivo da Distância a um eventual 0° válido.
- Manter seleção explícita para múltiplos ângulos, inclusive os bloqueados.

**Entrega:** `angle-result.ts`, formatação e `angle-overlay.tsx`.
**Aceite:** ângulo salvo sem resultado continua preservado e selecionável.

#### Entrega da etapa 6 — 05/11/2026

- `angle-result.ts` seleciona somente ANGLE visível, sem filtrar objetos por
  bloqueio ou ausência de resultado. O derivado oficial exige CALCULATED,
  `values.angle` finito em `[0,180]` e `units.angle: degrees`. Não exige
  `calibration_id`, escala ou comprimento positivo; 0° e 180° são válidos.
- Resultado ausente, unidade/valor/geometria inválidos, estados de dependência
  declarados pela API, IDs ambíguos e plano não conferido têm estados distintos.
  O leitor não escolhe outro campo do mapa nem calcula um substituto oficial.
- `angle-format.ts` formata graus com duas casas em pt-BR/en, preservando a
  precisão persistida e tratando zero como valor. `AngleOverlay` apresenta os
  dois segmentos, três alças, arco auxiliar e rótulo em ciano do DS. Escala
  visual de traços/alças/texto acompanha o zoom; o texto desfaz o espelhamento.
- `angle-overlay-geometry.ts` constrói o arco na base normalizada confirmada
  na etapa 0 e depois converte cada eixo para pixels. Em uma imagem retangular,
  isso produz um arco elíptico, sem substituir a convenção do backend pelo
  ângulo físico/visual em pixels. O valor do rótulo continua vindo do servidor.
- `CaseImageAngleValues` apresenta seleção compacta por valor, com nomes e
  motivos acessíveis/tooltips. Objetos bloqueados têm indicador próprio e
  permanecem selecionáveis. Ângulos sem resultado continuam na lista e na
  camada; não se tornam inexistentes nem entram automaticamente em edição.
- A variante `angle-select` e `pickAngle` permitem seleção pela imagem em modo
  de visualização, preservando pan e distinguindo clique de arraste. A escolha
  em sobreposições é determinística, com prioridade para as alças selecionadas;
  a lista oferece a alternativa de teclado para todos os objetos visíveis.
- O workspace distingue a medida visualizada por contexto de organização,
  caso e imagem. Isso é a base mínima de seleção ativa necessária à leitura;
  não habilita a entrada de Ângulo no catálogo, criação ou o menu de edição da
  etapa 9. Distância e Ângulo não desenham camadas simultâneas. Fora de Medidas
  as marcações e a lista de valores permanecem ocultas.
- Prévia e derivado oficial têm fontes explícitas. Durante um ajuste, a
  geometria transitória substitui apenas a apresentação do alvo; o valor salvo
  não é reaproveitado nos novos pontos. Até a prévia numérica da etapa 8, o
  estado fica como “Em ajuste”. O contrato visual aceita valor local com `≈`,
  sem gravá-lo no plano. Cancelar o gesto restaura a apresentação anterior.
- Correspondência de UUIDs ignora maiúsculas/minúsculas na seleção e na fusão
  da prévia, evitando duplicar uma marcação ou perder o destaque. Os textos e
  motivos de indisponibilidade foram acrescentados em pt-BR e en.

**Limite:** a apresentação foi conectada aos editores/seleções/recibos existentes.
O catálogo continua sem iniciar Ângulo; criação em três cliques, cálculo local
dinâmico e menu completo de edição/salvamento seguem nas etapas 7, 8 e 9.
Zero, colinearidade, bloqueados, múltiplos, sobreposições, resultados ausentes,
zoom/espelhamento e regressão das outras ferramentas continuam no aceite manual.
Nenhum teste automatizado ou gravação clínica na API foi executado nesta etapa.

**Revisão de conclusão:** verificação estática de tipos do web aprovada;
`git diff --check`, leitura dos JSONs e equivalência das chaves de Ângulo/motivos
em pt-BR/en aprovados. Foram conferidos o uso exato do derivado, zero válido,
objetos visíveis/bloqueados/sem resultado, fusão de prévia por UUID, seleção em
sobreposições, exibição exclusiva da ferramenta ativa e separação entre valor
oficial e ajuste local. O aceite funcional manual permanece pendente.

### 7. Criar um ângulo no quadro

- Definir colocação em três cliques/toques: inicial → vértice → final,
  com prévia dos passos e alternativa de posicionamento central por teclado.
- Criar UUID/nome uma única vez por rascunho; só permitir salvar a geometria
  completa e válida. Escape cancela o gesto; cancelar edição descarta o rascunho.
- Primeiro acesso sem ANGLE salvo inicia criação. Havendo um único salvo,
  abrir seu ajuste; com múltiplos, exigir seleção. Outra criação exige ação
  explícita de Novo ângulo no menu, sem duplicar por clique repetido no catálogo.

**Entrega:** criação local acessível, sem HTTP ao posicionar os pontos.
**Aceite:** criar ANGLE não muda a linha de Distância nem a calibração.

#### Entrega da etapa 7 — 05/11/2026

- `useImageAngle.open` define a entrada: retoma o editor existente; sem ANGLE
  visível inicia criação; com um salvo abre edição, ou seleção se bloqueado;
  com múltiplos mantém seleção explícita, sem escolher outro objeto sozinho.
  Clicar de novo na ferramenta não reinicia pontos, UUID ou nome do rascunho.
- `beginNew` é a ação explícita de Novo ângulo. Fecha somente editor limpo e
  preserva as barreiras de concorrência, revisão, geometria e limite global de
  500 objetos. Rascunho alterado ou criação em andamento não é substituído por
  outra criação; a confirmação/cancelamento correspondente continua obrigatória.
- O editor do visualizador recebe a colocação discriminada e callbacks próprios.
  Cada clique/toque confirma um ponto somente em pointerup dentro da imagem e
  com deslocamento abaixo do limiar de clique. Pressionar ou mover o ponteiro
  mostra prévia; arraste, cancelamento e perda de captura não confirmam o ponto.
- A colocação exige UUID, revisão, contexto e passo esperado atuais no hook.
  Eventos repetidos/atrasados de outro passo não avançam a sequência nem
  sobrescrevem os pontos já confirmados. Braços nulos são recusados, conservando
  o passo atual; uma geometria incompleta não gera comando para salvar.
- `angle-placement.ts` adapta os pontos parciais para pixels e define a geometria
  central válida. `ViewerAnglePlacementOverlay` mostra pontos fixos e cursor
  transitório em ciano, respeitando zoom, espelhamento e o dono do gesto.
- `CaseImageAngleCreationControls` oferece Novo ângulo, Posicionar no centro e
  Cancelar criação, no padrão compacto do menu do quadro. O posicionamento
  central funciona pelo botão nativo ou Enter no visualizador, sem repetição
  automática da tecla, e conserva o UUID/nome existentes durante os três passos.
- O progresso `1/3 → 2/3 → 3/3`, as instruções por ponto, tooltips e orientação
  de teclado estão em pt-BR/en. O foco retorna ao visualizador ao entrar,
  posicionar no centro ou cancelar. A mensagem de lista vazia não encobre a
  criação parcial; um objeto completo passa à apresentação local já existente.
- Escape cancela somente a prévia do gesto e preserva pontos confirmados.
  Cancelar criação descarta o rascunho explicitamente. Nenhum desses caminhos
  altera os objetos salvos, a linha de Distância ou a referência de calibração.
  Posicionar pontos não chama o writer, PUT ou outra gravação automática.

**Limite:** handlers de entrada e controles locais foram conectados ao estado
ativo existente. O catálogo continua sem permitir iniciar Ângulo quando ainda
inativo, preservando a habilitação pública prevista após as etapas 9/10. Prévia
numérica, menu final de ajuste e ações flutuantes de salvar/atualizar seguem nas
etapas 8/9; nenhum fluxo incompleto foi declarado habilitado no produto.

**Aceite manual pendente:** três cliques/toques, soltura fora da imagem,
cancelamento/perda de captura, repetição rápida de eventos, pontos coincidentes,
Enter mantido pressionado, posicionamento central por botão/teclado, retomada do
rascunho, Novo ângulo e seleção com zero/um/múltiplos objetos. Nenhum teste
automatizado ou gravação na API foi executado nesta etapa.

**Revisão de conclusão:** verificação estática de tipos do web aprovada;
`git diff --check`, leitura dos JSONs e equivalência das chaves de colocação em
pt-BR/en aprovados. Foram revisados os quatro itens previstos, a estabilidade
de UUID/nome, os guards de passo/contexto, o Enter sem repetição, o cancelamento
e a separação dos ramos de calibração/Distância. A validação funcional manual
continua pendente; não foi declarada concluída por estas verificações estáticas.

### 8. Ajustar geometria e prévia em tempo real

- Permitir mover o conjunto e ajustar inicial, vértice e final por alças/setas;
  Shift amplia o passo, respeitando limites e espelhamento da matriz original.
- Em imagem retangular, converter cada eixo para pixels originais antes de
  renderizar os segmentos e alças. A base do cálculo da prévia deve ser a
  confirmada na etapa 0: diferenças de coordenadas normalizadas. Não trocar
  essa fórmula por cálculo em pixels ou coordenadas físicas só no frontend.
- Preservar os bloqueios existentes de DICOM anisotrópico. A fonte conferida
  não corrige fisicamente o ângulo com espaçamento de pixels; registrar essa
  limitação na validação do produto.
- Implementar a convenção confirmada na etapa 0, protegendo braços nulos e
  imprecisão numérica. Arco e prévia devem usar a mesma convenção do backend.
- Atualizar valor na imagem e etiqueta durante o gesto, sem substituir o
  derivado persistido. Ao cancelar, restaurar geometria/valor anteriores.

**Entrega:** ajuste completo dos três pontos e prévia identificada como local.
**Aceite:** zoom/pan não mudam os graus; gestos atrasados não alteram outro alvo.

#### Entrega da etapa 8 — 05/11/2026

- `angle-preview.ts` calcula somente a prévia de apresentação, seguindo
  `atan2(abs(cross), dot)` em coordenadas normalizadas. Dimensões, escala de
  calibração, pan, zoom e espelhamento não entram na fórmula. O resultado
  persistido continua vindo de `measurement.values.angle` do backend.
- `normalizedAngleRotation` compartilha a base do cálculo com o arco auxiliar.
  Pontos fora da matriz normalizada, valores não finitos, braços nulos e
  produtos que sofrem underflow não geram graus inventados. Ângulos válidos
  de 0°/180° continuam aceitos; o arredondamento ocorre só na apresentação.
- A imagem e a lista compacta recebem a mesma prévia, identificada por `≈` e
  descrição acessível de valor local. A geometria incompleta não produz valor;
  os bloqueios de dimensões, calibração confirmada, revisão/contexto e DICOM
  anisotrópico permanecem. Prévia não entra no comando nem substitui o derivado.
- Alças ajustam os três pontos e segmentos movem o conjunto. As setas ajustam
  a parte selecionada em pixels originais; Shift amplia o passo. No visualizador,
  1 seleciona o conjunto, 2 o início, 3 o vértice e 4 o final, com instruções
  em pt-BR/en. Os limites consideram os três pontos e o espelhamento da imagem.
- Durante um arraste que passa por um braço nulo, a última geometria válida
  permanece visível. Soltar em posição inválida não confirma esse gesto.
  Escape, perda de captura, blur e cancelamento retiram a prévia transitória,
  restaurando a geometria e o valor anteriores ao gesto. Alterações locais já
  confirmadas por outros gestos continuam no rascunho, até seu descarte explícito.
- O dono da prévia inclui QueryClient, caso/imagem, UUID, revisão, geometria
  base e geração do contexto. O visualizador também invalida o gesto quando
  mudam as condições de interação. Eventos antigos não são aplicados ao novo alvo.

**Limite:** esta etapa completa o ajuste local; menu final, salvar/cancelar,
olhinho e exclusão continuam nas etapas 9/10. O catálogo público permanece
desabilitado. Não foi executado teste automatizado nem gravação na API;
o aceite funcional permanece manual. A diferença entre o ângulo normalizado
do backend e o ângulo visual em pixels de uma matriz retangular continua
documentada, sem compensação física DICOM presumida no frontend.

**Revisão de conclusão:** verificação estática de TypeScript do web aprovada,
JSONs pt-BR/en legíveis e chaves de Ângulo equivalentes, além de
`git diff --check` sem erros. Foram revisados os cinco itens previstos:
ajuste dos três pontos/conjunto, conversão para renderização, bloqueios DICOM,
convenção/proteções numéricas e prévia/cancelamento. Essas verificações não
substituem o aceite funcional manual pendente.

### 9. Ligar catálogo, menu e salvamento

- Completar a entrada pelo catálogo e a edição usando a seleção ativa preparada
  para a leitura de Distância/Ângulo na etapa 6. Só a camada da ferramenta ativa
  aparece em Ferramentas → Medidas.
- Manter Ferramentas disponível durante gravação/conferência de Ângulo;
  recibo pendente não equivale a perda da calibração confirmada.
- Reutilizar o padrão visual atual; Ajustes expande só sua linha, com três
  ações de ponto lado a lado. Olhinho controla somente o valor angular local.
- Adicionar preferência própria de visibilidade no cache de apresentação;
  não alterar `PlanAngle.visible` nem a preferência de Distância.
- Conectar salvar/atualizar, cancelamento, Sonner, foco e recuperação de Ângulo.
  X/check aparecem após o ajuste parar; não acompanham o arraste.
- Concluir a ligação sem habilitar o catálogo público antes da etapa 10.
  Calibração continua encaminhando para Distância.

**Entrega:** criação/leitura/edição/gravação ligadas, aguardando a exclusão.
**Aceite:** o fluxo está preparado para restaurar os três pontos e o resultado
oficial ao reabrir; a habilitação e a validação real vêm nas próximas etapas.

#### Entrega da etapa 9 — 05/11/2026

- `CaseImageAngleToolbar` conecta mover, seleção dos três pontos e novo ângulo.
  O menu segue a largura e a cor do visualizador; apenas Ajustes expande sua
  linha, com animação e respeito a movimento reduzido. O CSS da expansão é
  compartilhado com Distância em `viewer-point-adjustments.module.css`, com
  largura própria para os três pontos. Ocultos não recebem foco; Escape fecha
  a expansão e devolve foco ao acionador.
- O teclado nos botões usa o mesmo helper do visualizador, com limites em
  pixels originais, espelhamento e Shift. Iniciar a edição do ângulo selecionado
  ou trocar a parte ajustada não revela as ações enquanto a seta estiver pressionada.
- `hiddenAngleValues` fica no cache de apresentação por QueryClient/caso/imagem.
  O olhinho afeta somente o texto em graus na imagem, inclusive a prévia;
  segmentos, arco e lista permanecem. Não altera `PlanAngle.visible`, payload,
  calibração ou a preferência de Distância. UUIDs são comparados sem distinguir caixa.
- `CaseImageAngleActions` usa X/check compactos junto do ponto em ajuste
  (vértice ao mover o conjunto). Aparece com rascunho alterado ou recuperação,
  fora do menu principal e oculto durante arraste/setas. O posicionamento usa
  o quadro, mantém tamanho visual e acompanha espelhamento/pan/fullscreen.
- `useAngleSaveActions` fica montado enquanto o writer confirma e limpa o
  rascunho. Salvar/atualizar usa `angle.submit` e o writer/revisão existentes;
  conferir delega à recuperação por GET. Há bloqueio de envio repetido, Sonner
  e retorno de foco à seleção após confirmação, com proteção de contexto.
- Falhas definitivas preservam o rascunho; conflito exige descarte explícito.
  Resultado incerto ou recibo saving/checking remontado sem requisição ativa
  oferece conferência, sem repetir PUT. Cancelar respeita o lock do writer e
  preserva o plano salvo. Falha de leitura oferece GET sem descartar o ajuste.
- A entrada do catálogo retoma a seleção/edição já preparada, mantendo Ângulo
  destacado e somente sua camada em Medidas. Ferramentas permanece acessível
  durante gravação/recuperação; calibração continua encaminhando a Distância.

**Limite:** a lixeira com confirmação e a habilitação de Ângulo quando inativo
permanecem na etapa 10. Nenhum teste funcional/automatizado ou gravação na API
foi executado nesta entrega. Ajustes e aceite no navegador ficam para depois
da integração completa, conforme solicitado.

**Revisão de conclusão:** TypeScript do web sem erros, JSONs pt-BR/en legíveis
e chaves de Ângulo equivalentes; `git diff --check` aprovado. Revisados os seis
itens da etapa, incluindo acesso/seleção existentes, disponibilidade de
Ferramentas durante recibos pendentes, expansão/foco, preferência independente,
salvamento/cancelamento/recuperação e preservação do encaminhamento a Distância.
Sem execução de testes funcionais/automatizados ou gravações na API.

### 10. Integrar exclusão com confirmação

- Conectar lixeira ao `angle-delete`, capturando alvo e revisão observados.
- Confirmar antes de descartar ajustes locais; preservar o objeto enquanto
  aguarda resposta e remover da UI somente após confirmação.
- Respeitar objeto bloqueado, conflito e exclusão já observada em outro lugar.
  Resposta incerta mantém somente conferência por GET, sem repetir PUT.
- Habilitar Ângulo no catálogo após concluir criação, leitura, edição, gravação
  e exclusão; iniciar a jornada de aceite manual da etapa 11.

**Entrega:** excluir ANGLE sem afetar Distância, escala ou outros objetos.
**Aceite:** cancelar exclusão preserva o rascunho e excluir/reabrir confirma ausência.

#### Entrega da etapa 10 — 05/11/2026

- A lixeira de `CaseImageAngleToolbar` abre `CaseImageAngleDeleteDialog`.
  `useAngleDeletion` captura UUID, revisão, rascunho e dono da query por
  organização/caso/imagem. Abrir ou cancelar a confirmação inicial não altera os
  pontos locais, o plano nem o recibo de salvamento.
- Confirmar permite substituir somente a edição do mesmo ANGLE pelo comando
  `angle-delete`, com revisão e snapshot do rascunho ainda correspondentes.
  O diálogo informa sobre os ajustes não salvos antes desse descarte. Se o
  rascunho mudou após abrir o diálogo, é necessário cancelar e reabrir.
- A exclusão usa o writer e o PATCH/BFF existentes, que removem só o alvo no
  PUT do plano com `base_revision`. O objeto salvo permanece desenhado/listado
  enquanto a escrita aguarda confirmação. Calibração, LINE e outros objetos
  continuam sob o mesmo merge restrito; não existe endpoint novo de DELETE.
- Alvos bloqueados, IDs ambíguos, outro rascunho, leitura falha, revisão nova,
  contexto antigo e exclusão de imagem/caso impedem uma escrita indevida.
  Conflito conserva a intenção; carregar salvo exige decisão explícita e não
  reaplica a exclusão sobre uma revisão nova.
- Resposta incerta e recibo saving/checking remontado sem writer ativo oferecem
  somente conferência por GET. Uma ausência observada em revisão posterior é
  informada como remoção já existente, sem novo PUT nem atribuição de autoria.
  Erro definitivo admite ação explícita; não há repetição automática.
- O diálogo usa o DS, nomes/mensagens pt-BR/en, bloqueio durante operação e
  retorno de foco. Seu portal acompanha o elemento fullscreen para continuar
  acessível em tela cheia. Confirmar remoção retorna à seleção/estado vazio de
  Ângulo, sem iniciar outra criação automaticamente.
- Ângulo está habilitado em Ferramentas → Medidas. Sem salvo inicia os três
  pontos; com um salvo retoma edição/seleção e, com vários, exige seleção.
  Só Novo ângulo inicia uma criação adicional. Círculo e Medidas adicionais
  continuam desabilitados; calibrar/recalibrar continua encaminhando a Distância.

**Limite:** o código está integrado e habilitado, mas criação/edição/exclusão
com API real e os ajustes visuais ainda aguardam a etapa 11. Nenhum teste
funcional/automatizado ou gravação clínica foi executado nesta implementação.

**Revisão de conclusão:** verificação estática de TypeScript do web aprovada
após a ligação final; JSONs pt-BR/en legíveis e chaves de Ângulo equivalentes;
`git diff --check` sem erros. Revisados os quatro itens previstos, a substituição
do rascunho só após confirmação, alvo/revisão/contexto, retenção do objeto
pendente, retomada por GET, diálogo/foco/fullscreen e habilitação do catálogo.
Aceite com API real permanece pendente; não foi presumido por esses checks.

#### Complemento de 06/11/2026 — Definir ângulo

A ação no menu do quadro oferece 30°, 45°, 60°, 90°, 135° e 180° em uma faixa
horizontal compacta que desliza na linha do ícone. Selecionar um valor atualiza
o rascunho e retorna o foco ao ponto final, dentro do fluxo de prévia e check.

`angleWithDegrees` mantém o vértice e o ponto inicial e rotaciona o braço final
na base normalizada da API. Conserva o lado atual da abertura quando definido
e o comprimento normalizado do braço quando cabe na matriz. Perto da borda,
encurta o braço ao longo da direção escolhida. Uma direção inviável ou uma
geometria que perde precisão recebe recusa local com instrução para reposicionar.
Os limites são avaliados antes de aceitar os novos pontos.

O Swagger público foi consultado novamente em 06/11 e continua anunciando
`protese`/`ea242ce`, versão `0.9.0`. A fonte dessa revisão confirma
`degrees(atan2(abs(cross), dot))` com diferenças normalizadas de x/y. A prévia
reavalia a geometria construída com essa mesma convenção e aceita desvio
numérico de até `1e-8` grau na construção. O resultado oficial continua vindo
dos pontos recalculados pela API após salvar. [Fórmula do backend](https://github.com/alexbastos/vetorthoplan_backend/blob/ea242ce971412f371c8004d64630289055b53ad4/src/vetorthoplan/domain/planning/measurements.py).

O comando conserva UUID, revisão e os três pontos do ANGLE. As condições de
edição, recuperação e seleção são as de `useImageAngle`. A faixa usa os botões
escuros do visualizador, a animação compartilhada de Ajustes, mensagens pt-BR/en
e movimento reduzido. Uma linha expande por vez. Escape fecha a faixa e devolve
foco ao ícone, e valores recolhidos ficam fora do foco. Falhas aparecem no Sonner.
Em imagens retangulares, o valor normalizado pode diferir do ângulo visual em
pixels, conforme a limitação da fórmula publicada já registrada na etapa 0.

Revisão estática de TypeScript aprovada. Aceite funcional e conferência do
resultado salvo para os atalhos seguem na etapa 11.

### 11. Concluir o aceite manual de ponta a ponta

- Validar a matriz abaixo no navegador, com API real e dados sintéticos ou
  desidentificados, e registrar os resultados e pendências neste plano.
- Conferir que o resultado oficial corresponde à convenção da etapa 0 e que
  o exemplo real de resposta está identificado, sem cookies/tokens/dados pessoais.
- Atualizar README da feature e status da integração somente com o que foi entregue.

**Entrega:** integração pronta para aceite, com resultado real e jornada revisados.
**Aceite:** não declarar concluída a ferramenta com derivado presumido, operação
pendente ou cenário obrigatório ainda não validado.

## Matriz de validação manual

| Área | Verificar |
| --- | --- |
| Geometria | Três pontos, imagem retangular, limites da imagem, braços nulos, pontos colineares, convenção angular e base física DICOM confirmadas. |
| Definir ângulo | Seis atalhos, expansão lateral, foco/Escape, movimento reduzido, 180°, abertura nos dois sentidos, vértice/início fixos, borda e direção inviável, espelhamento/fullscreen, cancelar e resultado oficial após salvar/reabrir. |
| Criação e edição | Três cliques/toques, teclado, mover conjunto/vértice/extremidades, clique repetido, seleção sobreposta e criação explícita adicional. |
| Resultado | Valor oficial em graus, prévia dinâmica, ausência/obsolescência do derivado e retomada após cancelar. |
| Persistência | Salvar, reabrir caso/imagem, editar mesmo UUID, recalibrar e excluir ANGLE. |
| Exclusão | Cancelar confirmação preserva ajustes; confirmar descarta somente a edição do alvo; manter objeto enquanto pendente; bloqueado, rascunho alterado no diálogo, ausência já observada, incerteza por GET e foco/tela cheia. |
| Integridade | LINE/calibração e outros objetos preservados; bloqueados/ocultos, IDs repetidos e limite global de 500 objetos. |
| Concorrência | Distância × Ângulo × calibração/qualidade; duas abas, revisão nova e duplo clique em salvar. |
| Recuperação | Falha definitiva, resposta perdida, conferência por GET, conflito e remontagem com retorno à ferramenta correta. |
| Navegação | Editor limpo/sujo, saída, troca de painel/imagem/caso/organização, exclusão de imagem/caso e callbacks antigos. |
| Apresentação | Ciano, tooltips, expansão animada, X/check discretos e ocultos durante interação, olhinho independente, claro/escuro e pt-BR/en. |
| Visualizador | Pan, zoom, espelhamento, fullscreen, resize, movimento reduzido e regressão de calibração/Distância. |

Não executar testes automatizados nem gravar dados na API durante o planejamento.
A validação funcional será manual, conforme solicitado. Revisão de código e de
tipos acompanha cada etapa; verificações não executadas não devem ser dadas como aprovadas.

## Próxima execução

Continuar pela **etapa 11**, com o aceite manual completo pelo usuário e o
registro dos resultados e ajustes encontrados na jornada.
Preservar a separação entre prévia local e resultado oficial, a diferença de
base geométrica documentada e o aceite funcional real pendente.
Ângulo já está habilitado após a etapa 10; não declarar aceite funcional antes
de validar os cenários obrigatórios com a API real.
