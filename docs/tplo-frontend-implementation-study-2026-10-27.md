# Estudo do guia de implementação TPLO — 27/10/2026

Estudo das cinco páginas de `tplo_frontend_implementation_guide.pdf`, fornecido
pelo backend, cruzado com o código atual e com a
[revisão do Swagger publicado](./swagger-update-review-2026-10-27.md).
O conteúdo textual e os wireframes das cinco páginas foram inspecionados.
SHA-256 do PDF: `badb80b82a8f32a698b3dd5f98b49bdb921f5d60e80abe89b8ad6c6293e933c4`.

**Resultado:** o guia serve como roteiro de produto e integração. Não substitui
os schemas nem comprova o comportamento autenticado do servidor. A implementação
deve começar pela compatibilidade do contrato do plano, antes de novas telas.
Nenhuma funcionalidade foi implementada durante este estudo.

Atualização posterior — **27/10/2026**: as tarefas 1 e 2 foram concluídas.
A tarefa 3 teve sua decisão revisada após confirmação da equipe de backend:
qualidade radiográfica é interna e seu painel manual foi removido. As demais
tarefas continuam pendentes; os trechos de diagnóstico e a entrega anterior
da tarefa 3 registram o histórico, com a decisão vigente indicada abaixo.

## O que o documento orienta

| Página | Orientação | Consequência para o projeto |
| --- | --- | --- |
| 1 | Plano com revisão otimista, medidas/simulação, revisão clínica e relatórios | Reaproveitar a integração de calibração e ampliar o fluxo por etapas. |
| 2 | Qualidade radiográfica e elegibilidade, com cinco critérios persistidos | Decisão posterior do backend: processo interno, sem painel manual. Preservar os campos do contrato e respeitar a resposta e as recusas do servidor. |
| 3 | Pontos normalizados, linhas/ângulos interativos e resultados recalculados no backend | Separar prévia local de resultado persistido. Preservar matriz original e referência de calibração. |
| 4 | Revisão, auditoria, aprovação e finalização somente leitura | Separar estado de revisão, finalização e status do caso; não finalizar sem aprovação confirmada. |
| 5 | Serviços tipados, camadas de desenho, autosave com revisão e testes | Centralizar as escritas por imagem antes de adicionar várias ferramentas que alterem o mesmo plano. Moldes de implantes ficam para uma entrega posterior. |

O próprio PDF apresenta os desenhos como wireframes de orientação. Usaremos os
componentes, proporções, ícones e padrões atuais do projeto, preservando os
ajustes visuais recentes.

## O que já temos e o que falta

Já temos carregamento do plano, calibração por linha/círculo, coordenadas da
matriz original, zoom/pan, rascunhos por imagem, proteção de saída/exclusão,
controle de revisão e reconciliação de resposta perdida. Há uma elegibilidade
interna para futuras medidas, dependente da calibração persistida e sem edição
ou resultado indefinido.

Ainda não temos interfaces para ferramentas de medidas, landmarks TPLO,
qualidade, simulação, revisão, finalização ou relatórios. O painel atual tem
apenas as seções `case`, `images` e `calibration`.

O PUT do BFF também **não é um editor completo do plano**: aceita somente
`baseRevision` e `calibration`, com limite de 4 KiB para esse comando. Ele lê
o documento completo, altera a calibração e preserva os demais campos. Não
enviar novos campos para essa rota esperando que sejam aceitos, nem aumentar
indiscriminadamente seus limites para receber todo o canvas.

O título do PDF menciona backend/BFF publicados, mas isso não significa que
nosso BFF Next.js já exponha todos os recursos descritos.

## Cuidados identificados no cruzamento

### Compatibilidade antes de interface

Os schemas locais ainda rejeitam os novos campos de qualidade, medidas e
auditoria, conforme a reprodução de `502 INVALID_RESPONSE` na revisão do
Swagger. Atualizar apenas os tipos TypeScript não resolve o validador em runtime.

Além de declarar os campos novos, revisar a regra de **revisão zero** em
`ImagePlanSchema`: ela só conhece `schema_version`, `objects` vazio e valores
null/ausentes. Se o servidor devolver novos containers vazios de medidas, a
regra precisa reconhecer os defaults legítimos sem aceitar dados efetivamente
editados com revisão zero. A forma exata deve ser coberta por fixtures do novo
contrato, incluindo primeira abertura de uma imagem sem plano salvo.

