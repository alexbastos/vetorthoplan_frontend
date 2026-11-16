# Plano de implementação — Distância

Status: etapas 1 a 10 concluídas; etapa 0 com evidência executável pendente.
BFF, serviço, gravação/recuperação, estado de edição, proteções do workspace e
interface do visualizador habilitados para Distância. Medidas salvas e resultados
oficiais já aparecem no painel e na imagem. O catálogo Distância edita a linha
salva, sem iniciar outra criação. A primeira calibração cria essa linha na mesma
gravação; recalibrar atualiza a linha identificada e abre Ferramentas → Medidas → Distância.
Rascunhos de criação anteriores continuam recuperáveis. Ajustes são gravados por
Salvar/Atualizar, com feedback e recuperação na UI.
Exclusão com confirmação está integrada. O aceite completo permanece na etapa 11.
Base: contrato clínico e arquitetura local conferidos em 28/10/2026.

Compatibilidade revalidada em 29/10/2026 antes da etapa 8: o Swagger manteve
`0.9.0`, mas adicionou apresentação do plano e flags `visible`/`locked` dos
objetos (branch/revisão informadas: `protese`/`ea242ce`). Snapshot, SDK e schemas
foram atualizados; a calibração voltou a carregar no caso do usuário. Novos
campos são preservados no PUT, linhas ocultas não aparecem e alvos bloqueados
recusam edição/exclusão. Geometria e resultado declarado da distância/calibração
não mudaram; isso não substitui a evidência executável pendente da etapa 0.

## Resultado esperado

No painel Ferramentas → Medidas, **Distância** edita a linha persistida pelo
salvamento da calibração. O profissional ajusta suas extremidades ou posição e
salva explicitamente; o catálogo não oferece criação livre de outra linha.
A API devolve a distância oficial em milímetros. A medida reaparece ao reabrir
a ferramenta. Planos antigos com várias linhas permitem seleção explícita e
edição de uma por vez, preservando os demais objetos ao editar ou excluir.

Ferramentas mantém o comportamento atual: com calibração confirmada, abre o
painel; sem calibração, seu acesso inicia a calibração. Cada radiografia tem
sua própria escala. Calibrar e medir distância são ações diferentes.
Ao concluir a calibração ou recalibração, Ferramentas → Medidas → Distância abre
automaticamente com a linha identificada. A distância permanece um objeto
independente: alterá-la ou excluí-la não altera a referência nem a escala.
O marcador circular fica restrito à calibração; sua ferramenta de medição
terá uma entrega específica.

## Escopo da primeira entrega

- Persistir a linha junto da calibração; selecionar, mover, ajustar, salvar e
  excluir objetos `LINE`, sem criação adicional pelo catálogo de ferramentas.
- Lista compacta das distâncias, seleção única e rascunho de uma operação por vez.
- Nome inicial persistido, por exemplo “Distância 1”, sem colisão com os nomes
  existentes. Renomeação livre pode ser adicionada depois.
- Salvamento explícito por medida; cancelar desfaz somente o rascunho atual.
- Exibir linhas salvas somente em Ferramentas → Medidas com Distância ativa;
  outros painéis as ocultam sem descartar rascunhos ou dados persistidos.
- Interação por ponteiro, toque e teclado; temas claro/escuro e traduções pt-BR/en.

Ângulo, círculo de medição, medidas anatômicas, simulação, implantes, autosave,
undo/redo e edição em lote ficam para suas próprias entregas. Não introduzir
biblioteca gráfica ou estado global novo para Distância.

## Arquitetura a seguir

Os caminhos desta seção são relativos a `apps/web/src/`.

| Responsabilidade | Base existente | Extensão prevista |
| --- | --- | --- |
| Contrato e validação | `features/cases/schemas/image-plan.schema.ts` e `image-plan-command.schema.ts` | Entradas específicas de distância, sem aceitar resultados do navegador. |
| Persistência BFF | `lib/server/image-plan-bff.ts` e `app/api/cases/[caseId]/images/[imageId]/plan/edits/route.ts` | Reutilizar PATCH de comandos, leitura atual, merge permitido e PUT clínico completo. |
| Transporte do navegador | `features/cases/services/image-plan-api.ts` | Reutilizar `saveImagePlanEdit`; validar reconhecimento do comando. |
| Coordenação de gravação | `features/cases/lib/image-plan-saving.ts` e `calibration-save-state.ts` | Mesmo recibo, lock e revisão por imagem; acrescentar identidade de cada tipo de comando. |
| Estado de edição | `features/cases/hooks/use-workspace-draft.ts` e `cases-query-keys.ts` | Rascunho em memória, isolado por organização/caso/imagem. |
| Interação e geometria | `features/cases/lib/line-marker-interaction.ts` e `image-coordinate-map.ts` | Reaproveitar matemática; separar o marcador de calibração do objeto de distância. |
| Apresentação | `features/cases/components/case-image-viewer.tsx`, `case-preview-panel.tsx` e `case-image-tools-panel.tsx` | Camada de distâncias, editor ativo e painel compacto. |
| Orquestração | `features/cases/components/case-image-workspace.tsx` | Conectar painel, visualizador, rascunho, gravação e proteção de saída. |

O fluxo permanece:

```text
Ferramentas / visualizador
  → hook de distância + rascunho em memória
  → coordenador compartilhado de gravação
  → serviço same-origin → PATCH /plan/edits
  → BFF autentica, valida imagem/caso, escala e revisão
  → aplica somente o comando sobre o documento atual
  → PUT clínico com base_revision
  → valida resposta → atualiza cache → apresenta resultado oficial
```

Não usar os adapters legados em memória para simular persistência no produto.
Os nomes de novos arquivos abaixo são propostos; seguir os diretórios e
convenções da feature, sem criar uma arquitetura paralela.

## Regras que todas as etapas devem preservar

1. Coordenadas persistidas são normalizadas em `[0, 1]`, inclusivas. Geometria
   usa largura e altura originais, independentemente da resolução da prévia.
2. Zoom, pan, espelhamento, fullscreen e resize alteram apresentação, nunca
   os pontos persistidos. Converter cada eixo com sua dimensão correspondente.
3. O navegador envia intenção e geometria. Resultado, unidade e vínculo da
   medição à calibração são conferidos na resposta do backend.
4. Nenhum valor de uma geometria anterior deve aparecer como resultado atual
   durante edição. Uma edição ainda limpa mantém o resultado oficial visível.
   Durante arraste ou depois de alterar pontos, mostrar uma prévia separada usando
   a escala persistida da API e os pixels originais. Essa prévia não é um resultado
   clínico salvo; o valor oficial continua vindo da confirmação do backend.
5. Um rascunho ativo e um comando de gravação por imagem. Calibração, qualidade
   interna e distância compartilham revisão, lock e recuperação.
6. O BFF preserva calibração, outros objetos, metadados TPLO, resultados,
   revisão clínica e auditoria fora do alvo do comando. A API pode recalcular
   derivados ou recusar uma alteração; o front não apaga aprovação para forçá-la.
7. Conflito conserva o rascunho, sem rebase ou replay automático. Timeout ou
   resposta inválida após escrita permitem apenas GET de conferência.
8. UUID do objeto nasce ao iniciar sua criação e permanece no rascunho e no
   recibo. Retry/conferência não geram outra linha nem outro identificador.
9. Não persistir dados clínicos, rascunhos ou URLs assinadas em storage do navegador.
10. Limite de 500 objetos vale para o conjunto inteiro, incluindo outros tipos.
    Na V1, estender aos comandos de distância as restrições de dimensões e
    anisotropia já usadas na calibração. Esses preflights ainda não existem
    para edições genéricas no BFF; são uma política desta entrega. Imagem
    não pronta ou indisponível mantém os bloqueios existentes.

## Etapas de execução

Executar em ordem. Cada etapa tem uma entrega pequena e sua verificação;
marcar como concluída somente após cumprir o aceite. Etapas intermediárias
podem entregar infraestrutura, sem expor uma ação incompleta ao usuário.

### 0. Fixar a evidência do resultado de distância

- Conferir `PlanLine`, `PlanDerivedMeasurement` e GET/PUT do plano.
- Obter exemplo reproduzível do backend para uma linha calibrada: nome exato
  da chave em `measurement.values`, unidade em `units`, `calibration_id`,
  precisão e comportamento para linha degenerada e IDs duplicados. Confirmar
  que o UUID enviado pelo cliente é preservado e se a geometria é normalizada
  ou arredondada na resposta, para definir o reconhecimento sem suposições.
