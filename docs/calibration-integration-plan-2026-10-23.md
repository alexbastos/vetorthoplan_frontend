# Plano de integração da calibração — 23/10/2026

Status: tarefas 1–3 concluídas na implementação e verificação automatizada;
tarefas 4–5 pendentes. Atualização da tarefa 3: **26/10/2026**.
Contrato, evidências e restrição DICOM estão no
[registro da tarefa 1](./calibration-contract-2026-10-23.md). O painel já utiliza
o BFF remoto. O aceite visual em navegador e o salvamento autenticado no servidor
publicado ainda precisam ser executados na tarefa 5.

## Objetivo e ponto de entrada

Integrar a calibração manual da imagem ao workspace atual, usando o painel
lateral e o visualizador existentes. Fluxo de produto: imagem pronta →
calibração → salvamento confirmado → elegibilidade para futuras medidas.

Confirmado pelo usuário: o acesso é o terceiro ícone lateral, a régua.
Ele usa `Ruler` e agora depende da prontidão da prévia e da geometria da imagem.

Escopo desta entrega: referência por linha/círculo, edição do marcador,
persistência e reabertura por imagem. Medições, TPLO, simulação e revisão
clínica terão entregas próprias.

## Situação encontrada antes da integração

- `case-workspace-panel.tsx`: já possui seção `calibration` no terceiro acesso.
- `case-workspace-page.tsx`: mantém `calibrationAvailable={false}`.
- `case-preview-panel.tsx`: monta o viewer em `readOnly`, sem estado de marcador.
- `case-image-viewer.tsx`: já permite desenhar, mover e redimensionar linha e
  círculo, além de pan/zoom; suas coordenadas são pixels do rendering.
- `case-calibration-panel.tsx`: interface anterior, ligada a tipos do workspace
  legado e a uma escala local por linha/coluna.
- `case-workspace-image.tsx`: persistência pelo repositório legado; não é a
  integração remota atual e não deve ser ativada diretamente.
- O contrato tipado já oferece GET/PUT de plano, mas ainda falta sua integração
  ao BFF e aos serviços do navegador.

## 1. Fechar o contrato geométrico e os estados iniciais

Usar o snapshot publicado atualmente preservado em
`openapi/clinical-api.duplicate-2026-10-23.openapi.json`.

- `GET /api/v1/images/{image_id}/plan`: ler plano e revisão atuais.
- `PUT /api/v1/images/{image_id}/plan`: enviar `base_revision` e `document`.
- Referência linear: `REFERENCE_LINE`, `start`, `end`, `known_length_mm`.
- Referência circular: `REFERENCE_CIRCLE`, `center`, `edge`, `known_diameter_mm`.
- Pontos `x`/`y` normalizados de 0 a 1.
- Resultado oficial: `calibration_id`, `reference_length_px`, `mm_per_pixel`,
  retornado pelo backend. Não enviar resultado calculado pelo navegador como
  fonte da calibração.

Verificar antes de conectar a edição:

1. Qual resposta/revisão representa uma imagem válida ainda sem plano; não
   tratar qualquer 404 como documento vazio.
2. A correspondência entre original e prévia: redimensionamento, eventual
   recorte/rotação e convenção de bordas das coordenadas. A transformação deve
   funcionar com imagem retangular, zoom e pan.
3. Como o backend trata DICOM com pixels não quadrados: o modelo anterior usa
   escalas por eixo, enquanto a resposta nova oferece uma escala escalar.
   Não assumir equivalência nem habilitar casos incompatíveis sem definição.
4. Quais erros 409 distinguem revisão concorrente, imagem indisponível e outros
   bloqueios. Confirmar o comportamento de atualização da calibração quando já
   houver outros objetos no plano.

Entrega: exemplos de request/response e convenções verificadas, com eventuais
pendências objetivas para o backend.

Resultado da tarefa 1:

- [x] Conferir Swagger atual e fontes da branch `calibration`, fixadas no commit
  `279139d4c1ea795bd26578e3595f5e38b14b4712`.
- [x] Verificar plano inicial 200/revisão 0, gravação por revisão e códigos de erro.
- [x] Fechar coordenadas: bordas inclusivas, origem superior esquerda, conversão
  por largura/altura originais, EXIF aplicado antes da prévia e ausência de recorte.
- [x] Executar 10 exemplos contra a derivação real do backend e registrar oito
  testes de contrato reproduzíveis.
