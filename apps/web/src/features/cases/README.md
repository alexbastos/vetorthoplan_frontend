# Feature de Casos

O menu de edição no quadro usa `ViewerMeasurementCard`, compartilhado por
Distância, Ângulo e círculos anteriores. O card escuro de 224px reúne cabeçalho
com exclusão, valor em tempo real, modos aplicáveis, ajustes com rótulos e
exibição do valor. Raio/Diâmetro e os seis ângulos predefinidos ficam visíveis,
sem submenus. Valores e ações usam os mesmos handlers, permissões e recibos.
X/check continuam junto à marcação após a interação. O contêiner limita a largura
à área disponível e permite rolagem vertical em quadros menores. Ferramentas
abre diretamente a lista de opções sob o rótulo Medidas, sem página intermediária
nem botão de voltar. O cabeçalho mantém o título e ícone de Ferramentas.
As opções de Medidas usam uma grade de duas colunas e `CasePanelChoice`,
compartilhado com a seleção de forma na calibração: botões de 40px com ícone,
rótulo e borda/fundo de seleção pelos mesmos tokens do DS. Medidas adicionais
permanece desabilitada e círculos anteriores mantêm seu acesso separado.

A ação Mover foi retirada dos cards: arrastar o corpo da marcação move o conjunto,
enquanto as alças e os controles de pontos ajustam suas extremidades. A seleção
editável retoma um editor sem alterações após salvar/cancelar, preservando
bloqueios e a escolha explícita de Pan quando o editor já está aberto. Em Exibição,
o rótulo é estático e somente o olhinho alterna o texto; o ícone indica o estado,
sem fundo persistente de seleção.

O acesso principal a Círculo reutiliza uma linha salva em Distância.
O menu no quadro alterna Raio e Diâmetro; o acesso a
Distância retorna à linha sem círculo. As visualizações usam os mesmos dois pontos e o mesmo comprimento calculado
pelo backend. As circunferências são guias visuais amarelas, enquanto a linha
permanece ciano. A escolha do modo fica no cache da sessão por imagem/linha;
editar e salvar continua atualizando uma `LINE`, sem duplicar objetos nem alterar
a escala. Calibrar/recalibrar retorna a Comprimento. Objetos `CIRCLE` anteriores
mantêm seu fluxo de leitura, edição, recuperação e exclusão pelo acesso
“Círculos salvos anteriormente”. Detalhes no
[plano de Círculo](../../../../../docs/circle-tool-implementation-plan.md).

Esta feature concentra a experiência de casos clínicos da área autenticada.
A rota `/app/cases` hospeda os estados de listagem e vazio, enquanto
`/app/cases/new` hospeda o cadastro e o passo opcional de radiografia.
`/app/cases/[caseId]/plan` abre o quadro com os dados clínicos persistidos.
As rotas importam somente a interface pública exposta por `index.ts`.

O quadro mantém o shell focado, o painel de dados e o espaço do visualizador.
Dados do caso, lista de radiografias, upload, prévia, calibração e qualidade
radiográfica usam os contratos clínicos integrados. O planejamento segue a
integração por etapas; dados provisórios não substituem dados persistidos.

O quadro apresenta estados separados para carregamento, caso ausente e falha
de leitura. Um caso `DRAFT` sem imagem pode ser aberto e consultado;
a área de imagens apresenta o estado vazio e permite adicionar radiografias.

O shell compartilhado conhece apenas o item de navegação. Conteúdo, estados,
validação e integrações pertencem a esta feature.

## Animações de entrada

`CasesPageMotion` e `CasesContentMotion` são wrappers visuais finos. A lógica
GSAP fica em `hooks/animations/`: `use-cases-page-entrance.ts` coordena título,
descrição e ação do cabeçalho; `use-cases-content-entrance.ts` coordena os
estados `empty`, `list` e `error`.

O conteúdo monta junto com o resultado da consulta. Na lista, o wrapper fica
dentro do conteúdo resolvido pelo Suspense, para iniciar quando os filtros
e as linhas realmente existem. Atualizações dos dados e trocas de filtro
não reiniciam a entrada do cabeçalho ou do conteúdo já montado.

O estado vazio revela ilustração, textos e ação em aproximadamente 0,92 s.
A lista revela os filtros antes das linhas, com stagger limitado a 0,36 s e
até 12 linhas animadas individualmente; as demais entram no fade do contêiner.
Um filtro inicialmente vazio também recebe uma entrada suave.

`cases-motion.module.css` reserva o layout e impede que o conteúdo apareça
antes da preparação GSAP. A proteção se aplica somente com scripting habilitado
e sem preferência por movimento reduzido. Os hooks usam `gsap.matchMedia()`,
revertem o contexto ao desmontar e removem os estilos temporários ao concluir.
A transição de destino após login continua coordenada pelo AppShell.

Os marcadores `data-cases-*` e `data-empty-state-part` são os pontos de seleção;
as animações não dependem das classes que definem a apresentação dos componentes.

## Seam de dados

O layout de casos prepara o contexto clínico pelo BFF antes de montar consultas
e formulários. Em JWT, uma organização ativa é selecionada automaticamente;
havendo várias, o usuário escolhe. POST/PUT `/api/cases/context` devolvem somente
metadados públicos; tokens gerais e clínicos ficam no servidor/cookies cifrados
HttpOnly. A clínica recebe apenas o token da organização, emitido na troca
confirmada pelo backend. Expiração usa nova troca, sem misturar refresh tokens.

O navegador informa o contexto esperado em `X-Clinical-Organization`; o BFF
compara com a seleção/associação atual antes de chamar a clínica. Cada contexto
usa QueryClient próprio; troca/saída descarta consultas e URLs de prévia.
`case-fetch.ts` só atende rotas BFF de casos; transporte binário permanece no
serviço próprio e não recebe Bearer/cabeçalho de contexto. Modo local continua
disponível exclusivamente em development/test. Aceite real de JWT, organização,
storage e CORS está reservado à jornada final.

`CasesRepository` permanece apenas para as operações antigas de desenvolvimento
e para os testes dessas regras. A listagem, o detalhe, a criação, o upload, a
ingestão e a prévia do produto integrado usam serviços da mesma origem em
`features/cases/services` e rotas BFF em `app/api/cases`. A listagem pagina por
cursor; o detalhe e as imagens são lidos separadamente pelo ID do caso.

Durante o desenvolvimento, `createInMemoryCasesAdapter` permanece para testes
das operações provisórias de arquivo e calibração. Seus arquivos em memória
não aparecem no quadro conectado à API clínica. Builds de produção usam
`createFrontendOnlyCasesAdapter` nesses fluxos ainda provisórios.

O contrato clínico **0.9.0** já está versionado. A atualização dos fluxos segue o [plano por tarefas](../../../../../docs/clinical-remote-integration-status.md): sexo obrigatório, idempotência da sessão, leitura dos campos/estados de imagem, retomada após refresh, nascimento/idade, retry operacional, cancelamento de sessão, exclusão persistida e validação de peso estão implementados. Testes reais integrados permanecem pendentes. A listagem usa `GET /api/cases`
pela mesma origem, com busca após 350 ms, filtro por status e paginação por
cursor. As contagens dos filtros vêm de `status_counts`, não dos itens já
carregados. O estado `READY` aparece como “Pronto”, sem supor que o caso foi
concluído. A resposta de lista não inclui prévia; o cartão não inventa uma.

A idade declarada usa anos e meses adicionais na interface e continua em meses
no HTTP, de zero a 600. Ambos vazios significam desconhecido. Com nascimento,
a idade fica somente para leitura e a tela envia apenas a data como entrada de
idade; o backend calcula na criação. A prévia usa meses completos na data UTC
do navegador e não entra no payload, preservando corpo/chave no replay após
virada de data. Ao limpar nascimento, o rascunho da idade declarada retorna.
O BFF também aceita ambos os campos HTTP e deixa o backend validar coerência.
A leitura exige/preserva `age_source` e `age_reference_date`, ambos anuláveis;
mostra a idade devolvida em anos/meses com origem e referência disponíveis,
sem atualizá-la pelo relógio local. O máximo de 600 meses vale para idade
declarada na criação, sem bloquear respostas calculadas pelo nascimento.

Peso usa regras compartilhadas em `schemas/case-weight.schema.ts`: opcional,
maior que zero, até 99.999,99 kg e com até duas casas. O formulário aceita
vírgula/ponto, cinco dígitos inteiros e duas casas. Edições inválidas são recusadas
integralmente, mantendo o valor anterior sem aviso novo, sem remover sinais,
unidades ou truncar decimais silenciosamente. A validação de envio continua
tratando zero e valores incompletos. O payload envia string decimal
com ponto ou `null`. BFF de criação também aceita número; respostas exigem
string decimal válida ou `null`, preservada no modelo e localizada só na
exibição. A serialização real do novo ambiente será conferida na jornada final;
o OpenAPI sem regex não foi interpretado como aceitação de texto arbitrário.