- Registrar também a resposta após recalibração e os estados sem escala/sem
  dimensões. A captura deve identificar sua origem; não transformar um mock
  em evidência de resultado real nem sobrescrever a evidência de calibração.
- Validar exemplos horizontais, verticais e diagonais em imagem retangular.

**Entrega:** fixture de distância identificada e decisões de contrato nesta
seção. O Swagger atual deixa `values`/`units` como mapas e não define o nome
da chave de comprimento. Não assumir `length_mm` nem escolher o primeiro valor.

**Aceite:** testes conseguem localizar e validar o resultado correto com base
em evidência. Se a origem necessária estiver indisponível, deixar essa decisão
pendente e avançar somente nas partes que não dependem dela.

#### Conferência realizada e foco da integração

O trabalho desta etapa é preparar a conexão da ferramenta com o fluxo já
existente de plano. Não exige alterar o backend ou instalar suas dependências
no frontend. A execução isolada de validadores do backend foi interrompida;
nenhuma dependência foi instalada nem código do produto alterado.

Conferido por leitura do código da branch `calibration`, commit
`67cf7d1eb37c1e46409adafbed5636479349308f`:

- Entrada: objeto `LINE` com `id`, `start`, `end` e `label` opcional dentro de
  `document.objects`; o PUT recebe `base_revision` e o documento completo.
- Saída calculada: `measurement.status === "CALCULATED"`, comprimento em
  `measurement.values.length`, unidade em `measurement.units.length === "mm"`
  e vínculo em `measurement.calibration_id`.
- Cálculo usa cada dimensão original antes da distância euclidiana; não usa
  pixels da prévia nem arredonda o comprimento para apresentação.
- O derivado enviado pelo cliente é descartado e recalculado ao salvar.
  Recalibrar mantém a geometria e recalcula comprimento e fingerprint.
- Sem referência: `CALIBRATION_REQUIRED`; com referência e sem dimensões:
  `IMAGE_DIMENSIONS_REQUIRED`, ambos com mapas de valores/unidades vazios.
- `PlanLine.validate_length` rejeita extremidades coincidentes; essa regra
  existe no código do backend, embora não apareça no OpenAPI.
- O UUID e os pontos são recebidos do cliente e mantidos pelo fluxo de
  serialização/derivação inspecionado; não há geração de outro ID de linha.
- O `PlanDocument` inspecionado não impõe unicidade de IDs em `objects`.
  A integração deve rejeitar alvos ambíguos e criação com ID já existente.

Fontes: `src/vetorthoplan/api/schemas.py`, `api/routes/plans.py`,
`domain/planning/measurements.py` e `application/use_cases/image_plans.py`
no commit acima. A referência remota foi atualizada sem checkout ou alteração
dos arquivos do backend. O OpenAPI público foi reconferido e continua com o
SHA-256 `19d3dea7cfa28cb72d7026138e40972a833b6395463f429b3d49d47633f675b3`.

Essa leitura confirma o formato a usar na integração; não é uma execução
autenticada do servidor publicado. A fixture executável e os exemplos
calculados desta etapa ainda estão pendentes. Podemos avançar nos comandos
restritos e na conexão BFF sem instalar o backend, preservando essa pendência
até a validação do resultado real.

### 1. Definir os comandos e as operações puras

- Acrescentar três comandos discriminados em `image-plan-command.schema.ts`:
  `distance-create`, `distance-update` e `distance-delete`, todos com
  `baseRevision`; criação recebe `id`, `start`, `end`, `label`; atualização
  recebe `id`, `start`, `end`; exclusão recebe somente `id`.
- Reutilizar/exportar schemas de ponto e entrada de linha onde fizer sentido.
  Separar o schema de qualidade existente da união para preservar seus usos
  de `.shape` sem duplicação ou quebra dos consumidores atuais.
- Rejeitar resultado forjado, campos desconhecidos, coordenadas inválidas,
  extremos coincidentes, revisão inválida e UUID inválido.
  Rejeitar extremos coincidentes segue o validador do backend conferido na
  etapa 0; o OpenAPI não expressa essa restrição. Um limiar visual de gesto
  não vira regra clínica em pixels.
- Acrescentar aplicação pura e comparação de intenção: criar exige ID ausente
  e espaço; atualizar/excluir exigem exatamente um objeto do tipo `LINE` com
  aquele ID. Não converter outro tipo de objeto em linha.

**Entrega:** comandos e funções de merge verificáveis sem React ou HTTP.

**Aceite:** criar acrescenta um objeto; atualizar preserva seu ID, nome,
posição na lista e demais objetos; excluir remove somente o alvo. Plano com
IDs ambíguos falha antes de escrever. Recalcular/remover o derivado antigo do
alvo no payload conforme o contrato confirmado; nunca aceitar um derivado novo
do navegador.

#### Entrega da etapa 1

- Comandos `distance-create`, `distance-update` e `distance-delete` definidos
  em `image-plan-command.schema.ts`, com união discriminada e campos estritos.
- `PlanPointSchema` e `PlanLineInputSchema` reutilizáveis; entradas exigem
  coordenadas finitas, bordas inclusivas e extremidades distintas. IDs dos
  comandos são normalizados para minúsculas, sem arredondar os pontos.
- Aplicação pura preserva o documento e os demais objetos; update mantém
  nome, ID e posição, removendo somente o resultado antigo da linha alterada.
- Colisões/duplicatas de IDs, alvo ausente/de outro tipo e capacidade excedida
  são recusados com `ZodError`, antes de qualquer escrita.
- Reconhecimento compara alvo/geometria e, na criação, nome; não exige
  medição calculada para reconhecer que a geometria foi salva.
- Schema/tipo de qualidade separados da união para preservar os consumidores
  existentes. Ao concluir esta etapa, writer, serviço e BFF permaneciam restritos
  à qualidade; a habilitação do BFF está registrada na etapa 2. O schema de
  leitura de planos mantém a compatibilidade anterior.
- Testes novos em `apps/web/test/distance-plan-commands.test.mjs` e proteção
  da rota/serviço/writer em `image-plan-commands.test.mjs`. As entradas e
  medições desses testes são sintéticas, sem atribuição a execução do backend.

Verificação: 74 testes dirigidos e os 438 testes da suíte completa passaram;
typecheck web e verificador do contrato clínico passaram. Revisão independente
não encontrou regressão ativa. O lint dos arquivos TS continua impedido pelo
parsing da configuração existente.

### 2. Integrar os comandos no BFF

- Estender `image-plan-bff.ts` e a rota PATCH existente, sem criar endpoint
  clínico de distância nem liberar PUT arbitrário ao navegador.
- Conferir imagem/caso, prontidão, dimensões, anisotropia, calibração com
  resultado e revisão também no servidor, antes de modificar o documento.
- Manter autenticação, contexto de organização, origem, JSON e limites de
  corpo. Preservar o limite atual da qualidade e limitar cada comando de
  distância a 4 KiB dentro da rota; calibração mantém sua rota e limite atuais.
- Tratar `ZodError` de aplicação do comando como recusa definitiva de validação
  antes do PUT; o catch genérico atual não deve convertê-lo em indisponibilidade
  503. Acrescentar testes de ausência de HTTP para cada recusa semântica.
- Confirmar imagem, revisão seguinte e efeito exato do comando na resposta.
  Separar reconhecimento da geometria salva da disponibilidade do resultado:
  `measurement` ausente/nulo ou com estado de requisito é permitido pelo contrato.
  Isso não desfaz uma gravação válida nem a transforma em escrita incerta.

**Entrega:** criação, alteração e remoção por HTTP simulado na rota real.

**Aceite:** payload inválido não gera PUT; conflito não sobrescreve nada;
campos fora do comando são preservados. Resposta de escrita incoerente tem
tratamento de resultado incerto, nunca confirmação de sucesso.

#### Entrega da etapa 2

- `saveImagePlanEditForBff` aceita os três comandos de distância e conserva o
  comando interno de qualidade. Distância exige imagem do caso, estado READY,
  dimensões originais, geometria suportada, revisão atual e resultado de
  calibração persistido. Os mesmos preflights se aplicam à exclusão na V1.
