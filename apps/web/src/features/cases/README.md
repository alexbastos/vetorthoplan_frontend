# Feature de Casos

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
descarta gravações incertas. O PUT restrito de calibração mantém seu contrato.

O comando adicional `PATCH /api/cases/{caseId}/images/{imageId}/plan/edits` aceita
`{ kind: "radiographic-quality", baseRevision, quality }`. O BFF valida revisão,
imagem/caso e faz merge somente desse campo. Resultados, revisão clínica,
auditoria e elegibilidade não são inputs permitidos nesse comando.

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
Arquivos e Imagem; não se solicitam critérios, notas ou aprovação de qualidade.
`radiographic_quality` e `tplo.eligibility` continuam presentes no contrato
e são preservados ao calibrar, sem preenchimento ou aprovação local.
O transporte restrito de comandos da tarefa 2 e suas proteções permanecem
na camada de integração; não são acionados por um formulário do produto.

## Painéis Arquivos e Imagem — 27/10/2026

Arquivos reúne uploads e seleção da radiografia. Imagem abre espelhamento,
brilho, contraste e inversão desde que a prévia esteja pronta, mesmo antes da calibração.
Calibrar imagem abre o formulário existente; Recalibrar imagem reabre a
referência persistida. Cancelar descarta somente a edição e preserva a escala
salva. Após salvar, o retorno às opções depende da confirmação da API; erros,
conflitos e resultados incertos mantêm a recuperação no editor.

A referência fica visível somente durante a calibração, sem opção de exibição
no painel Imagem. Os filtros afetam
apenas a prévia, preservando arquivo, coordenadas e escala. Restaurar ajustes
visuais repõe brilho/contraste a 100% e desliga inversão e espelhamento,
sem remover a calibração nem alterar o zoom.

`useImageDisplaySettings` mantém preferências em memória por organização, caso
e imagem. Remounts e renovação da URL preservam os ajustes na mesma sessão;
não há gravação no plano nem armazenamento persistente no navegador. A exclusão
confirmada remove esse cache. Medidas ficam para etapas futuras.
O aceite visual/autenticado permanece no teste geral combinado.

### Ferramentas: estrutura e acesso — 28/10/2026

O painel Ferramentas usa o mesmo shell, cabeçalho, rolagem e foco dos demais
painéis. O quarto acesso, após Imagem, utiliza ferramentas cruzadas contornadas
em `ToolsAccessIcon`; o cabeçalho usa `ToolsIcon`, com chave inglesa recortada
na mesma placa preenchida dos outros cabeçalhos e os mesmos tokens de tamanho e cor.
Nesta primeira entrega, há somente a seção Medidas e seu texto de apoio;
desenho, cálculo e gravação de medidas ficam para a próxima tarefa.

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

No editor circular, a linha usa `--case-calibration-circle`, em amarelo claro
(`#F6D86B`), sem contorno adicional. A linha azul representa o diâmetro, com duas alças ligadas
ao mesmo círculo. Hover amplia apenas a alça; arrastar uma ponta mantém a outra
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

### Revisão futura do workspace legado

- [ ] Revisar os adapters antigos e decidir se devem ser reaproveitados ou removidos: `services/cases-repository.ts`, `services/in-memory-cases-adapter.ts` e `services/frontend-only-cases-adapter.ts`. A revisão inclui as ações em `hooks/use-case-image-actions.ts` e `components/case-image-list-item.tsx`, mais a calibração provisória em `components/case-workspace-image.tsx` e `components/case-calibration-panel.tsx`.

Adiada a pedido em **22/10/2026** para uma revisão futura.