- [x] Identificar diferença do mapper legado (`dimensão − 1`) e representação
  remota de círculo por centro/borda.
- [x] Registrar a ausência de compensação anisotrópica DICOM e a restrição para
  a integração inicial. Suporte ampliado depende de definição com o backend.

Limite de evidência: schemas relevantes coincidem com a publicação; o commit
implantado e o fluxo autenticado não foram comprovados por essa igualdade.

## 2. Criar a leitura e persistência pelo BFF

- Propor `GET/PUT /api/cases/{caseId}/images/{imageId}/plan` como ponte autenticada
  para as rotas clínicas. Validar sessão, organização, vínculo imagem/caso,
  origem nas escritas e limites do documento.
- Validar respostas e expor somente dados necessários; não retornar credenciais,
  mensagens internas ou metadados operacionais.
- Adicionar serviço do navegador e cache de plano por organização/caso/imagem,
  usando o QueryClient já isolado por organização.
- Alterar somente a calibração pretendida, preservando os demais campos do
  documento e usando a revisão correspondente. Não substituir o plano por um
  documento reduzido que apague medições, TPLO ou revisões existentes.
- Em conflito, manter o rascunho e oferecer recarga/conciliação explícita.
  Em resposta perdida, consultar o estado persistido antes de permitir nova
  gravação. Não repetir PUT automaticamente.
- Integrar bloqueios de exclusão do caso/imagem e limpeza do cache de plano.

Entrega: ler, salvar e reabrir calibração através do BFF, com testes HTTP.

Resultado da tarefa 2:

- [x] Criar `GET/PUT /api/cases/{caseId}/images/{imageId}/plan`, com autenticação,
  organização, vínculo imagem/caso e estado `READY` validados antes do plano.
- [x] Restringir o PUT do navegador a `{ baseRevision, calibration }`, com JSON
  de até 4 KiB. A referência não aceita `result`, campos de identidade ou um
  documento inteiro fornecido pelo navegador.
- [x] Ler o plano atual no BFF, conferir a revisão e substituir somente sua
  calibração. Preservar objetos, marcos, metadados TPLO e revisão clínica.
- [x] Validar o documento completo conforme o contrato. Campo futuro desconhecido
  causa recusa antes do PUT, evitando perda silenciosa por remoção no parser.
- [x] Aceitar confirmação somente com imagem/revisão/geometria correspondentes
  e resultado de calibração válido. Erros internos não atravessam o BFF.
- [x] Adicionar serviço do navegador, opções de consulta e comando compartilhado
  por QueryClient/imagem, com preservação de rascunho e sem persistência local.
- [x] Em conflito, atualizar o plano lido e manter o rascunho. Em perda de
  resposta, verificar por GET; resultado indefinido continua somente leitura.
  GET inalterado não prova que um PUT temporizado deixou de estar em andamento.
- [x] Impedir exclusão concorrente durante gravação/verificação incerta; limpar
  plano e recibos ao excluir a imagem/caso e impedir restauração por resposta tardia.
- [x] Recusar gravação com dimensões originais ausentes ou anisotropia DICOM
  conhecida; planos existentes continuam legíveis.

Contrato público desta etapa: resposta GET/PUT com `imageId`, `revision`,
`document` e `updatedAt`. Os campos internos de `document` mantêm o formato
clínico. A API clínica continua recebendo `base_revision` e documento completo;
o formato reduzido é exclusivo da escrita no BFF.

Verificação: 25 testes novos, incluindo rotas Next reais, transporte clínico
tipado e roundtrip com JWT sintético. **310/310 testes web passaram**, assim
como TypeScript do web, checksums do contrato e `git diff --check`. A suíte
comprova comportamento com HTTP simulado, não persistência no servidor publicado.
O aceite visual/autenticado com imagens de teste segue nas próximas tarefas.

### Revisão adicional da tarefa 2 — 23/10/2026

Revisados os schemas, rotas, projeção e preservação do documento, autenticação
por organização, concorrência entre gravação e exclusão, respostas tardias,
reconciliação e duração dos recibos no cache. Dois problemas foram reproduzidos
por testes que falharam antes das correções:

- O parser de erros exigia `details.current_revision` mesmo em recusas com
  outro formato de detalhes. O backend verificado em
  `279139d4c1ea795bd26578e3595f5e38b14b4712` envia `IMAGE_NOT_READY` com
  `details.image_id` e `CLINICAL_VALIDATION_INVALID` com `details: {}`. Esses
  códigos eram convertidos em erros genéricos. A leitura do código e da dica
  de revisão agora é independente; detalhes privados continuam fora da resposta.