- Falta de escala retorna `409 CALIBRATION_REQUIRED`, definitivo. A allowlist
  do serviço reconhece o código. Ao concluir esta etapa, sua entrada de gravação
  ainda era restrita à qualidade; os comandos foram habilitados na etapa 3.
- Aplicação local inválida retorna `400 VALIDATION_ERROR`, sem PUT. Plano
  upstream com IDs duplicados retorna `502 INVALID_RESPONSE`, sem PUT; não
  atribuir essa ambiguidade ao payload do usuário.
- PATCH limita cada distância a 4 KiB de bytes UTF-8 efetivamente recebidos,
  incluindo whitespace. Qualidade mantém 12 KiB e calibração seu limite próprio.
  Autenticação, organização, origem, JSON e no-store permanecem no wrapper atual.
- Sucesso confirma imagem, revisão seguinte e efeito do comando. Medição
  ausente/nula continua compatível com geometria salva; dado malformado,
  reconhecimento incompatível ou falha após PUT mantêm resultado incerto.
- `distance-plan-bff.test.mjs` verifica preflights, integridade, recusas,
  resposta ambígua, rota real e limites de bytes. `image-plan-bff.test.mjs`
  exercita create/update/delete com JWT de organização, via HTTP simulado,
  inclusive recusa de contexto divergente.

Verificação desta etapa: **59 testes direcionados passaram** e o typecheck web
passou. A revisão independente apontou a classificação de IDs duplicados do
upstream, corrigida e coberta por teste. Nenhuma requisição clínica real foi
enviada; os resultados HTTP de distância usados aqui são sintéticos.
Conforme combinado, a suíte completa e o teste real da jornada ficam para o
encerramento das etapas.

### 3. Estender recibos e recuperação compartilhados

- Adaptar `image-plan-api.ts`, `image-plan-saving.ts` e os tipos do recibo
  para reconhecer cada comando de distância sem quebrar calibração/qualidade.
- Comparar a identidade do comando por tipo e alvo; a distinção atual
  “possui kind ou não” deixa de ser suficiente com vários comandos de edição.
- Deduplicar clique duplo idêntico e recusar intenção diferente enquanto houver
  operação pendente. Uma área não pode conferir/descartar o recibo de outra.
  Uma tentativa diferente nunca substitui o recibo incerto nem envia escrita;
  sua ferramenta de origem mantém a ação de conferência por GET disponível.
- Reconhecer create/update por ID e geometria confirmados; delete pela ausência
  do alvo em revisão posterior. Disponibilidade/validade do número é um estado
  de apresentação separado: geometria salva pode estar sem resultado disponível.

**Entrega:** mesmo mecanismo de single writer para todas as ferramentas.

**Aceite:** resposta perdida gera GET, sem repetir PATCH/PUT. Revisão inalterada
continua incerta; revisão posterior incompatível vira conflito; intenção
confirmada limpa somente o rascunho correspondente. A ausência após delete
confirma o estado desejado, sem alegar autoria da exclusão.

#### Entrega da etapa 3

- `saveImagePlanEdit` e `requestPlanEditSave` aceitam a união de comandos,
  normalizam a entrada e enviam Distância pelo PATCH same-origin existente.
  Identidade, próxima revisão e efeito retornado continuam validados.
- O coordenador distingue o owner por tipo de comando e ID do objeto. Um
  comando pendente idêntico compartilha a promessa; outro tipo, alvo ou payload
  em curso é recusado sem substituir o recibo ou enviar nova escrita.
- Em resultado incerto, uma nova intenção do mesmo owner só confere a intenção
  originalmente enviada. Criar/atualizar exige ID e geometria correspondentes;
  excluir exige ausência do alvo em revisão posterior. GET sem revisão nova
  permanece incerto; revisão posterior incompatível gera conflito.
- `checkImagePlanSave(client, identity, expectedCommand, options)` exige o
  comando capturado e fase que realmente precise de conferência. A validação
  é repetida ao iniciar a operação, cobrindo troca de recibo entre eventos.
- `discardPlanEditSave(client, identity, expectedEdit)` descarta somente o
  comando exato em erro/conflito. Não descarta escrita em curso ou incerta e
  não permite que uma tela antiga limpe o recibo de outro editor/objeto.
- Rascunhos brutos de qualidade e calibração bloqueiam novas distâncias.
  A limpeza dos rascunhos existentes continua específica ao comando confirmado;
  confirmação de distância não limpa rascunho de qualidade inserido depois.
  O rascunho próprio de distância e sua limpeza correspondente foram entregues
  na etapa 4.
- Recibos permanecem no QueryClient da organização durante desmontagens;
  imagens e organizações têm operações isoladas. Respostas atrasadas não
  recriam dados nem recibos de uma imagem cuja exclusão foi confirmada.

Verificação: **76 testes direcionados passaram**, incluindo transporte,
single writer, preservação da intenção, conflito, coleta de cache, exclusão e
o fluxo serviço → BFF JWT → HTTP simulado com perda de resposta nas três ações.
Typecheck web e revisão do diff passaram. A revisão independente identificou
que conferir uma recusa definitiva poderia convertê-la em incerteza; a guarda
de fase foi adicionada e o cenário está coberto por teste. A suíte completa
e o aceite real no navegador/backend continuam reservados para o encerramento.

### 4. Acrescentar rascunho e proteções de ciclo de vida

- Criar `lib/distance-editor.ts`, `lib/distance-draft.ts` e
  `hooks/use-image-distance.ts`, com geometria normalizada, ID estável,
  `baseRevision`, operação e detecção de alterações. Separar seleção de rascunho.
- Acrescentar chave em `cases-query-keys.ts` e suporte no cache síncrono de
  `use-workspace-draft.ts`; nada vai para localStorage/sessionStorage.
- Integrar a detecção de rascunho às proteções existentes de navegação,
  recalibração, qualidade interna e exclusão de imagem/caso. Incorporar a nova
  chave à limpeza de `image-deletion.ts` e conferir a limpeza do caso inteiro.
- Centralizar a composição de rascunhos do plano em `lib/image-plan-draft.ts`,
  mantendo helpers específicos por editor. Separar “existe algum rascunho” de
  “existe rascunho de outro editor”: o próprio rascunho não pode bloquear seu
  salvamento. Ajustar os consumidores atuais sem criar dependências circulares.
- Separar **escala confirmada**, **editor de calibração ativo** e **lock de
  gravação** no estado do workspace. Hoje `measurementEligible` fica falso
  durante qualquer save e pode expulsar o usuário de Ferramentas.

**Entrega:** estado de distância isolado por imagem e integrado aos locks.

**Aceite:** salvar/conferir distância mantém seu painel montado; não abre
calibração por engano. Rascunho sobrevive à troca interna permitida, não à
troca de organização/logout. Callbacks antigos não restauram imagem excluída.

#### Entrega da etapa 4

- `distance-editor.ts` representa create/update/delete com ID estável, revisão
  original e geometria normalizada; converte somente entradas permitidas em
  comando e detecta alterações sem rebase automático. Criação ainda sem pontos
  e geometria degenerada podem permanecer como rascunho, sem liberar Salvar.
- `use-image-distance.ts` mantém seleção local separada do rascunho. Selecionar
  uma linha não deixa o plano sujo. Criação/edição/exclusão preparadas, alteração
  de geometria, salvamento, conferência e descarte usam o cache síncrono e o
  coordenador existentes; nenhum controle novo de desenho foi exposto nesta etapa.
- A chave `imageDistanceDraft` e `useWorkspaceDraft` conservam o rascunho no
  QueryClient da organização, por caso/imagem. Remontagem preserva pontos,
  ID e entradas inválidas; outro QueryClient não herda esses dados.
- `image-plan-draft.ts` centraliza a composição de calibração, qualidade,
  distância e recibos não resolvidos. `hasImagePlanDraft` verifica qualquer
  intenção; `hasOtherImagePlanDraft` exclui o editor dono. A assinatura reativa
  em `use-image-plan-drafts.ts` atualiza as permissões sem depender de um render
  acidental do painel irmão. Os módulos específicos não importam o agregador.
- O writer confere o próprio rascunho de distância antes de enviar: outro alvo
  ou outra geometria local não pode ser salvo por uma ação antiga. A confirmação
  limpa somente o rascunho que corresponde ao comando; uma edição local mais
  nova permanece. A qualidade continua interna e mantém suas proteções.