Manter os campos adicionais nas gravações. O PUT clínico substitui o documento
completo; descartar campos desconhecidos pode apagar dados de outra etapa.

### Fluxo de produto e estados distintos

Manter a decisão já tomada com o usuário: **calibração salva → habilitar
Medidas**. O PDF não deve inverter essa dependência apenas porque menciona a
calibração no quarto passo do exemplo de medições.

Não unificar os seguintes estados em um único enum:

- `tplo_measurement.status`: `CALCULATED`, `LANDMARKS_REQUIRED` ou
  `IMAGE_DIMENSIONS_REQUIRED`.
- `tplo_measurement.acceptance`: `PASS`, `FAIL`, `NOT_ASSESSED`,
  `NOT_CONFIGURED` ou null, conforme o novo contrato.
- Critérios radiográficos: `PASS`, `FAIL` ou `NOT_ASSESSED`.
- `tplo.eligibility`: `PENDING`, `ELIGIBLE` ou `INELIGIBLE`.
- `clinical_validation.status`: `DRAFT`, `READY_FOR_REVIEW`, `APPROVED`
  ou `REJECTED`.
- Finalização: recurso versionado próprio, consultado por `/plan/finalization`.

O wireframe usa `FINALIZED` como apresentação. Não adicionar esse valor aos
enums de status do caso/revisão sem suporte contratual. Da mesma forma, um
resultado calculado não implica aceitação clínica ou aprovação.

### Checklist completo e protocolo configurável

Os cinco critérios de `radiographic_quality` são:

1. `true_lateral`;
2. `femoral_condyles_superimposed`;
3. `stifle_and_tarsus_included`;
4. `tibial_axis_centered`;
5. `tibial_plateau_visible`.

Uma checkbox desmarcada não distingue reprovação de item ainda não avaliado.
O componente precisa representar essa diferença. O PDF orienta bloquear
`ELIGIBLE` enquanto algum critério não for `PASS`; cumprir isso na interface
e tratar o backend como autoridade de validação, sem presumir que esses cinco
itens sejam todas as condições exigidas pelo servidor.

Consultar `clinical-protocol` para definições e tolerâncias; não fixar no
frontend listas/tolerâncias que dependam do ambiente. Respeitar `configured`,
`acceptance_enabled` e ausência de configuração. Os textos finais e critérios
clínicos do guia ainda dependem da homologação indicada no próprio documento.

### Um documento, uma sequência de gravações por imagem

Qualidade, landmarks, objetos e calibração compartilham a mesma revisão.
Criar escritores independentes para cada painel provocaria disputas entre
autosaves e risco de substituir partes do documento.

Ampliar a coordenação existente para comandos de campos explicitamente
permitidos. Cada comando deve preservar o restante do plano, usar a revisão
confirmada e tratar 409 sem sobrescrever alterações de outra sessão. Resultados
derivados, autor/data de auditoria e identidade clínica não são valores de
confiança fornecidos pelo navegador.

Autosave é uma etapa posterior à compatibilidade: agrupar alterações, gravar
ao concluir um gesto ou após pausa de digitação e limitar a uma gravação em
curso por imagem. Não enviar cada movimento de ponteiro, não reaplicar
automaticamente um conflito e não repetir comando com resultado incerto.
Preservar o comportamento atual do botão de salvar calibração até integrar
explicitamente essa mudança de produto.

## Ordem proposta: uma tarefa por vez