- Configurar `gcTime: Infinity` nos defaults não atualizava um recibo já
  existente. Ao desmontar seu observador, o cache podia esquecer uma gravação
  não confirmada e perder seu bloqueio. O comando agora aplica a retenção
  também ao registro existente e cancela sua coleta agendada. O teste usa
  um observador real, desmontagem e coleta com prazo curto; após a reabertura,
  permite apenas GET de reconciliação, preservando o rascunho original.

Os dois testes de regressão passaram após a correção, seguidos pela suíte
completa de 310 testes e pela checagem de tipos. Nenhuma chamada autenticada
ou gravação no ambiente publicado foi realizada nesta revisão. A tarefa 3
continua pendente; a revisão não habilita o painel nem as ferramentas de medidas.

## 3. Conectar o painel e o desenho

- Habilitar o acesso lateral quando a imagem selecionada estiver `READY`, a
  prévia estiver utilizável e o contrato geométrico permitir a edição.
- Adaptar a apresentação do painel existente ao modelo remoto atual. Manter
  tipografia, espaçamentos e foco cinza usados nos outros painéis.
- Oferecer linha/círculo, medida conhecida com unidade explícita, salvar e
  descartar alterações. Converter unidades para milímetros no envio.
- Validar valor positivo e finito, limites da API e referência não degenerada.
- Conectar o marcador ao viewer e implementar conversão de ida/volta entre
  pixels de edição e coordenadas da API. Círculo deve usar centro e ponto da
  borda, sem persistir raio em pixels como se fosse uma coordenada normalizada.
- Permitir criar, mover e ajustar a referência. Navegação e desenho devem ter
  modos identificáveis e não disputar o mesmo gesto.
- Ao navegar para outros painéis, permitir inspecionar a referência salva sem
  alterá-la. Hoje `readOnly` também oculta o marcador; separar apresentação e
  permissão de edição para evitar esse efeito.

Entrega: calibrar visualmente uma imagem e obter confirmação real do backend.

Resultado da tarefa 3 — 26/10/2026:

- [x] Conectar o workspace atual ao plano remoto sem ativar o repositório legado.
  `CaseImageWorkspace` compartilha o estado entre painel e visualizador.
- [x] Habilitar a régua após decodificação da prévia de uma imagem `READY`,
  com dimensões originais disponíveis e sem anisotropia DICOM conhecida.
- [x] Oferecer linha/círculo, medida conhecida em mm/cm, salvar e descartar,
  seguindo os tokens de tipografia, borda e foco dos painéis existentes.
- [x] Usar a proporção e as coordenadas contínuas da matriz original no viewer,
  inclusive nas bordas. O arredondamento do thumbnail não altera a geometria;
  zoom/pan são resolvidos pelo retângulo transformado da imagem.
- [x] Converter círculo para centro/borda normalizados, mantendo a direção de
  uma referência existente. Calcular a referência a partir do diâmetro real.
- [x] Desenhar, mover e ajustar referências pelo ponteiro e por teclado. O botão
  de posicionamento cria uma referência inicial; setas movem, Alt + setas
  ajustam, Shift amplia o passo e Esc retorna ao modo de movimento da imagem.
  Trocar de modo cancela o gesto em andamento.
- [x] Manter a referência persistida visível em Detalhes/Imagens, sem controles
  de edição. O rascunho permanece restrito à área de Calibração.
- [x] Conectar revisão, confirmação e reconciliação da tarefa 2. Nunca anunciar
  sucesso antes de uma resposta persistida válida. Não reenviar PUT após perda
  de resposta. Renovar a URL de prévia não reinicializa o editor.
- [x] Integrar a proteção existente de alterações não salvas e o aviso ao fechar
  a página. Troca de imagem e botão Voltar respeitam o bloqueio de gravação.
  O refinamento completo de navegação e estados continua na tarefa 4.

Verificação inicial: **17 testes novos** (8 de geometria/edição e 9 de interação com
React, Testing Library e jsdom), incluídos em `npm test`. Os testes cobrem
criação, edição, descarte, reabertura, linha/círculo, conversão sem arredondamento
extra entre mm/cm, coordenadas originais, modo somente leitura, isolamento por
imagem, renovação de prévia, conflito e salvamento não confirmado.