- Navegação e beforeunload reconhecem distância. Cancelar saída conserva o
  rascunho; confirmar descarte o limpa antes de navegar. Exclusão de caso/imagem
  é bloqueada por intenção não salva e remove a nova chave após confirmação.
- Escala disponível usa o recibo próprio da calibração, enquanto edição e
  gravação continuam obedecendo ao lock compartilhado. Distância em saving,
  checking ou uncertain não fecha Ferramentas. Os dois interceptores de
  navegação encaminham ao owner do recibo, com texto pt-BR/en correspondente.
- Métodos do editor verificam montagem, plano atual, escala, prontidão,
  geometria, IDs e locks no momento da ação. Callbacks após desmontagem não
  iniciam nem alteram rascunhos. O writer acompanha a identidade do Query de
  recibo: depois de limpar o contexto, uma resposta tardia não recria dados.

Verificação: **165 testes direcionados passaram**, incluindo as regressões do
workspace/calibração, serviço/writer/BFF e exclusão de imagem/caso; os seis
cenários DOM de distância foram reexecutados após os ajustes finais de lifecycle.
Typecheck web e revisão do diff passaram. Houve revisão independente de
ownership, descarte, unmount, navegação e ciclos de importação. Os testes de
HTTP/DOM usam dados sintéticos; o aceite completo real permanece no encerramento.

Não há produtor de rascunho de qualidade no workspace atual. Se esse fluxo
interno vier a ganhar um editor, ele precisará registrar seu próprio descarte;
o descarte de calibração/distância não apaga intenções de outro owner.

### 5. Separar a camada de desenho do visualizador

- Preservar em `case-image-viewer.tsx` a responsabilidade por imagem, viewport,
  zoom, pan, fullscreen e conversão de ponteiro.
- Extrair apenas o necessário para renderizar overlays e encaminhar a interação
  ao editor ativo. Calibração e distância têm modos explícitos e mutuamente
  exclusivos; evitar novas combinações de flags de calibração.
- Reutilizar `line-marker-interaction.ts` para hit testing, movimento e alças.
  Conversão ponto normalizado ↔ pixel original deve ser neutra, compartilhada
  e testada; distância não passa por `known_length_mm`/`REFERENCE_LINE`.

**Entrega:** seam pequena para overlays e interação, sem framework de ferramentas.

**Aceite:** regressões da calibração linha/círculo continuam passando; zoom,
pan, espelhamento, pointer capture/cancel e teclado mantêm seu comportamento.

**Entrega conferida em 29/10/2026:**

- `case-image-viewer.tsx` conserva imagem, viewport, zoom, pan, fullscreen,
  conversão do ponteiro e captura. A geometria de criação, movimento,
  redimensionamento e teclado foi extraída para `lib/viewer-marker-interaction.ts`,
  reutilizando os helpers existentes de linha e círculo.
- `lib/viewer-editor.ts` define uma única união discriminada: sem editor,
  calibração ou distância. O adaptador de distância recebe geometria normalizada
  e retorna ajustes normalizados, sem passar por `REFERENCE_LINE`, tamanho
  conhecido ou cálculo clínico. Nenhuma ação produz HTTP no visualizador.
- `components/viewer-editor-overlay.tsx` renderiza a geometria e as alças do
  editor ativo. `renderOverlay` recebe matriz original, escala visual e
  espelhamento para permitir camadas passivas e textos na etapa 6.
- `lib/image-point-space.ts` centraliza conversão normalizado ↔ pixel original,
  compartilhada pela calibração e distância, sem arredondar pela prévia nem
  limitar silenciosamente círculos que cruzam a matriz.
- Trocar modo/alvo, bloquear edição ou desmontar cancela o gesto e libera sua
  captura. Escape também libera a captura, preservando a geometria anterior.
  Ponteiros secundários e eventos tardios não confirmam outro editor.
- Os consumidores remoto e legado foram migrados. O workspace continua ativando
  somente calibração ou navegação; a interface de distância fica disponível às
  próximas etapas, sem expor controles incompletos ao usuário.

**Validação:** 95 testes direcionados aprovados em `calibration-workspace`,
`calibration-editor` e `viewer-editor`, incluindo linha/círculo, zoom, pan,
resize, espelhamento, teclado, pointer cancel/lost capture, troca de editor/alvo,
liberação ao desmontar, camadas passivas e fullscreen simulado no DOM.
`tsc --noEmit` e `git diff --check` aprovados; revisão independente sem achados
de regressão. Os testes usam DOM e dados sintéticos; não substituem o aceite
real da integração ao final de todas as etapas.

### 6. Exibir distâncias já salvas

- Criar `components/distance-overlay.tsx` e um seletor puro do resultado
  confirmado conforme a etapa 0; listar somente objetos `LINE` no painel.
- Conferir status `CALCULATED`, valor finito, unidade `mm` e vínculo com a
  calibração atual. Resultado ausente, inválido ou antigo não vira zero nem
  medida atual. Preservar o objeto e representar indisponibilidade.
- Formatar somente para exibição com a infraestrutura de locale; definir e
  registrar a precisão visual nesta etapa, sem arredondar o valor persistido.
- Texto permanece legível e sem espelhamento; alças e espessura visual não
  crescem com o zoom. Destacar seleção também por forma/estado acessível.

**Entrega:** leitura real de distâncias persistidas, ainda sem criar pela UI.

**Aceite:** refresh restaura medidas da API; prévia arredondada não desloca
a linha. Recalibração usa os novos resultados retornados, sem conservar número antigo.

**Entrega conferida em 29/10/2026:**

- `lib/distance-result.ts` seleciona somente `LINE`, preservando ordem, ID,
  rótulo e geometria. O resultado disponível exige `CALCULATED`, comprimento
  positivo e finito em `values.length`, `units.length: "mm"` e `calibration_id`
  igual ao resultado da calibração atual. O resultado salvo não é calculado no
  cliente; a prévia transitória de edição está descrita abaixo.
- Ausência de resultado/calibração/dimensões, valor/unidade inválidos e vínculo
  antigo aparecem como medida indisponível. Após falha de atualização do plano,
  a geometria em cache permanece no overlay com resultado não conferido, sem
  apresentar seu número antigo como atual. O acesso ao painel continua seguindo
  o estado já adotado da calibração e seu tratamento de erro.
- `lib/distance-format.ts` formata com `useFormatter`/locale: **duas casas
  decimais em milímetros**; positivos menores que 0,01 mm usam `< 0,01 mm`
  (ou `< 0.01 mm` em inglês). Essa precisão é somente visual: documento, valor
  retornado pela API e coordenadas persistidas não sofrem arredondamento.
- `components/distance-overlay.tsx` usa os pontos normalizados na matriz
  original. Texto, espessura e marcadores têm tamanho visual constante pela
  escala inversa, incluindo zoom/resize. O texto corrige o espelhamento e tem
  contorno para contraste na radiografia. A seleção troca círculos por quadrados.
- `CaseImageToolsPanel` lista rótulos/nomes padrão e resultados, com estado
  vazio e motivos localizados de indisponibilidade. Seus botões têm foco visível,
  nome/valor associados, descrição do motivo e `aria-pressed`. Selecionar não
  inicia edição nem cria rascunho; continua possível durante consulta em segundo
  plano, com os bloqueios de gravação, exclusão e troca de rascunho preservados.
- O workspace consome o plano compartilhado da API e mostra as linhas nos
  demais painéis; oculta-as durante a edição de calibração. Atualização/reabertura
  restaura os objetos; uma nova calibração invalida vínculos antigos imediatamente
  e usa os novos valores oficiais devolvidos no próprio reconhecimento da gravação.
  Ainda não há controles de criação, ajuste ou exclusão de distâncias pela UI.

**Validação:** 113 testes direcionados aprovados em `calibration-workspace`,
`calibration-editor`, `distance-result`, `distance-draft` e `viewer-editor`.
Cobrem leitura/reabertura, somente `LINE`, resultados ausentes/inválidos/antigos,
precisão pt-BR/en, matriz original com prévia arredondada, zoom/pan/resize/mirror,
seleção acessível/local, falha/recuperação da leitura e resultado atualizado no
retorno da recalibração; incluem regressões da calibração e das proteções existentes.
`tsc --noEmit` e `git diff --check` aprovados. Revisão independente realizada;
os achados de valor em cache após erro e seleção acoplada à escrita foram corrigidos.
Os resultados de distância e interações DOM dos testes são sintéticos; o teste
completo real permanece no encerramento, incluindo a pendência da etapa 0.