O quadro abre um caso pelo `id` e apresenta o título, paciente, sexo, idade,
peso, notas e status reais, inclusive após refresh. Caso ausente e falha de
leitura têm estados próprios. O contrato de detalhe não inclui imagens; o
quadro consulta a lista de radiografias pela rota própria e só permite upload
por sessão clínica. A rota de criação recebe apenas os campos aceitos pelo
contrato e exige uma `Idempotency-Key` UUID por tentativa lógica. O formulário
mantém a mesma chave e o mesmo corpo após falha de rede; ao alterar os dados,
gera outra chave. O primeiro passo persiste o caso em `DRAFT`; o segundo permite
concluir sem radiografia e abrir o quadro pelo `id` recebido. O passo opcional
aceita múltiplos arquivos DICOM, PNG ou JPEG de até 100 MiB cada, com uma sessão por arquivo, calcula SHA-256 em um
Worker e cria a sessão `PENDING_UPLOAD` pelo BFF. A assinatura fica apenas na
memória da tela e é descartada quando expira ou quando a pessoa sai. A sessão
não significa que o arquivo foi transportado. Cada comando de criação de sessão
guarda em memória uma chave UUID e os metadados, antes de enviar o POST. Após
resposta perdida, a tentativa manual reutiliza a mesma chave e não recalcula o
checksum. Arquivos/comandos diferentes recebem chaves diferentes. Após uma
sessão conhecida ou assinatura expirada, um novo envio explícito começa outro
comando. Conflito 409 da sessão é separado do limite e não oferece retry cego.
A tela envia o formulário assinado
diretamente ao storage e confirma pelo BFF. Depois de `202 QUARANTINED`, mostra
o `jobId` e a ingestão pendente, sem anunciar imagem pronta. Falha de rede no
transporte pode ser sondada pela confirmação; `object_not_found` tem retry curto,
e uma confirmação repetida é idempotente. A URL e os campos assinados são
descartados ao iniciar o transporte. O job é consultado a cada dois segundos
enquanto estiver na fila ou em processamento, e a lista de imagens é atualizada
quando termina. O `jobId` permanece no cache em memória ao navegar para o quadro.
O quadro consulta a lista novamente após refresh, mostra
os estados reais e permite novo upload em caso existente. A imagem só aparece
como conteúdo aprovado quando a lista devolve `READY`. Para uma imagem `READY`
com `preview_available`, o quadro consulta a prévia temporária pelo BFF e exibe
o PNG em um viewer de leitura com zoom, pan e tela cheia. A assinatura é renovada
antes de vencer e não é persistida. As ferramentas de marcação e calibração
aguardam alinhamentos de geometria; duplicar depende de contrato.
Os campos de geometria DICOM e `job_id` agora chegam ao navegador; valores
nulos são preservados e não viram escala clínica. `FAILED` e `CANCELLED` são
estados terminais sem prévia, sem bloquear a leitura das demais imagens.
O hook `useCaseIngestions` reconstrói os vínculos após refresh usando a lista
persistida. Quando necessário, descobre o job pela rota BFF de imagem, que
valida caso e identidade antes de consultar a API clínica. Job nulo, 404 e
falhas de leitura interrompem consultas automáticas e oferecem atualização
manual. O quadro e a área de upload compartilham o monitor; jobs conhecidos
usam a mesma chave de cache. Ao terminar, leituras antigas da lista são
canceladas antes da reconciliação. Só a imagem persistida pode afirmar `READY`.
Jobs em `FAILED` podem ser reenfileirados explicitamente por
`POST /api/cases/{caseId}/jobs/{jobId}/retry`; o BFF consulta o job e valida
seu caso antes de alterar qualquer estado. A tentativa usa o mesmo job e
arquivo. Clique duplo compartilha um comando em andamento no QueryClient.
409 e resposta perdida levam à consulta do job, sem segundo POST automático.
Se continuar o mesmo `FAILED` e o resultado for indefinido, a ação apenas
verifica até observar uma transição. Esse estado fica em memória; após refresh,
uma ação explícita começa consultando o job novamente. Novo agendamento confirmado
ou leitura nova de job ativo permite retomar o polling mesmo antes da imagem
sair de `FAILED`; cache antigo sozinho não permite isso. Rejeição exige novo
arquivo, e apenas a lista persistida pode anunciar `READY`.
Sessões pendentes são canceladas por
`DELETE /api/cases/{caseId}/image-uploads/{uploadId}`, sem corpo. O BFF resolve
o vínculo pela lista de imagens antes da mutação. A fila usa
`createCaseFileUploadQueue`, assinada pelo hook com `useSyncExternalStore`.
Antes de existir sessão, remover interrompe somente o trabalho local. Durante
criação, o cancelamento aguarda os IDs; se a resposta se perder, recupera a
mesma sessão com a chave original para cancelá-la sem transportar o arquivo.
Transporte/confirmação podem ser abortados localmente, com requisição
independente para cancelar a sessão. Se a confirmação já tiver ocorrido,
a linha é mantida e o processamento acompanhado. Erros de cancelamento
preservam a seleção; 404 não é anunciado como exclusão. Reiniciar um transporte
falho cancela a sessão anterior antes de emitir outro comando.
Assinaturas não ficam no estado/cache; sair da tela faz cleanup local e tenta
cancelar sessões pendentes, preservando confirmados. Fechar a aba abruptamente
não garante entrega dessas requisições. A URL não é revogável, e uploads
tardios dependem da limpeza do backend após expiração. A lista persistida
também permite cancelar `PENDING_UPLOAD` após refresh.

A fila bloqueia conteúdo repetido localmente por SHA-256. Após recarregar ou
em outra aba, a criação da sessão pode retornar `409 IMAGE_UPLOAD_DUPLICATE`;
o BFF preserva esse código sem expor detalhes. A fila aplica a mesma mensagem
curta, aviso Sonner e remoção local após quatro segundos, tanto na criação
quanto no modal do painel. Não envia os bytes nem cancela/exclui o upload ou a
imagem existentes. Conflitos de idempotência e limite de uploads mantêm seu
tratamento próprio; a proteção concorrente definitiva é responsabilidade da API.

Exclusão persistida usa `DELETE /api/cases/{caseId}/images/{imageId}`. O BFF
valida a imagem e seu caso antes de encaminhar a operação. Quadro e fila de
arquivos confirmados pedem confirmação; seleção local e cancelamento de sessão
mantêm ações distintas. O backend decide os bloqueios de sessão válida/job ativo.
409 preserva a imagem; 404/resposta perdida exigem reconciliação por leitura,
sem repetição automática da mutação. Depois de 204/ausência confirmada, o comando
cancela leituras antigas, limpa URL de prévia e jobs/referências e remove somente
a imagem afetada. Recibos em memória impedem que uma consulta antiga restaure o
conteúdo; refresh consulta novamente o backend. Isso não comprova limpeza física
de original/prévia/plano/job, reservada ao teste integrado.
As rotas BFF não expõem tokens ao navegador.