| Tarefa | Entrega limitada | Verificação para avançar |
| --- | --- | --- |
| **1. Compatibilidade do contrato — concluída** | Novo OpenAPI/proveniência preservados, tipos clínicos regenerados e schemas de leitura/preservação atualizados. | Planos antigos/novos e revisão zero carregam; calibração salva sem apagar qualidade, medidas ou auditoria; continuam os bloqueios de identidade, campos não permitidos e conflitos. |
| **2. Base compartilhada do planejamento — concluída** | Comandos de edição permitidos e coordenação por imagem; consultas tipadas/BFF para protocolo e tabela. | Escritas sequenciais preservam todo o documento; configuração ausente é representada; 409 e resposta perdida não provocam repetição indevida. |
| **3. Qualidade e elegibilidade — decisão revisada** | Processo interno do backend; painel manual removido após confirmação da equipe. | Qualidade e elegibilidade continuam sendo lidas e preservadas no contrato, sem formulário ou aprovação local. |
| **4. Medidas e landmarks — em andamento** | Estrutura/acesso ao painel Ferramentas concluídos; próxima entrega é distância entre dois pontos, seguida de ângulo/círculo e landmarks anatômicos. | Acesso depende da calibração confirmada; desenho, cálculo e persistência das medidas ainda não integram esta primeira entrega. |
| **5. Osteotomia e simulação** | Fragmento, referência e rotação; renderizar o resultado da simulação e consultar a tabela configurada. | Geometria persistida corresponde à transformação do servidor; tabela não configurada/sem correspondência não vira recomendação inventada. |
| **6. Revisão e auditoria** | Fluxo `DRAFT → READY_FOR_REVIEW → APPROVED/REJECTED`, observações e histórico. | Ações respeitam autorização e recusas do backend; auditoria vem do servidor; edição de plano aprovado segue a política confirmada. |
| **7. Finalização e relatórios** | Finalizar revisão aprovada, recuperar snapshot/versão e links PNG/PDF, aplicar somente leitura. | Resposta perdida é conciliada antes de novo POST; links expirados são renovados pela consulta; leitura/gravação respeitam finalização persistida. |

As tarefas 4 e 5 devem ser divididas em entregas menores quando chegarmos a
elas; não implementar todas as ferramentas e simulação em um único lote.
Revisar e testar cada tarefa antes de avançar. O aceite geral autenticado
continua reservado pelo usuário para o final, sem substituir os testes de cada
etapa.

### Primeiro lote concreto

Começar somente pela tarefa 1, envolvendo:

- `docs/openapi/clinical-api.openapi.json` e sua proveniência;
- `packages/api-client/src/generated/clinical-api.ts` e aliases clínicos novos;
- `apps/web/src/features/cases/schemas/image-plan.schema.ts`;
- leitura/merge de `apps/web/src/lib/server/image-plan-bff.ts`, apenas se
  necessário para preservar o novo formato;
- fixtures e testes de contrato/BFF/calibração para os campos novos e revisão zero.

Não incluir novos painéis, ferramentas, autosave ou finalização nesse lote.
Não relaxar todas as validações com passthrough genérico. Estruturas abertas
devem seguir exatamente os limites e tipos publicados no OpenAPI.

## Confirmações necessárias antes das etapas correspondentes

Não impedem iniciar a compatibilidade do contrato:

- Finalização: quais códigos de erro distinguem ausência de finalização,
  imagem inexistente e plano não aprovado? Como tratar repetição do POST para
  a mesma revisão e qual é a política de reabertura/nova versão?
- Somente leitura: o guia exige o bloqueio após finalizar; confirmar a garantia
  no backend e quais ações ainda são admitidas. Imutabilidade do snapshot não
  prova, sozinha, que o plano editável também esteja bloqueado.
- Simulação: convenção da matriz afim, ordem das transformações e referenciais
  de coordenadas, com exemplos de resultado para teste visual.
- Protocolo: nomes dos landmarks e medidas configuráveis, campos obrigatórios
  e exemplos reais de configuração, ausência de configuração e reprovação.
- Auditoria: perfis autorizados a revisar/aprovar e transições permitidas após
  uma mudança na calibração ou nos pontos de um plano revisado.

Moldes STL/OBJ ficam fora dessa sequência inicial, como orienta a página 5.
Precisarão de catálogo versionado, unidade, coordenadas, lateralidade, origem,
licença e checksum. Não são dependência para começar medidas/simulação TPLO.

O guia não resolve a questão dos pixels DICOM não quadrados. Manter a restrição
atual e o pedido já preparado para o momento combinado, sem inventar correção
somente no navegador.

## Limites deste estudo

Somente leitura do PDF/código e documentação do planejamento. Nenhum código
de produção, `.env`, contrato canônico ou dependência foi alterado. Os exemplos
do PDF não foram tratados como instrução para iniciar implementação automática.
Não houve nova chamada autenticada nem nova execução da suíte: este estudo
não altera o resultado nem o escopo da revisão automatizada anterior.