### 7. Criar uma distância no visualizador

- A ação Distância inicia criação explícita; arrastar na imagem define as
  extremidades. Soltar conclui o gesto local; nunca envia HTTP.
- Oferecer “Posicionar linha” no centro como alternativa por teclado, seguindo
  o precedente da calibração; permitir ajustar antes de salvar.
- Escape/pointercancel desfazem somente o gesto corrente e preservam o último
  rascunho confirmado localmente. Cancelar edição remove uma criação não salva.
- Não tratar um clique simples ou gesto degenerado como distância válida.

**Entrega:** criação local com ID estável e indicação “Não salva”.

**Aceite:** mouse, toque e teclado criam a mesma geometria; gesto fora da
imagem não inicia linha; limites seguem as bordas inclusivas da matriz.

**Entrega conferida em 29/10/2026:**

- A ação **Distância** em Ferramentas inicia uma criação explícita pelo
  `useImageDistance`. Um único UUID permanece durante desenho e ajustes; cliques
  repetidos não criam outra intenção. O nome inicial evita rótulos existentes e
  os nomes padrão exibidos para linhas sem rótulo, na mesma ordem da lista.
  A capacidade de 500 objetos considera todos os tipos do plano.
- `case-image-distance-panel.tsx` foi extraído nesta etapa para os controles
  locais, usando Button/tokens e textos pt-BR/en. Exibe nome, **Não salva**,
  orientações, **Posicionar linha** e **Cancelar edição da distância**. O foco
  vai ao visualizador ao iniciar/posicionar e retorna à ação ao cancelar.
  O painel será completado com gravação e feedback na etapa 9.
- Arrastar define extremidades em pixels da matriz original; somente ao soltar
  a geometria normalizada entra no rascunho. Novas linhas exigem deslocamento
  de pelo menos **4 pixels CSS**, além do mínimo geométrico já adotado, para
  não transformar o tremor de um clique em distância. O início fora da imagem
  é ignorado e o fim é limitado às bordas inclusivas. A calibração conserva
  seus critérios de gesto.
- Posicionar cria uma linha central de `(0,4; 0,5)` a `(0,6; 0,5)`, equivalente
  ao arraste. É possível mover pelas setas e ajustar o ponto final com Alt;
  Shift aumenta o passo. O acesso explícito a ambos os pontos entra na etapa 8.
  A criação tem traço descontínuo. Rascunhos antigos recuperados também podem
  mostrar uma prévia em mm se houver escala persistida e dimensões válidas.
- Escape, pointercancel e perda de captura desfazem apenas o gesto atual,
  preservando a última geometria confirmada localmente. Escape mantém o modo
  de desenho da distância. Cancelar edição remove o rascunho inteiro, preserva
  as linhas salvas e não envia HTTP.
- Cada gesto captura o editor/alvo, geometria confirmada, imagem, tipo de
  marcador e estado de interação. Move/up verificam esse contexto antes de
  alterar o rascunho, inclusive antes de efeitos passivos: trocar alvo ou
  posicionar uma linha enquanto outro ponteiro está capturado não permite que
  um evento atrasado sobrescreva a nova geometria.
- O rascunho sobrevive à troca de painel/remount, retoma o desenho em
  Ferramentas e mantém as proteções de saída. Outra revisão congela o ajuste
  sem reaplicar geometria automaticamente; cancelamento continua disponível.
  Callbacks conferem recibo, locks, revisão e ID atuais, e não ressuscitam uma
  recuperação descartada. A seleção visual das linhas salvas da etapa 6 foi
  preservada; durante uma criação, outra seleção fica bloqueada.

**Validação:** 125 testes direcionados aprovados em `calibration-workspace`,
`calibration-editor`, `distance-draft`, `distance-result` e `viewer-editor`.
Incluem equivalência mouse/toque/teclado, ponteiro secundário, nome/ID estáveis,
limiar de clique, bordas, cancelamento/captura, revisão alterada, remount,
capacidade, callbacks antigos e troca de alvo/geometria antes dos efeitos.
`tsc --noEmit` e `git diff --check` aprovados. Revisão independente concluída;
colisão com nomes padrão, tremor de clique e eventos atrasados foram corrigidos.
Dados e interações DOM são sintéticos; o aceite completo real fica no encerramento.

### 8. Selecionar e ajustar uma distância

- Selecionar pela lista ou pela linha; lista resolve sobreposições. No canvas,
  priorizar alças da seleção atual e depois a linha mais próxima, com desempate
  determinístico, sem trocar o alvo durante o gesto.
- Arrastar corpo move a linha inteira; alças ajustam cada extremidade. Reutilizar
  tolerâncias em pixels de tela e contenção do segmento na imagem.
- Disponibilizar seleção acessível de linha/ponto inicial/ponto final e ajuste
  por setas, com Shift para passo maior. Não exigir mouse para editar ambos os pontos.
- Trocar para outra medida com rascunho exige salvar ou cancelar a atual.

**Entrega:** edição de uma linha sem modificar as demais.

**Aceite:** limites, seleção e teclado funcionam em zoom/pan/espelhamento;
cancelar restaura a geometria persistida e não grava nada.

**Entrega conferida em 29/10/2026:**

- Lista e canvas selecionam uma medida sem sujar o plano. A ação explícita
  **Editar distância** inicia um `distance-update` com ID, geometria e revisão
  observados. Linhas bloqueadas podem ser consultadas, mas não editadas; as
  ocultas continuam fora da seleção. A criação da etapa 7 foi preservada.
- `lib/distance-line-interaction.ts` concentra picking e ajuste por teclado,
  usando `line-marker-interaction.ts` para hit testing, distância ao segmento,
  movimento e extremidades. As alças atuais têm prioridade a 12 pixels de tela;
  o corpo usa 8 pixels. Depois vale a linha mais próxima; empates conservam a
  seleção atual e então usam a ordem dos IDs. A linha selecionada é desenhada
  por último, e a lista permite resolver sobreposições.
- No canvas, o toque/clique captura um candidato ao pressionar e só confirma
  a seleção ao soltar sem arraste. Um arraste no modo pan continua movendo a
  imagem. Na edição, corpo e alças alteram somente o alvo capturado; clicar no
  fundo não redesenha uma linha salva. Cliques com tremor abaixo de 4 pixels
  CSS não alteram a geometria nem criam alterações por conversão numérica.
- O painel permite selecionar **Linha inteira**, **Ponto inicial** ou **Ponto
  final**, com Tab/foco/acionamento nativos e `aria-pressed`. As setas ajustam
  a parte escolhida no painel ou no visualizador, Shift usa 10 pixels originais
  e a direção horizontal acompanha o espelhamento. Alt mantém o atalho do ponto
  final quando Linha inteira está selecionada. Arrastar o corpo/alça também
  atualiza a parte ativa para o próximo ajuste por teclado.
- Mouse/toque e teclado compartilham o mínimo de 2 pixels originais para definir
  ou redimensionar a linha. Mover o corpo conserva o comprimento de um segmento
  positivo já salvo, inclusive se menor; nunca cria endpoints coincidentes.
  A contenção usa as bordas inclusivas da matriz e preserva o segmento inteiro.
- Com alterações, a seleção de outro alvo é bloqueada tanto na UI quanto no
  hook. O painel/lista identificam **Alterações não salvas** e não exibem um
  número oficial antigo como resultado da nova geometria. Durante o ajuste, a
  linha persistida do alvo fica oculta no overlay, mantendo só o rascunho;
  as demais medidas e todos os dados do plano permanecem intactos.
- Cancelar restaura o desenho/resultado persistidos e não grava. Escape cancela
  somente o gesto. Uma revisão nova congela o ajuste, sem rebase automático.
  Fora de Ferramentas, uma edição ainda limpa mostra o resultado salvo; iniciar
  recalibração encerra essa edição limpa antes de abrir o editor de calibração.
  Rascunhos com alterações mantêm as proteções existentes de saída/exclusão.