Na entrega inicial, **327/327 testes web passaram**, assim como TypeScript, verificação do contrato
e `git diff --check`. ESLint com parser TypeScript e regras React Hooks/Next
não encontrou erros nos arquivos desta etapa; permanece o aviso de `<img>`
nativo já usado para a prévia temporária.

Ambiente dos testes: Node **24.18.0**. As novas dependências são apenas de
desenvolvimento (`@testing-library/react` e `jsdom`). A versão instalada do
jsdom 30 exige Node **24.15+** na linha 24; essa limitação deve ser observada
ao instalar dependências ou executar os testes em outra máquina.

Limite do aceite: os testes de interação usam DOM simulado e HTTP sintético,
complementando os testes de contrato/BFF das tarefas anteriores. Não havia
navegador conectado nesta sessão para conferir layout, toque e fullscreen.
Nenhum plano clínico real foi alterado. A confirmação autenticada no backend
publicado e o aceite visual continuam pendentes na tarefa 5.

### Revisão adicional da tarefa 3 — 26/10/2026

A revisão encontrou quatro falhas concretas. Os cenários principais foram
reproduzidos com testes que falharam antes das correções:

1. Atualizações agrupadas no mesmo ciclo do React usavam um editor anterior e
   substituíam ajustes de geometria, valor, unidade ou método. O editor agora
   compõe atualizações funcionais; o posicionamento também usa a forma atual.
2. Após falhar e tentar novamente com a mesma URL de prévia, a régua podia ser
   habilitada antes da nova decodificação da imagem. Erro e tentativa manual
   agora invalidam a confirmação de carregamento até um novo `onLoad`.
3. O viewer assumia que toda a circunferência cabia dentro da matriz. O contrato
   limita somente centro/borda; uma referência válida parcialmente visível podia
   saltar ao mover ou gerar coordenadas inválidas. Marcadores remotos agora
   preservam a borda em pixels de origem e limitam a translação desses dois
   pontos, mantendo o raio. Desenho e redimensionamento respeitam esse modelo.
   O comportamento anterior dos marcadores legados permanece como padrão.
4. Um segundo toque podia substituir ou concluir o desenho iniciado pelo
   primeiro ponteiro. Cada gesto agora possui um ponteiro responsável; eventos
   de outros ponteiros são ignorados e a perda de captura cancela o rascunho
   transitório, sem confirmar uma referência ao soltar o cursor depois.

Foram adicionados **6 testes de regressão**, totalizando **333/333 testes web
aprovados**. Também passaram TypeScript, contrato e `git diff --check`;
ESLint com parser TypeScript não encontrou erros nas alterações. A revisão
incluiu movimentação/redimensionamento/salvamento de círculo junto à borda,
concorrência entre eventos, tentativa de prévia e cancelamento de gestos.

A interpretação do círculo foi reconferida em `PlanReferenceCircleCalibration`
do backend fixado em `279139d4c1ea795bd26578e3595f5e38b14b4712`. Os testes
continuam usando dados sintéticos, DOM simulado e HTTP controlado. Não houve
gravação de plano clínico real, mudança de dependências ou avanço para a tarefa 4.
As limitações de aceite visual e autenticado da tarefa 5 permanecem.

### Ajustes do painel e verificação da integração — 26/10/2026

- Régua de 0 a 10 cm como controle principal, com passos de 0,5 cm. A opção
  **Outro valor** abre a digitação em mm/cm; abrir ou recolher o campo preserva
  a medida, inclusive valores exatos fora do intervalo da régua. A unidade usa
  o componente Select do projeto, com foco cinza claro do editor e opções mm/cm.
- Explicações sobre ajuste do marcador e medida real em tooltips,
  acessíveis por foco, clique/toque e Escape. Erros de campo continuam junto ao
  controle. O cabeçalho lateral compartilha altura, tipografia, espaçamento,
  tamanho do ícone e área das ações com os outros painéis. A régua usa o SVG
  original **Edit / Ruler**, exportado do Coolicons no Figma (arquivo
  `e2h0DK43afiWDrN4UM5nR7`, nó `30789:32207`), preservado em
  `apps/web/public/icons/calibration-ruler.svg`. A versão preenchida em
  `calibration-ruler-filled.svg` mantém a silhueta original da régua, com corpo
  cinza e as três marcações vazadas. A régua é exibida a 20 × 20 px e recebe a
  cor do cabeçalho por máscara CSS.
  **Descartar ajustes** ocupa a ação do cabeçalho; o rodapé contém apenas o
  botão de salvar. As divisórias acima das ações dos rodapés de Calibração e
  Detalhes foram removidas.