## Entrega da tarefa 1 — 27/10/2026

- OpenAPI publicado promovido ao canônico, com cópia original preservada:
  **18 caminhos, 23 operações, 54 schemas e 138 referências resolvidas**.
  Versão declarada `0.9.0`, SHA-256
  `e04b8d6d7e6046be92a8a35c3ba9f42259dd7ee6a71040b9d28a589d7b0e1c48`.
- Tipos clínicos regenerados pelo gerador instalado, sem editar o arquivo
  gerado à mão. Tipos de autenticação e dependências foram preservados.
  Novos aliases cobrem os quatro endpoints adicionais sem habilitar seus fluxos.
- Schemas de runtime atualizados para os campos novos, limites de propriedades,
  estados de aceitação, cinco critérios de qualidade e auditoria tipada.
  `required_measurements` aceita nomes configuráveis com até 50 itens.
- O BFF existente já faz merge preservando o documento completo; não foi
  necessário alterar seus comandos nem ampliar o corpo de 4 KiB. O navegador
  continua sem permissão para escrever qualidade, resultados ou auditoria
  por esse comando de calibração.
- Revisão zero reconhece os containers novos vazios e qualidade não avaliada,
  mas não aceita landmarks, referências, observações, decisões ou resultados
  como se ainda não tivessem sido persistidos.
- Os testes de regressão reproduziram o `502 INVALID_RESPONSE` antes do ajuste
  e passaram depois. O teste integrado usa transporte de navegador simulado,
  rotas reais do BFF com sessão JWT simulada e HTTP clínico simulado: confirma
  preservação de qualidade, inputs, resultados adicionais, avaliação do protocolo
  e auditoria ao salvar/reabrir uma calibração.
- Evidência geométrica histórica preservada: não foi trocado o hash da captura
  de 23/10. A ferramenta de reprodução usa o contrato original preservado por
  padrão, e os testes comparam os schemas de calibração atuais com essa base.
  A reprodução do código fixado do backend confirmou novamente os dez casos
  originais, sem modificar o repositório do backend ou os resultados registrados.

Validação: **370/370 testes** na suíte completa do web, executada com concorrência
de dois processos; TypeScript do web e do API client sem erros; verificador do
OpenAPI/checksums aprovado; lint dos arquivos TypeScript desta etapa sem erros.
Casos adicionais cobrem tanto aceitação dos limites publicados quanto rejeição
de payloads inválidos e campos fechados desconhecidos.

Esta entrega não inclui novos painéis, ferramentas, autosave nem finalização.
Não houve alteração de `.env`, dependências, chamadas clínicas autenticadas ou
mutação no ambiente publicado. Seus ajustes de interface/notificações já
existentes foram preservados. O aceite visual/autenticado continua para o teste
geral, conforme combinado. Próxima tarefa: base compartilhada do planejamento.

## Entrega da tarefa 2 — 27/10/2026

### Consultas de referência

- `GET /api/cases/tplo/clinical-protocol` encaminha a consulta tipada ao
  `/api/v1/tplo/clinical-protocol` pelo cliente clínico autenticado e com escopo
  de organização já existente.
- `GET /api/cases/tplo/rotation-table` consulta o endpoint clínico correspondente.
  Os filtros são opcionais: `tpa_degrees` de 0 a 90 e `blade_diameter_mm` positivo.
  Parâmetros repetidos, vazios, desconhecidos ou inválidos são recusados.
- Schemas seguem o contrato publicado preservado na tarefa 1. Definições abertas
  de medidas e entradas da tabela são preservadas nos tipos publicados; campos
  operacionais externos não são repassados. Erros expõem somente códigos seguros.
- `configured: false` e tabela configurada sem correspondência permanecem estados
  distintos. Não há estimativa, interpolação, recomendação ou configuração clínica
  inventada. Os indicadores de validação e recomendação seguem o contrato.
- Serviços de navegador usam `caseFetch`, mesma origem, `no-store` e cancelamento.
  Query options separam os filtros e reutilizam o QueryClient da organização,
  sem repetição automática ou persistência no navegador.

### Comandos compartilhados e revisão

O escritor existente agora atende calibração e um primeiro comando adicional
explícito, que prepara a tarefa 3:

```http
PATCH /api/cases/{caseId}/images/{imageId}/plan/edits
Content-Type: application/json
```

```json
{
  "kind": "radiographic-quality",
  "baseRevision": 1,
  "quality": {
    "true_lateral": "PASS",
    "femoral_condyles_superimposed": "NOT_ASSESSED",
    "stifle_and_tarsus_included": "NOT_ASSESSED",
    "tibial_axis_centered": "NOT_ASSESSED",
    "tibial_plateau_visible": "NOT_ASSESSED",
    "notes": null
  }
}
```

- O navegador não envia o documento completo. Esse comando aceita somente
  qualidade; não aceita resultado calculado, landmarks, objetos, aprovação,
  identidade de auditoria ou elegibilidade. Os próximos comandos serão adicionados
  explicitamente nas etapas correspondentes, sem abrir escrita genérica do plano.
- O BFF valida sessão/organização, origem, media type, IDs, pertencimento ao caso,
  estado READY e revisão. Lê o plano completo, altera somente qualidade e envia
  um único PUT clínico com a revisão confirmada. As recusas do backend continuam
  sendo a autoridade para as transições clínicas.
- O comando de qualidade tem limite próprio de **12 KiB** para comportar notas
  UTF-8; os schemas limitam as notas a 2000 caracteres. O comando antigo de
  calibração conserva os **4 KiB**, as verificações de matriz original e a
  restrição de pixels DICOM não quadrados. Qualidade não calibra a geometria.
- Calibração e qualidade usam o mesmo recibo e exclusão mútua por imagem. Uma
  solicitação idêntica em curso compartilha a promessa; outra intenção retorna
  `OPERATION_BLOCKED`, preservada no resultado ao chamador. Não há fila que
  reescreva revisões nem autosave ativado nesta etapa.
- Gravações sequenciais usam a revisão confirmada e preservam os outros campos.
  O recebimento de sucesso exige imagem correta, revisão seguinte e conteúdo
  correspondente. Critérios omitidos e notas ausentes são normalizados conforme
  os defaults do backend, evitando incerteza falsa na confirmação.
- Resposta perdida inicia somente GET de conferência. Se o plano ainda não
  comprovar o resultado, o comando continua incerto e bloqueado; não há outro
  PATCH/PUT. Uma revisão nova diferente vira conflito e conserva a intenção.
- `checkImagePlanSave` confere o comando retido; `discardPlanEditSave` permite
  descarte explícito de erro definitivo/conflito. A calibração não descarta uma
  intenção de qualidade pendente. Exclusão, navegação e elegibilidade continuam
  observando o bloqueio compartilhado, inclusive após desmontagem da tela.

### Revisão e verificação

**387/387 testes** na suíte completa do web, com concorrência de dois processos;
TypeScript do web e do API client sem erros; lint dos 14 arquivos TypeScript
desta etapa sem erros ou avisos; verificador do OpenAPI/checksums aprovado.

Os testes incluem as rotas Next.js reais, sessão/identidade JWT e HTTP clínico
simulados: verificam autenticação, troca de contexto recusada, headers sem cache,
origem/media type, limites de corpo, Unicode, revisão obsoleta antes do PUT,
preservação de calibração/qualidade/medidas/auditoria, sequência de comandos e
resposta perdida sem repetição. Também cobrem isolamento de consultas, conflitos,
concorrência, descarte e respostas tardias após exclusão.

Não houve alteração de `.env`, dependências, contrato OpenAPI ou operações no
servidor publicado nesta etapa. Os ajustes visuais/notificações preexistentes
foram preservados. O teste autenticado/visual permanece para o aceite geral
combinado; esta entrega prepara a integração, sem novos painéis ou ferramentas.
Próxima tarefa: **3. Qualidade e elegibilidade**, com os cinco critérios,
observações e apresentação do estado oficial retornado pelo backend.

## Entrega da tarefa 3 — 27/10/2026

**Decisão posterior da equipe de backend:** qualidade radiográfica é interna.
O painel, seu acesso lateral e o hook de edição descritos abaixo foram
removidos. A descrição seguinte registra a entrega anterior, não o fluxo
vigente. O contrato, a preservação dos dados e os testes da camada de
integração permanecem; não há avaliação manual pelo usuário no workspace.