**Validação:** 137 testes direcionados aprovados em `calibration-workspace`,
`calibration-editor`, `distance-line-interaction`, `distance-draft`,
`distance-result` e `viewer-editor`. Incluem seleção por lista/canvas, prioridade,
desempate/sobreposição, toque, teclado dos dois endpoints, corpo e bordas,
zoom/pan/mirror, captura fixa, tremor de clique, cancelamento, revisão alterada,
flags e regressões de criação/calibração. `tsc --noEmit` e `git diff --check`
aprovados. Revisão independente concluída; limites geométricos entre métodos e
atualização da parte ativa após arraste foram corrigidos. Os dados/DOM são
sintéticos; aceite completo real continua reservado ao encerramento.

### 9. Conectar painel, salvamento e feedback

- Completar `case-image-tools-panel.tsx` e os controles de distância
  (extraídos na etapa 7) com gravação e feedback do editor, evitando concentrar
  controles e regras de negócio no workspace ou no visualizador.
- Conectar `use-image-distance`, preview e workspace ao fluxo das etapas 2–4.
  O hook concentra regras; os painéis recebem estado e ações.
- Usar Salvar/Atualizar e Cancelar na barra de edição sobre a imagem. Após salvar,
  permanecer em Ferramentas, selecionar a linha confirmada e voltar ao modo pan.
- Seguir tokens, Button, ajuda/tooltip e Sonner existentes. Erros de leitura
  usam Sonner e estado acessível da ação, sem novo bloco com “Tentar novamente”.
  Conflito e resultado incerto mantêm ações específicas de recuperação.
- Acrescentar textos pt-BR/en, foco após ações, estado ocupado e anúncios
  discretos; renderização/arraste não devem gerar consultas ou mensagens repetidas.

**Entrega:** primeira jornada completa criar → salvar → reabrir → editar → atualizar.

**Aceite:** valor oficial aparece apenas após confirmação; clique duplo grava
uma vez; fundo atualizado não limpa rascunho nem faz Ferramentas piscar/carregar
ao voltar à aba. Conflito oferece descartar/carregar salvo; incerto oferece conferir.

**Entrega conferida em 29/10/2026:**

- `case-image-distance-toolbar.tsx` oferece **Salvar**, **Atualizar** e
  **Cancelar**, conforme criação/edição. Após refinamento visual, a barra fica
  vertical na lateral esquerda do visualizador, centralizada na altura. Usa
  o mesmo fundo escuro, botões de 32 px e destaque de seleção do menu superior,
  com estilos/botão compartilhados em `viewer-toolbar.tsx`. Nome da distância
  e estado ficam disponíveis aos leitores de tela, sem cabeçalho visível.
  Ajustes de linha/pontos vêm primeiro; X vermelho e check verde ficam após o
  separador. Ícones têm nomes acessíveis, dicas por hover/foco e descrições pt-BR/en;
  estado ocupado e anúncios discretos seguem os componentes/tokens existentes.
  Posicionar, arrastar, ajustar e renderizar continuam sem consultas ou toasts.
- O catálogo lateral segue as ações de Imagem/Calibrar: nome à esquerda,
  ícone à direita, sem botão em pílula. Medidas inclui Distância, Ângulo, Círculo
  e Medidas adicionais; Planejamento inclui Referências anatômicas, Simulação
  TPLO e Implantes. Somente Distância está integrada; as outras opções ficam
  desabilitadas e não criam rascunhos nem requisições.
- Distância permanece com destaque e `aria-pressed` enquanto houver edição ou
  seleção ativa. O acesso não fica desabilitado durante seu uso: repetir o clique
  não substitui o rascunho nem repete uma gravação. Criar uma nova medida após
  selecionar uma salva continua permitido quando não há edição pendente.
- O slot `editorControls` mantém os controles fora da superfície de gestos,
  sem disparar pan/ajuste duplicado ao usar a barra. Tooltips são montados
  dentro do visualizador, inclusive em fullscreen. Se a prévia falha, a barra
  continua disponível para cancelar ou recuperar uma operação, com edição
  desabilitada. O texto de orientação inferior não se sobrepõe à barra.
- `useImageDistance.submit` monta o comando com estado fresco e aciona o writer
  compartilhado. Um guard imediato evita duplo envio, descarte e edição na
  janela anterior à publicação do lock. Conflito fresco também bloqueia um
  handler antigo antes da próxima renderização; não há rebase automático.
- `use-distance-save-actions.ts` permanece montado no workspace para emitir um
  único Sonner por ação, mesmo quando a confirmação remove o editor. Após salvar,
  Ferramentas continua ativo, a linha confirmada fica selecionada, o modo volta
  para pan e o foco vai para sua linha na lista. Desmontagem/contexto invalidado
  não produz feedback ou foco tardio na outra tela.
- O resultado exibido vem da resposta oficial. Uma confirmação sem medição
  derivada salva a geometria e mostra **Medida indisponível**, sem calcular mm
  localmente ou repetir a escrita. Reabrir consulta a linha persistida;
  atualizar conserva ID, nome, posição, flags e demais objetos do documento.
- Falha definitiva conserva ajustes e permite revisão/reenvio explícito.
  **Carregar salvo** descarta um conflito e consulta a versão atual quando
  necessário; Ferramentas permanece aberto durante essa recuperação, sem
  mensagem de lista vazia. O foco fica em uma ação habilitada e retorna à
  criação ao concluir. Se a consulta falhar, a ação Conferir plano continua
  disponível no próprio painel e recebe foco. A consulta já iniciada é
  compartilhada, sem GET duplicado.
- Resposta perdida conserva o recibo incerto e bloqueia edição/descarte/saída.
  **Conferir gravação** consulta somente por GET o comando capturado. Uma revisão
  posterior compatível confirma a gravação; incompatível oferece Carregar salvo.
  Nenhuma dessas ações repete PATCH/PUT.
- Falha de leitura em segundo plano mantém Ferramentas e seus ajustes/seleção.
  Usa um único Sonner compartilhado e **Conferir plano** em vermelho, com
  descrição acessível/tooltip, no editor ou na ação do painel. Consultar não
  salva automaticamente, e nenhum bloco com Tentar novamente foi acrescentado.

**Validação:** 187 testes direcionados aprovados em `calibration-workspace`,
`calibration-editor`, `distance-line-interaction`, `distance-draft`,
`distance-result`, `viewer-editor`, `distance-plan-saving`,
`distance-plan-commands` e `distance-plan-bff`, incluindo 13 novos casos do
fluxo de salvamento e 2 da barra/catálogo. Cobrem criar → salvar → reabrir → editar → atualizar,
resultado oficial/ausente, duplo clique, bloqueio imediato, resposta perdida,
conflito, consulta falha, leitura em segundo plano, seleção/foco, desmontagem,
traduções, catálogo inativo, isolamento de gestos e falha de prévia.
`tsc --noEmit` e `git diff --check` aprovados.
Revisão independente realizada. Testes usam API/DOM sintéticos; navegador e
backend reais, suíte completa e lint continuam no encerramento da etapa 11.

O refinamento dos menus foi revalidado com **152 testes direcionados** de workspace,
calibração, interação/rascunho/resultado de distância e visualizador. Inclui o
acesso Distância ativo durante salvamento, clique repetido sem novo rascunho,
descrições acessíveis, tooltips e recuperação da barra lateral. TypeScript e
verificação do diff aprovados; conferência visual em navegador permanece pendente.

#### Calibração e recalibração → edição da distância — 29/10/2026

- O contrato público foi consultado novamente: `PUT /api/v1/images/{image_id}/plan`
  aceita `base_revision` e um `PlanDocument` com `calibration` e `objects`. O fluxo
  usa essa operação existente, sem endpoint ou campo persistido novo no backend.
- O comando local de calibração aceita `initialDistance: { id, label }` para a
  linha ou o diâmetro circular contido na matriz. É uma intenção restrita entre
  navegador e BFF, nunca um campo enviado ao backend. O BFF copia os pontos para
  um `LINE`, com flags padrão e sem resultado enviado pelo cliente, no mesmo PUT
  da calibração. Metadados TPLO, auditoria e outros objetos são preservados.
- A UI inclui essa intenção apenas quando não existe nenhum `LINE`, inclusive
  em casos antigos que ainda não têm medidas, na próxima gravação de calibração.
  Recalibrar inclui `distanceId` para atualizar a mesma linha identificada,
  preservando seu UUID e nome. Os dois campos locais são exclusivos.
  Limite global de 500 objetos, colisões/IDs ambíguos e revisões são respeitados;
  não se salva metade da intenção. A UI informa o limite antes de tentar escrever.