Renomear usa `PATCH /api/cases/{caseId}/images/{imageId}`, após validação do
vínculo com o caso. O modal altera `display_name`, preserva a extensão e
atualiza o nome exibido na lista e no viewer sem substituir o arquivo.
Excluir o caso usa `DELETE /api/cases/{caseId}` pelo botão no rodapé dos
detalhes, com confirmação. Bloqueios 409 preservam os dados; falhas ambíguas
exigem consulta do caso antes de qualquer nova tentativa. A exclusão confirmada
limpa o cache daquele caso e retorna à lista. Veja o
[roteiro de aceite](../../../../../docs/clinical-api-0.9.0-manual-test-checklist.md#renomeação-e-exclusão-de-caso).

A persistência remota de calibração está disponível por GET/PUT em
`/api/cases/{caseId}/images/{imageId}/plan`. O navegador envia somente
`baseRevision` e `calibration`; o BFF valida imagem/organização e lê o plano
atual antes de alterar a referência, preservando seus demais campos. Mudança
de revisão exige conciliação explícita. Resposta perdida leva à consulta do
plano e não a um segundo PUT automático; um resultado ainda indefinido mantém
o recibo em memória e bloqueia operações destrutivas concorrentes. Leituras
antigas não devem restaurar plano excluído nem substituir confirmação mais nova.
O acesso Imagem conecta `CaseImageWorkspace` ao plano remoto, com controles de
calibração por linha/círculo e medida em mm/cm. A prévia precisa estar
decodificada e a imagem deve ter dimensões originais e geometria suportada.
O visualizador usa coordenadas da matriz original e bordas inclusivas; os
helpers legados preservam sua convenção anterior por padrão. A referência salva
aparece somente ao abrir a calibração. O editor não é
reiniciado ao renovar a URL temporária da prévia. Controles por teclado e
descarte estão disponíveis. Rascunhos, bloqueios e recuperação foram integrados;
o aceite visual/autenticado segue pendente, conforme o
[roteiro de aceite da calibração](../../../../../docs/calibration-acceptance-2026-10-26.md).

## Integração TPLO — 27/10/2026

A tarefa 1 alinhou SDK, schemas e BFF ao OpenAPI publicado, incluindo protocolo,
tabela de rotação, qualidade, resultados e elegibilidade. O plano preserva os
campos clínicos devolvidos pela API; valores derivados não são inputs do editor.
Veja o [estudo de implementação](../../../../../docs/tplo-frontend-implementation-study-2026-10-27.md).

Na tarefa 2, calibração e qualidade passaram a compartilhar `ImagePlanSaveState`
e `requestPlanEditSave`. Comandos em curso idênticos compartilham a promessa;
intenções diferentes não são enfileiradas nem reaplicadas com revisão alterada.
Resposta perdida mantém o comando e permite conferência por leitura; conflitos
preservam a intenção até uma decisão explícita. `discardPlanEditSave` não
descarta gravações incertas. O PUT de calibração continua restrito à intenção
validada; o encaminhamento para a primeira distância está descrito abaixo.

O comando adicional `PATCH /api/cases/{caseId}/images/{imageId}/plan/edits` aceita
`{ kind: "radiographic-quality", baseRevision, quality }`. O BFF valida revisão,
imagem/caso e faz merge somente desse campo. Resultados, revisão clínica,
auditoria e elegibilidade não são inputs permitidos nesse comando.

Referências anatômicas — etapas 1 a 10: `TploLandmarksInputSchema` separa os quatro
pontos/método da leitura de resultados. `landmarks-set` e `landmarks-clear`
estão definidos em `SaveLandmarksSchema` e registrados nas uniões operacionais
`SavePlanEditSchema`/`PlanSaveCommandSchema`. `applyPlanCommand` altera o conjunto único
e remove os derivados dependentes `tplo_measurement`/`tplo_correction`, preservando
os demais campos. `planCommandMatches` exige revisão posterior e compara os quatro
pontos/método ou ausência do conjunto, sem UUID ou resultado calculado no input.
O serviço usa o PATCH existente, com limite de 4 KiB, e o BFF confere acesso,
imagem/caso e revisão antes de um único PUT. Salvar exige dimensões originais e
ausência de anisotropia DICOM não suportada, sem exigir escala; remover dispensa
esses preflights de geometria. Respostas de escrita exigem revisão incrementada
exatamente uma vez e conjunto correspondente; falhas após tentativa preservam
incerteza. O writer reconhece o owner `landmarks` sem UUID e encaminha o recibo
para Ferramentas. `LandmarksEditor` oferece a base de rascunho parcial local;
somente o comando completo pode ser enviado ou corresponder à confirmação.
O writer limpa apenas esse rascunho exato. A chave `imageLandmarksDraft` participa
dos guards de edição/saída/exclusão e da limpeza por imagem/caso.
`useLandmarksSaveRecovery` compartilha a recuperação de Ângulo/Círculo, com
conferência por GET sem novo PUT e descarte explícito de erro/conflito. A ausência
do conjunto em revisão posterior pode retornar `LANDMARKS_ALREADY_REMOVED`, sem
exigir ausência dos derivados TPLO. Contexto, geração, query e comando capturados
protegem callbacks antigos. Recibos pendentes têm card próprio em Ferramentas,
inclusive sem escala; a entrada para criar/editar continua desabilitada.
`useImageLandmarks` mantém o conjunto único com método, pontos parciais e ponto
ativo no rascunho por imagem. Abrir retoma esse estado ou edita o conjunto salvo,
sem duplicar referências ou inicializá-las pela calibração. Seleção não conta
como alteração clínica; somente os quatro pontos completos formam um comando.
O hook compartilha locks, bloqueia revisão antiga sem rebase, conserva os ajustes
até descarte explícito e protege ações com geração/contexto/query capturados.
Não há autosave. O workspace inclui os ajustes locais na saída e fecha o editor
limpo antes de calibrar.

A etapa 5 prepara o canal `landmarks` de `ViewerEditor` para o conjunto completo,
sem UUID nem marcador de calibração. `landmarks-geometry` converte os quatro pontos
entre coordenadas normalizadas e pixels originais, conservando os pontos não
ajustados. `landmarks-interaction` trata hit tests em tela, ajuste individual e
movimento limitado do conjunto pelos segmentos, incluindo pontos coincidentes.
O visualizador mantém o gesto transitório, cancela por Escape/perda de captura ou
contexto e confirma somente ao terminar o arraste; setas/Shift e espelhamento usam
a matriz original. O overlay do editor usa pontos verdes e segmentos ciano do DS,
com tamanho estável em tela. A ligação do ajuste completo é descrita na etapa 8 abaixo.

A etapa 6 liga a leitura dos salvos pelo plano/revisão atuais.
`selectSavedLandmarks` separa TPA e os dois comprimentos oficiais, distingue método,
estados, ausência, dados inválidos e leitura não confirmada. TPA aceita 0°/90° e
dispensa escala; mm exigem fingerprint da calibração vigente e validação por campo.
Ausência do conjunto ignora o resultado residual; identidade de outra imagem
impede exibir seus pontos. Falha de leitura conserva a geometria da imagem correta,
com valores indisponíveis; escrita em andamento/incerta e conflito também suspendem
a confirmação, inclusive quando o GET posterior ao conflito falha.
`LandmarksOverlay` e `CaseImageLandmarksValues` compartilham os salvos somente com
Ferramentas/Referências ativos, com pontos verdes, segmentos/TPA ciano, numeração,
método preservado, revisão e motivos de indisponibilidade em pt-BR/en. A comparação
por tolerância fica separada da geometria e da validação clínica, sem consulta
nova de protocolo. `hiddenLandmarksValue` é uma preferência local da imagem;
não cria flags remotas.

A etapa 7 liga o rascunho parcial ao visualizador pelo canal próprio de referências.
`landmarks-placement` converte somente os pontos presentes e prepara o cursor de
teclado na matriz original. `ViewerLandmarksPlacementOverlay` separa pontos/segmentos
confirmados da colocação provisória. `CaseImageLandmarksCreationControls` mostra os
quatro nomes/ordem, progresso e seleção para reposicionar por clique/toque ou
prévia pelas setas/Shift seguida de Enter. Movimento e hover não confirmam pontos;
um arraste impede a colocação, mesmo retornando à origem. Escape/cancelamento do
gesto conservam os pontos já posicionados; sair/voltar retoma o rascunho. Descartar
é explícito e não altera o plano salvo. Snapshot e geração protegem cada avanço,
seleção e callback antigo; revisão, permissões, dimensões, DICOM e concorrência
continuam bloqueando a colocação. O posicionamento parcial não mostra TPA nem grava.

A etapa 8 liga o conjunto completo a `CaseImageLandmarksAdjustmentControls`, com
seleção do corpo/quatro pontos, arraste, setas/Shift, atalhos 1–5 e espelhamento.
`changeLandmarksGeometry` confirma os quatro pontos atomicamente no rascunho,
preservando método e contexto; o movimento do conjunto permanece limitado sem
deformação. Coordenadas não alteradas conservam exatamente sua normalização.
`landmarksValuesPreview` usa os vetores em pixels originais e a fórmula de TPA
confirmada, aceitando 0°/90°. TPA dispensa escala; mm usam a escala salva. Coincidência
continua aceita pelo comando e deixa a prévia indisponível. Quadro e card compartilham
estimativas `≈`, separadas dos resultados oficiais e sem herdar aceitação clínica.
Gesto transitório tem dono por contexto/geração/revisão; cancelar restaura a geometria
anterior e concluir altera apenas o rascunho, sem autosave ou cálculo enviado ao BFF.
Após marcar os quatro pontos, selecione 1 a 4 no card e ajuste a alça por
arraste ou setas. A marcação por clique ou toque fica no rascunho incompleto.

A etapa 9 compõe o card compartilhado com método explícito, quatro pontos, TPA,
ajustes e olhinho local, sem mover pontos ao trocar método. `CaseImageLandmarksActions`
e `useLandmarksSaveActions` conectam X/check, salvar/conferir/cancelar, Sonner e foco
ao writer existente. Somente confirmação explícita envia o comando completo;
incerteza usa GET e conflito exige descarte. Ack limpa apenas o rascunho correspondente
e retorna à leitura/seleção; Editar reabre o salvo sem autosave. Snapshot/contexto,
gerações e locks preservam outros ajustes e impedem mensagens de contexto antigo.
O protocolo usa a consulta/cache da organização existentes, sem loader bloqueante
nem GET por movimento. Configuração ausente é distinta de erro, não bloqueia TPA
e não equivale a validação clínica. A opção fica sob Planejamento, com os bloqueios
existentes, e a lixeira singleton não exige UUID.

A etapa 10 habilita a entrada pública e liga a lixeira a `useLandmarksDeletion`/
`CaseImageLandmarksDeleteDialog`. A confirmação captura revisão, método/quatro
pontos, rascunho e contexto; cancelar mantém o rascunho. Confirmar cria
`landmarks-clear` e usa o writer existente. Incerteza usa somente GET, inclusive
após remontagem; conflito exige descarte explícito para carregar o salvo.
Ausência em revisão posterior é reconhecida sem outra escrita nem exigência de
ausência do resultado derivado. Clear dispensa dimensões/escala/anisotropia, com
os guards de READY, caso/contexto, revisão e writer. O gate global de Ferramentas
conserva a calibração exigida pelo produto. O diálogo bloqueia interação, usa
portal em fullscreen e restaura foco ao cancelar/concluir. Ack limpa somente o
rascunho correspondente e aguarda uma nova criação explícita. Calibração e o
retorno a Distância usando a linha salva permanecem preservados.

Na organização de apresentação aprovada após a etapa 10, a entrada se chama
**TPA** e abre consulta quando já existe conjunto salvo; **Editar pontos** inicia
o ajuste explicitamente, sem impedir a retomada de rascunho. O posicionamento
destaca somente o ponto atual e deixa a revisão dos quatro acessível. TPA e estado
salvo/alterado/leitura não confirmada ocupam o primeiro nível do card. Detalhes
da medida, seleção de ponto, troca do método, ajuda e protocolo ficam expansíveis
com HTML nativo. O método atual permanece visível; sua troca preserva os pontos.
Erros/conflitos/recuperação, indicação de validação clínica não realizada e
resultado fora da tolerância continuam expostos. Falha de leitura oferece nova
consulta na própria área TPA, inclusive quando ainda não há conjunto salvo.
**Marcar pontos** oferece início explícito quando não há conjunto; não há criação
automática após remoção. O catálogo omite a opção futura desabilitada e preserva
as ferramentas disponíveis e o acesso aos círculos anteriores. Cálculo, contrato,
writer, X/check contextual e fluxo de calibração permanecem os mesmos.

Aceite manual integrado pendente na etapa 11; checagens estáticas não o substituem.
Acompanhar o
[plano de Referências anatômicas](../../../../../docs/anatomical-references-implementation-plan.md).

Na integração de Distância, essa mesma rota BFF também aceita os comandos
estritos `distance-create`, `distance-update` e `distance-delete`. Eles exigem
imagem pronta do caso, dimensões, ausência de anisotropia DICOM não suportada,
resultado de calibração e revisão atual. O corpo de distância tem limite de
4 KiB de UTF-8; qualidade conserva 12 KiB. Falta de escala retorna
`CALIBRATION_REQUIRED`; recusas locais não emitem PUT e falhas após tentativa
de escrita preservam incerteza. O serviço/writer do navegador já envia os três
comandos com o mesmo recibo por imagem: perdas de resposta são conferidas por
GET e não repetem a escrita. Tipo de comando e ID do alvo identificam o owner;
conferir/descartar exige o comando exato capturado, sem tomar o recibo de outro
editor ou objeto. Uma recusa definitiva não vira incerteza por conferência.
O estado de edição de distância já usa `useImageDistance` e rascunho em memória
por imagem. Seleção não cria alteração; revisão antiga não é reaplicada. A
composição dos rascunhos/recibos está em `lib/image-plan-draft.ts`, sem depender
do módulo de qualidade. Navegação e exclusão reconhecem distância, e confirmações
limpam somente o rascunho correspondente ao comando. Limpar o contexto invalida
publicações tardias do writer; desmontar o hook invalida seus métodos de edição.
Ferramentas permanece aberto durante gravação/conferência de distância, com
o bloqueio de navegação direcionado ao owner correto.
O visualizador recebe um único `ViewerEditor` (nenhum/calibração/distância),
com geometria de interação em `viewer-marker-interaction.ts` e desenho do
editor em `viewer-editor-overlay.tsx`. `image-point-space.ts` compartilha a
conversão normalizada ↔ matriz original com a calibração. `renderOverlay`
recebe dimensões originais, escala e espelhamento para camadas passivas.
Trocar editor/alvo ou desmontar libera a captura do gesto.
`distance-result.ts` seleciona somente `LINE` e exige resultado oficial finito,
positivo, em mm e vinculado à calibração atual. `distance-overlay.tsx` e o painel
exibem medidas salvas com duas casas decimais no locale ativo; positivos abaixo
de 0,01 mm usam `< 0,01 mm`. Dados persistidos não são arredondados. Resultado
ausente/inválido/antigo ou leitura falha preserva a linha com valor indisponível.
O overlay usa a matriz original e tamanhos visuais constantes. O valor acompanha
o ângulo da linha, permanece legível ao inverter os pontos/espelhar e fica ao lado
do segmento. Linha, extremidades e valor usam `--radiograph-mark-measurement`
(ciano `#00D9FF`), sem contornos. O texto troca de lado/âncora quando necessário
nas bordas. A marcação salva e o editor de Distância aparecem somente em
Ferramentas → Medidas com Distância ativa (seleção ou editor existente). Informações,
Arquivos, Imagem e calibração ocultam as marcações de Distância, mantendo o
plano e o rascunho intactos. A seleção na lista é acessível e local, independente
da elegibilidade para editar. Os resultados ficam no menu escuro lateral sobre
a radiografia, junto dos controles de ajuste, edição, visibilidade, exclusão e
salvamento. A lista de valores permite selecionar explicitamente linhas de planos
antigos com múltiplas medidas. O olhinho permite ocultar apenas o número na imagem,
mantendo a linha, o valor no menu e sua prévia dinâmica. A preferência usa
`hiddenDistanceValues` no cache de apresentação por imagem/organização; não altera
`PlanLine.visible`, o documento remoto nem a exportação do backend. Nomes e motivos de
indisponibilidade permanecem acessíveis a leitores de tela; medidas sem resultado
ou prévia válida usam um travessão. Editar/limpar seleção mantêm suas ações por ícones.
A ação Distância abre a edição da linha salva identificada ou selecionada.
No painel de Distância, Nova distância inicia um rascunho de outra linha.
Rascunhos de criação antigos mantêm UUID, nome, posicionamento central e
cancelamento local para recuperação. Escape/pointercancel preservam a última
geometria local. O gesto confere alvo, geometria e contexto antes de confirmar;
eventos atrasados não sobrescrevem outro rascunho. Não há HTTP ao ajustar ou
cancelar. Revisão alterada congela edição sem rebase.
Medidas salvas são selecionadas pela lista ou por clique/toque no canvas; a
ação Editar distância inicia um update local com revisão observada. O módulo
`distance-line-interaction.ts` compartilha picking/teclado com os helpers de
linha: alças atuais, segmento mais próximo e empate por seleção/ID. Corpo e
extremidades usam limites da matriz original, com direção espelhada e passos
de 1/10 pixels. Os controles Linha inteira/Ponto inicial/Ponto final permitem
ajustar ambos os pontos por teclado. Alterações bloqueiam outro alvo; cancelar
restaura o desenho salvo e o valor oficial.
A barra vertical na lateral esquerda da imagem reúne mover, ajustes das pontas,
olhinho e lixeira. Apenas a linha de Ajustes se estende para a direita, com
Ponto inicial/Ponto final lado a lado; as outras ações mantêm a largura original.
O valor dinâmico fica em etiqueta independente, sem alargar a coluna de ícones.
O deslize usa os tokens de movimento do DS (200 ms) na abertura e no fechamento,
com entrada suave dos ícones e sem animação em movimento reduzido. O conteúdo
recolhido permanece inerte e fora da navegação por teclado.
Salvar/Atualizar/Cancelar aparecem somente após alterações, perto da linha e fora
da barra. As ações ficam ocultas durante arrastes e enquanto setas de ajuste
estão pressionadas, reaparecendo ao encerrar a interação se houver alterações.
Soltar, cancelar, perder a captura ou sair do contexto libera esse estado visual.
O slot `contextControls` projeta uma âncora normalizada em pixels da
tela, acompanha pan/zoom/espelhamento e limita os botões ao quadro. Confirmação
pendente, conflito e falha de leitura mantêm suas ações de recuperação acessíveis,
inclusive se a prévia falhar. Ambos os slots ficam fora da superfície de gestos.
As barras compartilham fundo e botões via `viewer-toolbar.tsx`; os tooltips ficam
dentro do visualizador para funcionar em fullscreen. X/check usam a variante
compacta de 28 px, com ícones de 14 px. Nomes e
estados permanecem acessíveis, com textos de ajuda apenas para leitores de tela.
`useImageDistance.submit`
monta o comando fresco e bloqueia duplo clique, edição e descarte imediatamente;
`use-distance-save-actions.ts`, montado no workspace, concentra Sonner e retorno
após confirmação. A linha confirmada fica selecionada em Ferramentas, com pan
e foco na lista. Uma geometria confirmada sem resultado derivado permanece salva
com medida indisponível; um resultado oficial ausente não é preenchido localmente
nem causa repetição da escrita. Durante edição, uma prévia visual separada usa
somente `calibration.result.mm_per_pixel` persistido e a matriz original.
Falha definitiva conserva o rascunho e permite reenvio explícito. Conflito oferece
Carregar salvo, mantendo Ferramentas durante a consulta da versão atual e
restaurando foco em ação habilitada. Resultado incerto mantém lock e oferece
somente Conferir gravação por GET do recibo capturado. Falha de leitura em segundo
plano mantém rascunho/seleção, com um Sonner compartilhado e ação Conferir plano
em vermelho, descrição acessível/tooltip e GET explícito antes de salvar.
Nenhum bloco Tentar novamente é acrescentado; ajustes locais não geram HTTP/toasts.
A exclusão pela UI está implementada na etapa 10, com confirmação e recuperação
pelo writer compartilhado. O aceite completo continua na etapa 11.
Veja o [plano de Distância](../../../../../docs/distance-tool-implementation-plan.md).

Compatibilidade publicada em 29/10: o plano preserva `viewport`,
`image_transform` (incluindo resultado), `visible`/`locked` em todos os tipos
de objetos e contornos TPLO transformados. Respostas antigas sem flags recebem
os defaults do backend; contêineres ausentes permanecem ausentes. Apresentação
identidade com resultado calculado também é válida na revisão zero. Distâncias
ocultas não entram na lista/overlay; bloqueadas não aceitam update/delete.
Esses metadados não podem ser forjados pelos comandos públicos de distância ou
calibração. A exportação PNG e os controles de transformação seguem seu próprio
escopo; esta atualização trata leitura e preservação, mantendo a matriz original
do visualizador.

Consultas autenticadas estão disponíveis em
`GET /api/cases/tplo/clinical-protocol` e
`GET /api/cases/tplo/rotation-table`, com serviços, schemas e query options em
`tplo-reference-*`. A tabela aceita `tpa_degrees` de 0 a 90 e
`blade_diameter_mm` maior que zero. Ausência de configuração ou correspondência
é dado, não falha de transporte; não há interpolação ou recomendação local.
O cache usa o QueryClient isolado por organização; essas leituras não ativam
ferramentas nem autosave.

Após confirmação da equipe de backend em 27/10/2026, qualidade radiográfica
é um processo interno. O painel manual, o quarto acesso lateral e o hook
de edição foram removidos. Os acessos permanentes são Detalhes do caso,
Arquivos, Imagem e Ferramentas; não se solicitam critérios, notas ou aprovação de qualidade.
`radiographic_quality` e `tplo.eligibility` continuam presentes no contrato
e são preservados ao calibrar, sem preenchimento ou aprovação local.
O transporte restrito de comandos da tarefa 2 e suas proteções permanecem
na camada de integração; não são acionados por um formulário do produto.

### Calibração, recalibração e edição da distância

O comando de calibração altera somente `document.calibration`. O backend
recalcula a escala e os resultados derivados das medidas com os pontos salvos.
A confirmação exige o resultado oficial da calibração. Após uma resposta
incerta, o writer confere o plano por GET.

Depois da confirmação, a UI abre Ferramentas → Distância. Se o plano ainda não
tem nenhum `LINE` e há capacidade para criar, abre um rascunho vertical
centralizado, com 40% da altura da matriz original. A prévia em milímetros usa a
escala confirmada. A primeira linha é gravada após um ajuste do usuário ou
quando ele pede Nova distância. Nesse caso, a confirmação da primeira gravação
libera a criação da segunda linha.
Com linhas existentes, a UI
retoma a distância identificada ou mostra a lista para seleção. Recalibrar
mantém os pontos de todas as linhas e o backend devolve seus valores atualizados.

Uma linha salva abre em edição limpa, com valor oficial visível sobre ela.
Enquanto não houver ajuste, `DistanceOverlay` mostra seu rótulo sem duplicar a
geometria do editor. Arraste e teclado mostram uma prévia dinâmica na linha e
no valor abaixo de Distância; cancelar o gesto restaura a geometria e o valor
anterior. A prévia não altera o plano, o rascunho antes do pointerup ou o payload.
O resultado oficial recebido ao salvar substitui a prévia. Revisão divergente,
falha de leitura, escala/dimensões ausentes ou geometria inválida não geram uma
estimativa. Editar a distância preserva a escala. Handoff e foco
respeitam imagem/caso/organização e troca de painel. Os modos Raio/Diâmetro
desenham guias a partir de uma linha salva em Distância.
Nova distância insere e salva uma linha com o centro na matriz original e
direção inicial a 95° da última linha visível na ordem do plano. O comprimento
inicial usa a mesma proporção da primeira linha, limitado às bordas da imagem.
Se houver sobreposição, tenta outra direção no mesmo centro antes de deslocar.
O visualizador mostra o ângulo dos
pares que se cruzam dentro dos segmentos, inclusive entre linhas salvas. Ao
ajustar uma linha, seus cruzamentos acompanham o gesto. O painel identifica
cada par e mantém os valores mesmo quando os rótulos não cabem na imagem.
Soltar uma alça ou mover o corpo grava os pontos do ajuste. Ajustes por teclado
são agrupados após uma pausa de 600 ms. O writer usa o mesmo comando de
`LINE` e a revisão confirmada. Falhas, conflitos e respostas incertas usam
as ações de recuperação. A exclusão continua com confirmação.
Arrastar o fundo em modo Marcar não redesenha uma linha posicionada.

## Painéis Arquivos e Imagem — 27/10/2026

Arquivos reúne uploads e seleção da radiografia. Imagem abre espelhamento,
brilho, contraste e inversão desde que a prévia esteja pronta, mesmo antes da calibração.
Calibrar imagem abre o formulário existente; Recalibrar imagem reabre a
referência persistida. Cancelar descarta somente a edição e preserva a escala
salva. Ferramentas → Medidas → Distância abre após a confirmação da API,
com o rascunho da primeira distância ou as distâncias já salvas. Erros,
conflitos e resultados incertos mantêm a recuperação no editor.

A referência fica visível somente durante a calibração, sem opção de exibição
no painel Imagem. Os filtros afetam
apenas a prévia, preservando arquivo, coordenadas e escala. Restaurar ajustes
visuais repõe brilho/contraste a 100% e desliga inversão e espelhamento,
sem remover a calibração nem alterar o zoom.

`useImageDisplaySettings` mantém preferências em memória por organização, caso
e imagem. Remounts e renovação da URL preservam os ajustes na mesma sessão;
não há gravação no plano nem armazenamento persistente no navegador. A exclusão
confirmada remove esse cache. A integração de Distância está descrita acima.
O aceite visual/autenticado permanece no teste geral combinado.

### Ferramentas: estrutura e acesso — 28/10/2026

O painel Ferramentas usa o mesmo shell, cabeçalho, rolagem e foco dos demais
painéis. O quarto acesso, após Imagem, utiliza ferramentas cruzadas contornadas
em `ToolsAccessIcon`; o cabeçalho usa `ToolsIcon`, com chave inglesa recortada
na mesma placa preenchida dos outros cabeçalhos e os mesmos tokens de tamanho e cor.
O painel inicial oferece apenas Medidas. Essa ação abre o subpainel Medidas,
com rótulos Categorias na entrada e Ferramentas de medida no catálogo,
com retorno para Ferramentas no rodapé e foco no título ao navegar. Não há
subpainel lateral de propriedades para Distância: cada medida usa seu menu sobre
a imagem. A navegação de retorno oculta marcações e controles sem descartar
rascunhos, seleção ou preferências. Reentrar em Medidas retoma a ferramenta ativa.
Calibrar/recalibrar continua abrindo diretamente Medidas → Distância após o ack.
Durante edição/seleção, Distância permanece destacada e marcada com `aria-pressed`;
o botão ativo não aparece desabilitado e não inicia outra criação sobre o rascunho.
As opções usam o padrão de ação Calibrar, com nome à esquerda e ícone à direita.
Ângulo e Círculo estão habilitados em Medidas, com criação, edição, salvamento e
exclusão integrados ao plano. O aceite funcional completo das duas ferramentas
segue pendente. Medidas adicionais aparece desabilitada. Planejamento fica
fora desse catálogo.

O quarto acesso fica sempre visível. Sem uma imagem/prévia pronta, ou durante
a primeira leitura do plano, ele permanece desabilitado. Com escala persistida e
confirmada, abre Ferramentas. Sem calibração, o clique direciona ao editor e à
orientação inicial; um rascunho existente é retomado sem ser descartado.
Conflitos, geometria incompatível, exclusão e salvamentos indefinidos continuam
bloqueando a edição. Durante a recalibração, o acesso retorna ao editor;
cancelar restaura a escala anterior e permite abrir Ferramentas novamente.

Trocar de imagem ou perder a escala/prévia fecha imediatamente o painel e
retorna a Imagem, sincronizando a seleção para evitar reabertura automática.
Se a imagem não permite prévia, a página usa o fallback de Arquivos já
existente. Abrir o painel não cria rascunho, não escreve na API e mantém o visualizador em navegação.
Brilho, contraste, inversão, espelhamento e zoom continuam independentes.
Essa disponibilidade inicial não substitui as validações clínicas da API.

Durante a preparação do contexto clínico, a tela usa `LoginHandoffPawLoader`
e `LoginHandoffStatusText`, com a patinha de 104 px, o texto e os pontos animados
do login. A confirmação de e-mail, o cadastro e a renovação de sessão usam o
mesmo padrão compartilhado.

A calibração confirmada permanece no cache em memória da organização. A leitura
inicial mostra carregamento; uma revalidação em segundo plano mantém a escala e
o conteúdo de Ferramentas, sem redirecionar para calibração. Edições aguardam a
consulta terminar, e uma resposta com erro, sem escala ou com revisão conflitante
continua aplicando os bloqueios normais. Ao remontar a imagem, o plano ainda é
consultado para detectar alterações de outras sessões; salvar usa a revisão
confirmada e a API verifica novamente antes de escrever.

A prévia mantém sua URL assinada válida ao voltar para a aba. A renovação
automática continua na janela de dez segundos antes da expiração; retorno à aba
e reconexão só refazem a consulta quando necessário. URLs não são persistidas e
continuam sendo removidas do cache ao desmontar seu último observador.

Falhas de leitura do plano são notificadas pelo Sonner, sem bloco de erro nem
botão separado de nova tentativa nas opções da imagem. Calibrar fica vermelho,
com ícone de alerta, descrição acessível e tooltip ao passar o cursor ou focar.
Novas tentativas atualizam o mesmo aviso por imagem, que fecha após recuperação.
Clicar na própria ação tenta carregar novamente e só inicia a calibração após
uma resposta válida. Falhas mantêm os rascunhos; sair do painel durante essa
consulta impede que a resposta tardia inicie uma edição.

### Espelhamento

Espelhar imagem é uma ação de alternância abaixo de Calibrar, com `aria-pressed`
e fundo ativo. A transformação horizontal ocorre no contêiner comum da prévia
e das sobreposições; barra de ferramentas, textos e popup mantêm a orientação.
O visualizador reflete o cursor de volta antes de mapear coordenadas e detectar
alças/corpos. Movimento e ajuste das pontas pelo teclado seguem os eixos da
tela; o ajuste radial do círculo mantém os atalhos de aumentar/diminuir.
Zoom e pan permanecem independentes. A escala, a matriz e as coordenadas
originais enviadas à API não são alteradas por essa preferência visual.

A orientação inicial de calibração aparece dentro do visualizador, no canto
inferior direito, sem portal global nem desfoque. Enquanto aguarda Ok, somente
os controles e gestos do visualizador ficam inativos. Confirmar restaura o foco
ao quadro e habilita a referência; Escape ou trocar de painel cancela essa
entrada sem registrar aceite. A confirmação continua isolada por imagem na
memória da sessão da organização, inclusive em tela cheia.

A cada nova recalibração explícita, o mesmo popup explica a substituição da
escala e a revisão das medidas/resultados dependentes. Ok libera os controles
sem alterar a calibração existente; a escrita continua restrita ao salvamento.
Cancelar mantém a escala anterior, e retomar um rascunho não reinicia a orientação.
O aviso não promete apagar todas as edições: o BFF preserva os demais campos
enviados, e a API controla os resultados derivados. Os status fixos e a escala
duplicada foram removidos do editor; o valor permanece nas opções de Imagem.

Todas as marcações de medição compartilham `--radiograph-mark-measurement`
(ciano `#00D9FF`): linha de calibração, diâmetro, alças e distâncias
salvas/em edição. O azul de seleção fica restrito aos controles da interface.
O círculo usa `--radiograph-mark-interest` (amarelo suave `#D6C66B`) e o contorno
`--radiograph-circle-stroke-width` (`1.25px`), constante no zoom. No editor circular,
o diâmetro tem duas alças ciano ligadas ao círculo, sem contorno adicional.
Hover amplia apenas a alça; arrastar uma ponta mantém a outra
fixa, enquanto arrastar o interior move o conjunto. As áreas de detecção usam
pixels de tela, e o tamanho das alças acompanha o zoom sem alterar a escala.

O posicionamento pelo painel aparece somente quando não há referência; com
marcação existente, o ajuste acontece diretamente no visualizador. Cancelar
e Salvar/Atualizar ficam lado a lado no rodapé, com rótulos visíveis curtos e
nomes acessíveis completos para a ação principal.

`circle-marker-interaction` concentra diâmetro, reconstrução centro/borda e
limites dos gestos. A detecção de alças é habilitada pelo visualizador, mantendo
a detecção anterior de borda para os demais consumidores.
`changeEditorMarkerKind` converte o segmento entre os dois formatos preservando
a medida real quando os pontos cabem na matriz. Uma linha não pode receber
extremidades fora da imagem: nesse caso, é necessário novo posicionamento, sem
truncar silenciosamente o diâmetro de um círculo salvo. O desenho circular novo
parte de uma extremidade à oposta do diâmetro.

A API continua recebendo uma única referência: `REFERENCE_LINE` ou
`REFERENCE_CIRCLE`. No modo circular, a linha auxiliar é somente apresentação;
o payload contém centro, borda e `known_diameter_mm`. A verificação compara o
comprimento original com duas vezes a distância centro/borda para evitar
confundir raio com diâmetro. Os resultados continuam sob responsabilidade da API.

Dados clínicos temporários não devem ser persistidos em `localStorage` ou em
outro armazenamento do navegador. O adapter de desenvolvimento mantém seus
dados somente em memória e reinicia junto com a aplicação.

### Ângulo: contrato, transporte e recuperação — 05/11/2026

A etapa 1 adiciona `PlanAngleInputSchema`, os comandos estritos create/update/delete
e seu merge/reconhecimento puros em `image-plan-command.schema.ts`. A leitura
remota de ANGLE é preservada; apenas entradas editáveis recusam braços nulos.
`start == end` com vértice distinto continua permitido, conforme o validador
do backend inspecionado. A edição remove somente o derivado antigo do alvo.

Na etapa 2, `SavePlanEditSchema`/`PlanSaveCommandSchema` passam a incluir Ângulo
e substituem a união pura transitória. O serviço `saveImagePlanEdit` e o PATCH
`/plan/edits` usam o mesmo contrato estrito, sem transporte paralelo. A rota
reutiliza autenticação, organização esperada e limite de 4 KiB para Ângulo.
O BFF confere vínculo caso/imagem, estado READY, revisão e unicidade dos IDs;
aplica somente o comando ao documento remoto e envia um único PUT. A resposta
exige a próxima revisão e reconhecimento de identidade/geometria, sem exigir
que o resultado derivado já esteja disponível e sem repetir a escrita.

Ângulo preserva as barreiras de produto de Ferramentas: dimensões, ausência de
anisotropia DICOM não suportada e calibração com resultado. Essas regras não
são exigências matemáticas do cálculo angular publicado. Qualidade radiográfica
e calibração mantêm suas políticas anteriores. Predicados explícitos de família/
dono nos consumidores de Distância evitam tratar Ângulo como uma linha.
Na etapa 3, `imagePlanSaveCommand`/`imagePlanSaveOwner` identificam a intenção e
seu dono no recibo compartilhado. `useAngleSaveRecovery` restaura somente o
comando de Ângulo capturado e usa `checkImagePlanSave`/`discardPlanEditSave` com
correspondência exata. Duplo envio e concorrência continuam sob o writer único;
conflito preserva a intenção, e incerteza permite apenas GET de conferência.
Uma exclusão já observada por GET gera `ANGLE_ALREADY_REMOVED`, sem novo PUT.
Confirmar Ângulo não limpa os rascunhos de calibração, qualidade ou Distância.

O estado real da requisição é observável por QueryClient/imagem, sem polling.
Ao remontar um recibo em saving/checking sem requisição ativa, a recuperação
oferece conferência em vez de permanecer carregando. O workspace volta a Medidas
com Ângulo destacado e controles próprios no quadro, incluindo quando a
navegação foi bloqueada. Fora de Medidas esses controles ficam ocultos.
Mensagens e notificações de recuperação seguem o padrão em pt-BR e en.

A etapa 4 acrescenta `angle-editor.ts`, `angle-draft.ts` e `use-image-angle.ts`.
Seleção e rascunho têm chaves próprias por caso/imagem no QueryClient atual,
sem persistência no navegador. A criação percorre inicial, vértice e final antes
de se tornar um comando válido; UUID/nome permanecem estáveis durante os passos.
Braços nulos são recusados; 0°/180° continuam permitidos.

Os guards reconhecem também o rascunho anterior ao primeiro envio. Ocultar o
painel o preserva; trocar de medida fecha apenas um editor limpo, mantendo sua
seleção e o plano. Alterações exigem salvar/cancelar e resultado incerto exige
conferência. A confirmação limpa somente o rascunho exatamente correspondente
ao comando, sem apagar edição mais nova ou outra seleção. Exclusão de imagem
remove ambas as novas queries; os callbacks conferem escopo, geração do contexto,
identidade da query, UUID e revisão antes de alterar o cache.

A etapa 5 adiciona a variante `angle` de `ViewerEditor` e um canal próprio no
adapter em pixels: ANGLE não passa pelo marcador de calibração/LINE. O helper
`angle-interaction.ts` concentra conversões, hit test, movimento do conjunto,
ajuste dos três pontos e teclado com espelhamento. Pontos não movidos preservam
as coordenadas normalizadas; mover o conjunto respeita os limites dos três
pontos. A fórmula angular do backend não foi alterada.

`ViewerAngleEditorOverlay` desenha o rascunho ativo em ciano, com três alças e
dimensões visuais estáveis no zoom. Prévia e gesto têm dono por ferramenta,
UUID, revisão, imagem/caso e geração de contexto da organização. Escape,
cancelamento/perda de captura, blur e mudança de contexto descartam a prévia.
O estado de interação que oculta X/check também reconhece arraste e teclado
de Ângulo, preservando os controles compartilhados de zoom/pan/fullscreen.

A etapa 6 conecta `angle-result.ts`, `angle-format.ts`, `AngleOverlay` e
`CaseImageAngleValues`. A leitura usa exatamente `values.angle`/`units.angle`,
com status CALCULATED e valor finito entre 0° e 180°, sem fingerprint de
calibração. Ausência/invalidade do resultado preserva a geometria e a seleção;
planos não conferidos não apresentam o cache como valor oficial confirmado.

A camada desenha segmentos, três alças, arco auxiliar e graus em ciano do DS,
com tamanho visual estável no zoom e texto legível no espelhamento. O arco usa
a base normalizada do backend antes de converter os eixos para pixels, podendo
ser elíptico em uma matriz retangular. Não substitui o derivado por cálculo local.
A lista compacta oferece nomes/motivos acessíveis e identifica objetos bloqueados;
`angle-select`/`pickAngle` permitem escolher pela imagem sem entrar em edição.

A seleção ativa tem escopo por organização/caso/imagem e mantém apenas a camada
da ferramenta visualizada. Fora de Medidas não aparecem valores ou marcações.
Uma prévia de ajuste não herda os graus oficiais da geometria antiga: usa
o cálculo local da etapa 8, com fonte distinta do derivado. Quando o cálculo
não está disponível, fica “Em ajuste”, sem reaproveitar o valor antigo.
A comparação de UUIDs na apresentação/fusão é insensível a caixa.

A etapa 7 conecta a criação local em três cliques/toques: inicial, vértice e
final. O visualizador recebe a colocação discriminada, desenha os pontos fixos
e o cursor transitório com `ViewerAnglePlacementOverlay`, e só confirma o ponto
ao soltar dentro da imagem sem arraste. UUID, revisão, passo e contexto esperado
impedem avanços por eventos repetidos/antigos. Escape/perda de captura cancelam
a prévia, mantendo os pontos já confirmados; cancelar criação descarta o rascunho.

`useImageAngle.open` retoma a edição existente, cria apenas se não houver ANGLE
visível, abre o único salvo ou exige seleção com múltiplos. Outra criação requer
Novo ângulo. UUID e nome são gerados uma vez por rascunho; a alternativa central
por botão/Enter conserva ambos e usa os mesmos guards/validação dos pontos.
Os controles locais, o progresso e as instruções seguem o DS em pt-BR/en.

O catálogo inicia Ângulo quando os bloqueios do produto permitem. A etapa 10
conecta a entrada pública e a exclusão com confirmação ao menu e ao salvamento.
Posicionamento/cancelamento não gravam na API nem alteram a linha
de Distância ou a calibração. Nenhum teste automatizado ou gravação na API foi
executado nesta etapa. O aceite funcional continua manual.
O helper `nextPlanObjectLabel` prepara nomes de LINE/ANGLE sem colisão e conserva
a interface/comportamento de `nextDistanceLabel`.

A etapa 8 conecta `angle-preview.ts` à imagem e à lista compacta usando uma
única prévia identificada por `≈`. `normalizedAngleRotation` compartilha a
convenção do arco e do cálculo; a prévia não recebe dimensões, zoom, pan ou
calibração e não é enviada no comando. Mantêm-se os bloqueios de produto,
revisão/contexto e DICOM, além da separação do resultado oficial.

As alças e as setas ajustam os três pontos ou o conjunto dentro da matriz
original, com Shift e espelhamento. No visualizador, 1–4 selecionam conjunto,
início, vértice e final. Braços nulos não substituem a última prévia válida;
soltar em geometria inválida não confirma o gesto. Cancelar o gesto restaura
o estado anterior, mantendo outros ajustes já feitos no rascunho. O dono da
prévia e da interação impede eventos atrasados de atingir outro contexto.

A etapa 9 conecta `CaseImageAngleToolbar`, `CaseImageAngleActions` e
`useAngleSaveActions`. Mover, três pontos e novo ângulo seguem o menu do quadro.
Na revisão visual de 09/11, as expansões foram substituídas pelo card com
rótulos e presets visíveis, preservando os atalhos e o foco. O CSS exclusivo
das expansões foi removido após a migração de todas as ferramentas.

O olhinho mantém `hiddenAngleValues` no cache de apresentação por organização,
caso e imagem, separado de Distância. Oculta somente o texto na radiografia;
geometria, arco e lista continuam visíveis, sem modificar `PlanAngle.visible`.
X/check compactos ficam próximos do ajuste, ocultos durante arraste/setas.

Salvar/atualizar usa o mesmo writer, revisão e recibo, sem autosave. Confirmar
retorna à seleção e restaura foco; falhas preservam o rascunho. Incerteza e
recibo remontado sem requisição ativa usam apenas GET de conferência; conflito
exige descarte explícito. As notificações seguem pt-BR/en, sem mensagens em
contexto antigo. Erro de leitura permite GET preservando os pontos locais.
Ferramentas continua disponível durante a gravação de Ângulo; o salvamento da
calibração mantém seu encaminhamento para Distância. O aceite funcional e os
ajustes no navegador ficam para depois da integração completa.

A etapa 10 adiciona `useAngleDeletion` e `CaseImageAngleDeleteDialog` à lixeira
do menu. Abrir/cancelar a confirmação preserva exatamente o rascunho; confirmar
captura a intenção de excluir só o mesmo UUID/revisão/rascunho observado. Um
snapshot alterado impede a confirmação até reabrir o diálogo. Ajustes locais
são descartados somente com a confirmação explícita da exclusão.

`angle-delete` continua no mesmo writer/PATCH/BFF/PUT com revisão; a UI mantém
o objeto salvo até a confirmação. Alvo bloqueado, IDs ambíguos, revisão nova e
contexto antigo não são sobrescritos. Conflito exige decisão explícita; resultado
incerto e recibos remontados sem requisição ativa usam somente GET. Ausência
confirmada em revisão posterior informa remoção já existente, sem repetir PUT.
O diálogo segue o DS e pt-BR/en, funciona dentro do fullscreen e devolve o foco.

Ângulo está habilitado em Medidas. Entrar retoma o rascunho/salvo ou inicia a
criação se não houver ANGLE visível; com vários salvos, exige seleção. Só Novo
ângulo inicia outra criação. Excluir não inicia um novo rascunho automaticamente.
Medidas adicionais permanece desabilitada. Círculo foi habilitado na entrega de
06/11/2026 registrada abaixo. A calibração encaminha a Distância. O roteiro de
aceite manual de Ângulo é a etapa 11, com a validação funcional dessa jornada pendente.

A ação Definir ângulo, adicionada em 06/11/2026, oferece seis atalhos em uma
faixa lateral animada na linha do ícone. `angleWithDegrees` constrói o ponto final na base
normalizada da API e verifica a prévia dos pontos reais com tolerância de
`1e-8` grau. Mantém vértice/início, lado da abertura e comprimento normalizado
quando cabe, encurtando o braço final na borda. Os pontos entram no rascunho
existente e seguem o check de salvamento. A faixa pt-BR/en segue o menu escuro
do quadro, compartilha a animação de Ajustes e usa os mesmos guards de edição.
Uma linha expande por vez, com foco/Escape e movimento reduzido. Os cenários de borda, precisão e conferência
do resultado oficial estão no aceite manual pendente.

O OpenAPI e a fonte da revisão publicada
`ea242ce971412f371c8004d64630289055b53ad4` foram conferidos: `values.angle`,
`units.angle: degrees`, ângulo interno 0–180°, coordenadas normalizadas e nenhum
fingerprint de calibração. A prévia local segue essa mesma base;
em imagem retangular ela pode divergir do ângulo visual em pixels, uma limitação
a preservar no aceite. A revisão foi estática, sem execução do backend ou
gravação na API; a validação funcional continua manual.
Veja o [plano de Ângulo](../../../../../docs/angle-tool-implementation-plan.md).

### Círculo — contrato e transporte de 06/11/2026

O contrato publicado usa centro e borda normalizados, raio positivo e resultado
em raio, diâmetro e circunferência em mm, derivado das dimensões originais e da
escala vigente. A leitura oficial deve conferir o `calibration_id`. Diâmetro é
a leitura inicial definida para a futura interface de Círculo.

`PlanCircleInputSchema` separa entrada editável da leitura remota.
`SaveCircleSchema` define create/update/delete estritos, UUID normalizado e
revisão observada. O merge e o reconhecimento puros suportam CIRCLE, preservando
os outros objetos, metadados e flags do alvo editado. Editar remove seu derivado
anterior para o recálculo do servidor. IDs ambíguos, alvo bloqueado ou de outro
tipo, raio nulo e criação acima do limite global são recusados.

A etapa 2 registra Círculo em `SavePlanEditSchema` e usa `PlanSaveCommandSchema`
também no merge/reconhecimento. O serviço usa o PATCH same-origin existente,
com contexto da organização, JSON e validação da imagem/revisão/comando na resposta.
A rota limita Círculo a 4 KiB de bytes UTF-8 e o BFF aplica os guards de imagem
READY, dimensões, política DICOM, escala confirmada, revisão e IDs únicos.
O documento atual recebe somente a alteração do CIRCLE pelo PUT do plano.

Falhas definitivas, conflito e incerteza após início da escrita seguem as
classificações do transporte. A etapa 3 integra os recibos de Círculo ao writer
por imagem. O ack limpa somente o rascunho correspondente ao comando enviado e
conserva uma edição/seleção posterior. Conflitos preservam a intenção e a
conferência de resultado incerto usa GET. A ausência confirmada na exclusão é
classificada como `CIRCLE_ALREADY_REMOVED`.

`useMeasurementSaveRecovery` compartilha a recuperação de Ângulo e Círculo,
com wrappers que filtram cada família e verificam comando, query e contexto.
Recibos remontados abrem a recuperação em Medidas com Círculo destacado.
A entrada pública de Círculo aguarda a etapa 10. `CircleEditor` e as chaves de
rascunho/seleção fornecem a correspondência exigida pelo writer, com guards
compartilhados e limpeza após exclusão da imagem.

A etapa 4 entrega `useImageCircle`, com criação em centro/borda/geometria
completa, UUID/nome estáveis, seleção e edição do objeto salvo, retomada pelo
recibo e intenção de exclusão vinculada à revisão/snapshot confirmado.
As transições validam revisão observada, alvo, escala, dimensões, DICOM,
concorrência e outra ferramenta com alterações. Callbacks verificam a identidade
da query e a geração de contexto, inclusive após sair/retornar à ferramenta ou
alterar dimensões/espaçamento. O workspace inclui rascunhos de Círculo nos
guards de saída, descarte e troca de ferramenta. A geometria local permanece
separada do plano salvo. A ligação visual começa na etapa 5 e o aceite manual
com a API está previsto na etapa 11.

A etapa 5 prepara os modos `circle` e `circle-select` de `ViewerEditor` e a
interação própria de CIRCLE no visualizador. Centro/borda são convertidos para
pixels originais, e o raio mantém a forma circular em matrizes retangulares.
`circle-interaction` concentra hit tests em pixels de tela, seleção, movimento
do conjunto e ajuste da borda com centro fixo. O overlay utiliza o amarelo do
DS, com alças e traço de tamanho estável no zoom. O visualizador trata pan,
espelhamento, prévia local, captura/cancelamento do ponteiro e teclado.
Os gestos têm discriminantes distintos do marcador circular de calibração.
A etapa 6 ligará os salvos ao workspace e as etapas 7/8 ligarão criação e edição
à ferramenta. A validação funcional continua no aceite manual da etapa 11.

A etapa 6 conecta os círculos persistidos ao workspace. `circle-result` verifica
raio, diâmetro e circunferência oficiais, unidades em mm, status CALCULATED e
fingerprint da calibração vigente. Valores ausentes, inválidos, desatualizados
ou sem conferência após falha de leitura têm indisponibilidade explícita.
UUIDs repetidos globalmente bloqueiam a seleção e a leitura dos valores,
com identificação dos alvos ambíguos. Círculos bloqueados permitem leitura.

`CircleOverlay` e `CaseImageCircleValues` compartilham a seleção por imagem e
aparecem somente em Medidas com Círculo ativo. A camada amarela preserva a
geometria quando o resultado está indisponível, utiliza dimensões originais e
conserva texto legível no espelhamento e tamanho de tela no zoom. A lista usa
o padrão compacto do quadro, com bloqueio/ambiguidade acessíveis. O diâmetro é
a apresentação inicial, e os componentes aceitam os três modos oficiais para
a escolha local da etapa 9. A formatação em mm reutiliza a de Distância.
O catálogo será habilitado na etapa 10, após criação, edição e exclusão completas.

A etapa 7 liga a criação ao quadro em dois cliques/toques, com centro e borda,
progresso local e circunferência provisória amarela. `circle-placement` converte
os pontos pendentes para pixels e oferece um círculo central com raio inicial
de 15% do menor lado da matriz original. O botão de posicionamento central e
Enter usam os mesmos guards de UUID, passo e revisão do posicionamento manual.

`CaseImageCircleCreationControls` segue o padrão de Ângulo, com Novo círculo,
posicionamento central e cancelamento. A entrada retoma o rascunho, inicia uma
criação se não houver salvo ou aguarda seleção quando há vários. A habilitação
pública no catálogo está reservada à etapa 10. O hook distingue disponibilidade
do painel e ativação da ferramenta para permitir a entrada e invalidar callbacks
antigos ao trocar de ferramenta. O rascunho mantém identificação/nome/revisão,
e o cancelamento da criação respeita o snapshot exibido e o plano confirmado.
A próxima etapa conecta edição e prévia dos valores, e o aceite segue manual.

A etapa 8 conecta a edição de CIRCLE salvos ao quadro. Centro/interior movem
o conjunto, enquanto a borda redimensiona com centro fixo. Alças e teclado usam
pixels originais, setas/Shift, Alt e espelhamento. A seleção prepara a edição
do mesmo UUID quando o alvo é editável e conserva os bloqueados para leitura.

`circleValuesPreview` deriva primeiro o diâmetro da distância em pixels e da
escala salva, depois raio e circunferência na ordem conferida no backend.
Quadro e lista compartilham a prévia local com `≈` e identificação da fonte.
O gesto transitório é vinculado ao contexto/UUID/revisão e só altera o rascunho
ao terminar. Cancelar o gesto retoma a geometria anterior. A prévia confere
dimensões, escala, revisão, DICOM, IDs e leitura. Os derivados oficiais ficam
no plano confirmado e os comandos continuam restritos à geometria editável.
O menu completo, apresentação e salvamento serão ligados na etapa 9.

A etapa 9 conecta `CaseImageCircleToolbar`, com mover, borda, escolha entre raio,
diâmetro/circunferência, olhinho e Novo círculo. A expansão ocupa somente a linha
acionada, com divisórias, Escape, tooltips dentro do quadro e movimento reduzido.
As setas do menu usam o mesmo operador de geometria do visualizador.

Modo e visibilidade do valor são preferências locais por UUID no cache da imagem,
com fallback para diâmetro. Quadro e lista compartilham o modo de leitura, e o
olhinho controla o rótulo sobre a radiografia. `CaseImageCircleActions` reutiliza
os X/check compactos de `ViewerEditActions`, exibidos após o gesto parar.
`useCircleSaveActions` liga salvar/conferir, foco e Sonner ao writer compartilhado,
com proteção de contexto e resultado oficial após confirmação. Erro, conflito e
resposta incerta conservam as ações de recuperação adequadas, incluindo GET de
conferência. Criação incompleta também oferece retorno da leitura após falha.
Exclusão com confirmação e habilitação pública do catálogo ficam na etapa 10.

A etapa 10 habilita Círculo em Medidas e conecta a lixeira ao diálogo do DS.
`useCircleDeletion` captura UUID, revisão, snapshot independente do rascunho,
QueryClient, query e geração de contexto. Cancelar a confirmação inicial
conserva os ajustes locais. Confirmar cria o comando de exclusão e o passa ao
salvamento com nova conferência da intenção no cache, permitindo a transição
atômica antes da próxima renderização. O caminho de salvar edição exige o
snapshot exibido e mantém seu guard original.

O objeto continua no plano confirmado até a resposta da API. Conflito conserva
a intenção para descarte explícito, resultado incerto usa GET de conferência e
ausência em revisão posterior informa remoção já observada. O diálogo funciona
no fullscreen, bloqueia o visualizador enquanto está aberto e devolve o foco.
O estado normal de exclusão em andamento mostra somente a ação de progresso.
Excluir conserva a seleção vazia ou restante e aguarda Nova criação explícita.
O catálogo respeita escala, dimensões, bloqueios, IDs únicos, concorrência e o
limite global para criar. Etapas 0–10 implementadas, com aceite manual na etapa 11.

As regras de prévia, DICOM, nomes e aceite manual estão
registradas no [plano de Círculo](../../../../../docs/circle-tool-implementation-plan.md).

### Revisão futura do workspace legado

- [ ] Revisar os adapters antigos e decidir se devem ser reaproveitados ou removidos: `services/cases-repository.ts`, `services/in-memory-cases-adapter.ts` e `services/frontend-only-cases-adapter.ts`. A revisão inclui as ações em `hooks/use-case-image-actions.ts` e `components/case-image-list-item.tsx`, mais a calibração provisória em `components/case-workspace-image.tsx` e `components/case-calibration-panel.tsx`.

Adiada a pedido em **22/10/2026** para uma revisão futura.