### Painel de qualidade

- Nova área **Qualidade radiográfica**, com ícone de checklist depois da régua
  na barra lateral do workspace. A régua continua dedicada à calibração.
  O painel usa o mesmo cabeçalho, largura, rolagem, tokens de campos/foco e
  ações do projeto; rótulos e mensagens estão em português e inglês.
- Os cinco critérios publicados aparecem integralmente, cada um com três
  opções explícitas: **Não avaliado**, **Atende** e **Não atende**. Nenhum item
  começa aprovado. Os controles nativos têm rótulos associados e acesso por
  teclado; observações são opcionais e limitadas a 2000 caracteres.
- Gravação explícita em **Salvar avaliação**, pelo comando restrito preparado
  na tarefa 2, com a revisão confirmada. Não há autosave nem gravação por
  movimento/interação. A reabertura lê os critérios e notas persistidos.
- A elegibilidade exibida vem exclusivamente de `document.tplo.eligibility`.
  Ausência de avaliação, carregamento, erro, `PENDING`, `ELIGIBLE` e `INELIGIBLE`
  são representados separadamente. Ajustes locais recebem aviso de que a
  elegibilidade mostrada pertence à versão salva; cinco itens locais PASS
  não geram uma aprovação ou elegibilidade artificial.
- Este painel não envia `tplo.eligibility`, lateralidade, revisão ou resultados
  derivados. Continua a depender do estado/validações retornados pelo backend;
  não cria uma ação de aprovação clínica. A habilitação das ferramentas de
  medidas será integrada na etapa 4.

### Proteção de dados e revisão adicional

- Rascunhos de qualidade permanecem somente no QueryClient da organização,
  separados por caso/imagem. Sobrevivem à desmontagem da tela, sem persistência
  em armazenamento do navegador ou transferência para outra organização.
- Qualidade e calibração compartilham bloqueio e revisão, mas cada painel
  apresenta somente a recuperação do próprio comando. Uma resposta perdida
  da qualidade não aparece como erro/ação de conferência da calibração.
- Antes de editar a outra etapa, o usuário conclui ou descarta o rascunho atual.
  O bloqueio também é verificado no escritor, independentemente de um controle
  antigo ainda aparentar estar habilitado. Nenhuma revisão é alterada para
  reaplicar automaticamente uma intenção antiga.
- Saída da imagem, fechamento da página e exclusão do caso/imagem protegem os
  rascunhos. A confirmação de descarte usa o guard existente; gravação incerta
  não pode ser descartada nem permitir navegação/exclusão.
- A confirmação de qualidade limpa somente o rascunho correspondente, inclusive
  após desmontagem. Um rascunho posterior diferente nunca é apagado por uma
  resposta antiga. Exclusão confirmada remove também o cache de qualidade.
- Conflito mantém critérios/notas e permite descartar para carregar a versão
  salva. Resposta perdida segue somente GET de conferência, sem novo PATCH;
  recusa clínica e erros de leitura têm mensagens e recuperação visíveis.
- A avaliação exige imagem READY e visualização decodificada. A restrição de
  geometria DICOM permanece na calibração; avaliar qualidade não altera a escala.

### Verificação

**401/401 testes** na suíte completa do web. Os 14 casos adicionados cobrem UI,
transporte e coordenação de rascunhos, com HTTP simulado. Incluem os cinco
critérios, três estados, notas/limites, ausência de autosave, persistência e
reabertura, autoridade da elegibilidade, isolamento, descarte/navegação,
exclusão, conflitos, recusa clínica, resposta perdida, eventos tardios e
confirmação após desmontagem. As regressões de calibração continuam passando.

TypeScript do web e do API client aprovados; lint dos 14 arquivos TypeScript
da etapa sem erros/avisos após revisão; OpenAPI/checksums preservados e
verificados. A última revisão incluiu as dependências do guard de navegação e
os testes direcionados correspondentes passaram novamente.

O aceite visual em navegador real, responsividade/temas e comportamento com a
API autenticada continuam para o teste geral combinado, com roteiro no documento
de aceite. Não houve mutação no servidor publicado, alteração de `.env`,
dependências ou novos endpoints clínicos. Próximo lote: tarefa 4, começando por
uma ferramenta de medidas de cada vez.