- O UUID é estável na tentativa/recibo. Confirmação exige calibração e linha com
  ID, pontos e nome correspondentes; calibração isolada não confirma a intenção
  conjunta. Perda de resposta permite somente GET, sem criar outro ID ou repetir PUT.
- Após confirmação, abre Ferramentas → Distância e inicia uma edição limpa da
  linha criada/atualizada, com seleção, foco e valor oficial em mm. O alvo existente
  é a seleção explícita, a correspondência única com a referência anterior ou a
  única linha visível. Planos legados ambíguos exigem seleção; não são sobrescritos
  arbitrariamente. Linhas bloqueadas são preservadas.
  O encaminhamento fica isolado por QueryClient, caso, imagem e calibração.
- `DistanceOverlay` mantém apenas o rótulo oficial para o editor ainda limpo,
  evitando desenhar duas linhas. O visualizador informa gesto em andamento para
  substituir o número antigo por uma prévia durante o arraste; cancelar o gesto
  restaura a geometria e o rótulo anteriores.
  Ajustar/salvar a distância não altera a calibração. Ausência de resultado
  derivado continua sendo medida indisponível, sem número fabricado pelo front.
- O círculo fica restrito à calibração; em Ferramentas aparece apenas a linha de
  seu diâmetro. Círculos legados com diâmetro fora da matriz não geram uma linha
  truncada. O catálogo abre edição da medida salva e não oferece outra criação;
  rascunhos antigos continuam recuperáveis. Arrastar o fundo não redesenha a linha.
  Layers, trava angular e exclusão pela UI não entram neste ajuste.

**Validação da versão inicial deste ajuste:** 251 testes direcionados aprovados de workspace,
calibração, distância, comandos, BFF, transporte, recuperação e visualizador,
incluindo 10 testes novos para a gravação conjunta e seu encaminhamento na UI.
TypeScript e verificação do diff aprovados; revisão independente sem achados
pendentes. O contrato público foi conferido por leitura, sem gravação remota
autenticada. O aceite real e a evidência executável continuam nas etapas 0 e 11.

**Revisão do fluxo em 04/11/2026:** 259 testes direcionados aprovados nos 12
arquivos de workspace, calibração, distância, visualizador, comandos, BFF,
transporte e recuperação. Incluem primeira calibração/recalibração por linha e
círculo, edição do mesmo UUID, bloqueio de desenho sobre o fundo, retorno após
resposta perdida, alvo preservado após falha/remontagem e foco após recuperação.
TypeScript (`--noEmit --incremental false`) e verificação do diff aprovados.
Conferência visual no navegador e aceite remoto completo continuam pendentes.

#### Visibilidade por ferramenta e resultado compacto — 04/11/2026

- Marcações salvas, rascunho visível, seleção no canvas e barra de edição ficam
  restritos a Ferramentas com Distância ativa. Entrar no caso ou apenas abrir
  Ferramentas não mostra as linhas. Selecionar a medida ou abrir Distância as exibe.
- Trocar para Informações, Arquivos ou Imagem oculta a marcação e bloqueia seus
  gestos/atalhos, preservando seleção, UUID, geometria e rascunho. Voltar a
  Ferramentas retoma o contexto existente; não há gravação ou descarte implícito.
- O resultado fica abaixo da ação Distância, sem card, título ou descrição visível:
  apenas o valor centralizado. Nomes e motivos de indisponibilidade continuam
  acessíveis; medidas sem resultado ou prévia válida usam um travessão. Ações da seleção usam ícones.
- O salvamento, a recalibração e o encaminhamento automático para editar a linha
  confirmada permanecem com o mesmo comportamento e contrato.

**Validação:** 124 cenários do workspace verificados entre a regressão e a
repetição direcionada, incluindo ocultação/retorno entre painéis sem HTTP ou perda
de rascunho, apresentação compacta acessível, calibração e recalibração com
encaminhamento automático. TypeScript e verificação do diff aprovados.
Conferência visual no navegador permanece pendente.

#### Prévia dinâmica de Distância — 04/11/2026

- `distance-preview.ts` calcula uma estimativa visual com o comprimento em pixels
  da matriz original multiplicado por `calibration.result.mm_per_pixel` persistido.
  Referência ainda não salva, resolução da miniatura, zoom e espelhamento não
  definem a escala. Falha de leitura, conflito/revisão divergente, escala/dimensões
  inválidas ou geometria fora da matriz impedem a prévia.
- O visualizador publica somente a geometria transitória do gesto. Ela fica
  separada do rascunho e do plano; o pointerup continua sujeito às validações de
  intenção, alvo e tamanho já existentes. Escape, pointercancel, perda de captura
  e mudança de contexto limpam essa geometria sem gravar.
- Linha e painel recebem a mesma prévia, inclusive ao ajustar por teclado. O
  rótulo acompanha o segmento e mantém a aparência ciano. Nomes/descrições
  acessíveis distinguem prévia de valor confirmado, sem acrescentar texto visual.
- A identidade da prévia inclui caso, imagem, editor/geometria/revisão e QueryClient,
  evitando aplicar o gesto a outro alvo ou a uma versão nova. A API recebe somente
  a intenção e os pontos, e seu resultado oficial substitui a prévia ao confirmar.
- O fluxo de calibração/recalibração, edição da mesma linha e visibilidade apenas
  em Ferramentas com Distância ativa permanece preservado.

**Validação:** 143 testes direcionados aprovados de workspace, prévia de distância,
resultado oficial e visualizador. Cobrem atualização antes do pointerup na linha
e no painel, posicionamento do rótulo, teclado, cancelamento, invalidação por
revisão nova, preservação do plano/payload e substituição pelo resultado da API.
TypeScript e verificação do diff aprovados. Conferência visual no navegador
permanece pendente.

#### Aparência das marcações — 29/10/2026

O DS ganhou a paleta `--radiograph-mark-*` para atenção, interesse, anatomia,
medição e destaque complementar. Distância usa o token de medição ciano
`#00D9FF` na linha, alças e valor, sem contorno escuro ou halo no texto.
Os outros tokens ficam disponíveis para as ferramentas seguintes; seleção
da interface conserva seus tokens próprios. Linha de calibração, diâmetro,
alças e Distância compartilham o token ciano em todas as etapas. O círculo usa
o token compartilhado de interesse amarelo `#FFD600`. O token legado exclusivo
de círculo permanece removido, e os desenhos não usam o azul de seleção.

O rótulo fica ao lado e paralelo ao segmento usando os pontos na matriz original.
A orientação é normalizada para leitura, independente da ordem dos pontos, e
compensa o espelhamento da imagem. Fonte, espessura e afastamento permanecem em
pixels de tela ao aplicar zoom; nas bordas, lado e âncora se adaptam ao espaço.
Só a apresentação muda: valor oficial, geometria persistida e chamadas à API
permanecem iguais.

**Validação visual por DOM:** 158 testes direcionados aprovados, incluindo
ângulos horizontal/vertical/diagonal em matriz retangular, pontos invertidos,
espelhamento, afastamento nas bordas e tamanho constante em zoom/resize.
TypeScript e diff aprovados. Inspeção visual em navegador continua pendente.

### 10. Integrar exclusão de uma distância — concluída em 04/11/2026

- Usar ação explícita na medida selecionada e confirmação no padrão de diálogo
  existente. Não confundir excluir medida com excluir a radiografia.
- Excluir uma criação não salva é cancelamento local. Excluir linha persistida
  usa `distance-delete`, revisão observada e o mesmo coordenador de gravação.
- Manter a linha visível e bloqueada enquanto confirma o resultado; retirar
  somente após resposta válida ou GET que confirme ausência em revisão posterior.

**Entrega:** exclusão isolada com conflito e perda de resposta tratados.

**Aceite:** cancelar confirmação não grava; excluir não altera os demais objetos;
timeout não repete exclusão. Se uma leitura atual mostrar o alvo já ausente,
apresentar “Medida já removida” após reconciliação, sem emitir PUT vazio ou
alegar autoria da remoção. Preservar a regra de revisão e distinguir esse
estado de um conflito em que a linha ainda existe.

**Implementado:**