- Revisado o caminho painel → hook → serviço do navegador → BFF autenticado →
  API clínica: organização, vínculo caso/imagem, revisão, conversão geométrica,
  preservação do documento e confirmação do resultado retornado pelo servidor.
  A configuração local aponta para a API publicada em modo `jwt`.
- Consultas públicas ao backend publicado: `/health/live` respondeu 200 (`ok`)
  e `/health/ready` respondeu 200 (`ready`, banco `ok`). O `/openapi.json` é
  idêntico byte a byte ao snapshot canônico: versão 0.9.0, SHA-256
  `b40fe463c29b4d2d41332c5565e9fc02a0c9f6e9f7e81b9c416894a21f0f004e`.
  GET/PUT de `/api/v1/images/{image_id}/plan` e seus 21 schemas referenciados
  coincidem. Um GET sem credenciais retornou 401, conforme a proteção esperada.
- Verificação local: **59 testes direcionados aprovados** (33 de contrato/API/BFF,
  9 de geometria/editor e 17 de interação), TypeScript e checksums do contrato.
  Os testes de interação incluem régua, digitação opcional, preservação de
  medidas, tooltips por teclado/clique e salvamento/reabertura com HTTP simulado.

Essas consultas públicas confirmam disponibilidade e compatibilidade do contrato;
não comprovam autorização de uma organização nem persistência autenticada.
Não havia sessão de navegador conectada para salvar e reabrir uma calibração
de teste no servidor. Nenhum plano remoto foi alterado. O aceite autenticado
e visual da tarefa 5 continua pendente; esta revisão não conclui a tarefa 4.

## 4. Cuidar do rascunho e dos estados de produto

- Estados claros: carregando, sem calibração, editando, salvando, salva,
  conflito e falha recuperável.
- Exibir “Calibração salva” somente após validar a resposta persistida e seu
  resultado calculado. Uma prévia local de escala, se houver, deve ser
  identificada como rascunho.
- Rascunho vinculado à imagem. Troca de imagem, saída do caso e exclusão devem
  respeitar a proteção existente de alterações não salvas e gravação em curso.
- Renovação da URL temporária da prévia não pode apagar o rascunho.
- Para a entrega futura de Medidas, derivar a elegibilidade da calibração
  persistida da imagem atual. Enquanto houver edição não salva ou resultado
  indefinido, não considerar essa edição uma calibração confirmada.
- Usar Sonner para confirmação e falhas; instruções e erros de campo continuam
  junto aos controles. Suportar foco por teclado e interação por toque.

Entrega: comportamento consistente entre primeira calibração, edição e reabertura.

## 5. Validar e encerrar esta entrega

Automatizar casos com linha/círculo, diferentes proporções de imagem,
conversão de unidades/coordenadas, zoom/pan, validação de entrada, isolamento
entre imagens/casos/organizações, revisão concorrente e resposta perdida.
Cobrir preservação dos demais campos do plano e bloqueios de exclusão.

Aceite integrado com imagens sintéticas:

1. Criar referência, salvar, recarregar e recuperar marcador, valor e escala.
2. Alterar a referência e descartar; recuperar o estado salvo.
3. Trocar entre duas imagens; cada uma mantém sua própria calibração.
4. Zoom, pan e tamanho da janela não alteram os pontos persistidos nem a escala.
5. Falha de rede não anuncia sucesso nem perde o rascunho.
6. Duas abas não sobrescrevem silenciosamente a revisão uma da outra.
7. Imagens não prontas ou com geometria não suportada não permitem edição.
8. A elegibilidade para Medidas só aparece após confirmação da calibração;
   nenhuma ferramenta de medição será implementada nesta entrega.

Lembrete solicitado pelo usuário, para o encerramento desta parte:

- [ ] Ao concluir a integração da calibração, lembrar o usuário de repassar ao
  backend a questão dos pixels DICOM não quadrados. O contrato atual retorna
  escala única e não compensa espaçamentos diferentes por eixo. Preparar o
  pedido a partir do [registro técnico](./calibration-contract-2026-10-23.md),
  após terminar esta entrega; não solicitar esse ajuste agora.

Ordem recomendada de execução: contrato geométrico → BFF/serviço → painel e
viewer → rascunhos/estados → aceite integrado. Revisar cada etapa antes de
avançar à próxima.