- Swagger público consultado em 04/11/2026: versão `0.9.0`, gravação por
  `PUT /api/v1/images/{image_id}/plan` com `base_revision` e `document`, incluindo
  `objects`. A exclusão usa essa operação existente, removendo somente o LINE
  selecionado. Navegador envia `distance-delete` ao BFF; não há endpoint inventado
  nem novo campo persistido no contrato remoto.
- Lixeira na medida selecionada abre `case-image-distance-delete-dialog.tsx`.
  A revisão observada é capturada ao abrir. Cancelar preserva o rascunho de edição;
  confirmar pode convertê-lo em exclusão da mesma linha, com aviso sobre ajustes
  não salvos. Alvos bloqueados, comandos concorrentes e revisões novas são respeitados.
- O diálogo é reconstruído por rascunho/recibo após remontagem e retorna a
  Ferramentas. Duplo clique não duplica a gravação, e a linha permanece no plano
  carregado enquanto aguarda confirmação. Resultado incerto oferece somente GET;
  falha definitiva permite cancelar ou tentar novamente de forma explícita.
- Um GET que confirme ausência em revisão posterior produz Medida já removida,
  inclusive após 409 ou resposta perdida, sem atribuir autoria nem repetir PUT.
  Uma remoção observada antes da confirmação não emite gravação vazia. Conflito
  com alvo presente oferece Carregar salvo, preservando o plano recebido.
- O resultado no painel agora usa uma linha sem card, com Comprimento, valor e
  lixeira. Camadas → Valor da medida alterna somente o rótulo na radiografia.
  Essa preferência fica no cache local da imagem/organização, sobrevive à
  remontagem do workspace e não muda a geometria, a escala ou `PlanLine.visible`.
  A prévia dinâmica e o encaminhamento de calibração/recalibração continuam iguais.

**Validação:** 277 testes direcionados aprovados em execuções separadas:
134 cenários de workspace e 143 de contrato, BFF, transporte, writer, cálculo,
rascunho e visualizador. Incluem oito novos testes DOM de exclusão/camadas e um
teste adicional do writer para 409 com alvo ausente. TypeScript e diff aprovados;
revisão estática independente sem achados materiais. Sem gravação remota autenticada;
aceite visual e integração real continuam na etapa 11.

#### Navegação de Medidas e controles no quadro — 04/11/2026

- Ferramentas oferece apenas Medidas; essa ação abre um subpainel com retorno
  no rodapé e catálogo Distância, Ângulo, Círculo e Medidas adicionais.
  A ação Medidas segue Calibrar: texto à esquerda e ícone à direita.
  Rótulos Categorias e Ferramentas de medida seguem a tipografia de Calibração.
  Só Distância está integrada; as demais continuam desabilitadas.
- Distância usa uma barra estreita com mover, ajustes, olhinho e exclusão.
  Apenas a linha de Ajustes se expande lateralmente, com as extremidades lado
  a lado, sem segunda coluna ou superfície flutuante.
  A abertura e o fechamento deslizam em 200 ms com os tokens do DS; movimento
  reduzido desativa a animação e o conteúdo fechado fica inerte.
  Valor dinâmico e seleção de linhas legadas ficam em etiqueta separada.
  Salvar/cancelar surgem perto da linha
  após alterações, fora da barra; ações de recuperação permanecem acessíveis.
  X/check usam botões de 28 px e ícones de 14 px para menor destaque visual.
  Ficam ocultos durante arrastes e ajustes por setas; reaparecem ao soltar,
  mantendo o cálculo em tempo real e a gravação explícita.
  Não há propriedades de Distância no painel esquerdo. Nomes, motivos e estados
  permanecem acessíveis; botões de ação possuem tooltips por foco/hover.
- Retornar a Ferramentas oculta as marcações sem descartar seleção, rascunho
  ou preferências. Reabrir Medidas retoma o contexto. A seleção entre linhas
  legadas continua explícita, sem criação ou escolha arbitrária de outro alvo.
- Calibração e recalibração confirmadas abrem diretamente Medidas → Distância,
  editando a mesma linha. O contrato, recibos, locks, confirmação de exclusão,
  recuperação por GET e prévia em tempo real permanecem preservados.

**Verificação da primeira organização:** TypeScript e diff aprovados. O recorte inicial de navegação passou
em 11 cenários. A primeira rodada completa passou em 127/135; as oito expectativas
de interface restantes foram adaptadas ao novo layout, sem reexecução final.
Por solicitação do usuário, a validação final será manual; não considerar esse
registro como aceite completo da etapa 11.
O refinamento de submenu, rodapé e ações junto à linha foi revisado estaticamente;
não houve execução de testes automatizados, conforme solicitado pelo usuário.

### 11. Fechar regressões e aceite real

Nesta fase, a validação final será manual por solicitação do usuário. Os
comandos automatizados abaixo permanecem como roteiro de referência, sem
execução para os últimos refinamentos visuais. A implementação das etapas 1 a
10 não substitui a confirmação do resultado real da etapa 0 nem este aceite.

- Completar a matriz abaixo nos testes existentes e nos novos testes de geometria/
  workspace de distância. Reutilizar fixtures compartilhadas sem misturar mocks
  com a evidência real da etapa 0.
- Rodar `pnpm --filter web test`, typecheck de web/API-client e
  `pnpm --filter @vetorthoplan/api-client verify:clinical`; conferir diff e links.
  Rodar lint e relatar seu resultado real; o parsing TS tem débito já documentado.
- Fazer aceite no navegador e com backend em caso sintético de ambiente de teste:
  criar, reabrir, editar, recalibrar, excluir e disputar revisão entre duas abas.
- Atualizar README da feature, roadmap TPLO e este plano com o estado entregue
  e qualquer pendência real. Não criar relatório datado extra por execução.

**Entrega:** ferramenta pronta para revisão e aceite, com evidência separada
entre testes simulados e integração real.

**Aceite:** nenhuma etapa pendente é marcada como implementada; acesso ao
ambiente necessário é resolvido antes de declarar o fluxo remoto validado.
O aceite completo exige evidência real de uma distância oficial em mm e da
jornada integrada em imagem calibrada. Tratar corretamente geometria salva
sem resultado é necessário, mas não basta para declarar Distância pronta.

## Matriz mínima de verificação

| Área | Casos que precisam passar |
| --- | --- |
| Contrato/geometria | Horizontal, vertical, diagonal, extremos nas bordas, imagem retangular, prévia reduzida, pontos coincidentes e resultado sem chave/unidade esperada. |
| Integridade | Documento com outros tipos, auditoria e TPLO; update/delete em alvo inexistente ou de outro tipo; ID repetido; limite global de 500 objetos. |
| Segurança BFF | Imagem de outro caso/organização, payload extra, resultado forjado, JSON inválido, corpo excessivo, imagem não pronta e DICOM bloqueado. |
| Concorrência | Duplo clique, distâncias distintas em paralelo, distância versus calibração/qualidade, duas abas e revisão alterada por leitura em segundo plano. |
| Recuperação | Resposta perdida após create/update/delete, GET antigo, resposta 200 malformada, geometria salva com medição ausente, revisão posterior incompatível, navegação durante conferência. |
| Ciclo de vida | Cancelar, trocar imagem/painel, sair/recarregar, excluir imagem/caso, logout e troca de organização; callbacks atrasados não recriam dados. |
| Experiência | Pan/zoom/mirror/fullscreen/resize, seleção sobreposta, toque, teclado completo, foco, nomes acessíveis, pt-BR/en, claro/escuro e movimento reduzido. |
| Regressões | Calibração linha/círculo, acesso a Ferramentas com/sem escala, Sonner de falha e retorno à aba sem loader desnecessário. |

## Próxima execução

Continuar pela **etapa 11**, fechando regressões globais e aceite real.
Transporte, comandos, recibos, rascunho, guards, leitura, criação, ajuste,
Salvar/Atualizar, exclusão com confirmação e camadas de valor estão conectados à UI.
Preservar a pendência explícita de evidência da etapa 0 e confirmar a serialização
exata dos pontos antes do aceite da integração real.
Ao concluir cada etapa, registrar aqui a evidência, os arquivos alterados e o
aceite. A etapa seguinte deve consumir a interface já verificada, sem reabrir
decisões resolvidas nem ampliar o escopo para outras ferramentas.
