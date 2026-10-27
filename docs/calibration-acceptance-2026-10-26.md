# Aceite da calibração — 26/10/2026

Implementação e revisão automatizada concluídas. **Aceite visual e autenticado
pendente**, reservado pelo usuário para o teste geral ao final dos ajustes.
Esta etapa não executou gravações no ambiente publicado.

## Evidências automatizadas

Resultado: **356/356 testes** na suíte completa do web e **47/47** na execução
focada de workspace/BFF. TypeScript sem erros, OpenAPI canônico/checksums válidos
e `git diff --check` sem problemas. Ambiente: Node **24.18.0**.

A primeira tentativa da suíte completa por `npm.cmd` foi interrompida pelo
ambiente com “espaço insuficiente no disco”. A execução final usou diretamente
o Node com os mesmos arquivos/opções do script `test`, limitando a concorrência
a dois processos; todos os testes passaram. Não foi necessário limpar arquivos
do usuário nem alterar dependências ou configuração do projeto.

Reproduzir essa execução a partir de `apps/web`, em PowerShell:

```powershell
$calibrationTestTokens = ((Get-Content -Raw -LiteralPath 'package.json' | ConvertFrom-Json).scripts.test) -split ' '
$calibrationTestArgs = @($calibrationTestTokens | Select-Object -Skip 1)
node --test-concurrency=2 @calibrationTestArgs
```

| Cenário | Evidência |
| --- | --- |
| Criar linha/círculo, salvar e reabrir | Testes de interação recuperam tipo, geometria, medida e escala persistida. A integração passa pelo transporte do navegador, rotas reais GET/PUT do BFF, resolução JWT simulada e transporte HTTP clínico simulado. |
| Descartar edição | Recupera o estado salvo; cancelar a confirmação mantém o rascunho. Uma gravação iniciada com o aviso aberto impede a saída. |
| Isolar imagens/casos/organizações | Chaves distintas e clientes de organização distintos não herdam rascunhos nem planos. Reabrir preserva texto inválido, unidade e revisão da edição original. |
| Zoom, pan e redimensionamento | Linha e círculo em matrizes 2011×1003, 1003×2011 e 1573×1573. Zoom de 175%, pan de 90×45 px, viewport de 320×568 e restauração da vista preservam o rascunho e a escala. As prévias retangulares têm dimensões arredondadas; o SVG e a proporção continuam usando a matriz original. |
| Rede e resposta perdida | Um resultado incerto mantém rascunho e bloqueios. Verificar consulta por GET; não repete PUT nem anuncia sucesso sem confirmação persistida. |
| Duas sessões concorrentes | Dois `QueryClient`s independentes chegam ao PUT clínico com a mesma revisão. Um único comando é aceito; o outro recebe `PLAN_REVISION_CONFLICT`, recupera a revisão vencedora e mantém sua intenção original. Nenhuma repetição automática. |
| Geometria/estado indisponível | Imagem em processamento, dimensões ausentes, anisotropia em qualquer um dos espaçamentos DICOM, prévia não pronta ou exclusão pendente não permitem edição nem elegibilidade para Medidas, mesmo com um plano salvo em cache. |
| Documento e exclusões | O BFF preserva os demais campos do plano na escrita de calibração. Exclusões verificam gravações e rascunhos antes de HTTP; uma resposta tardia não restaura recursos excluídos. |

Arquivos de referência:

- [Interação do workspace](../apps/web/test/calibration-workspace.test.mjs).
- [Rotas e integração JWT do BFF](../apps/web/test/image-plan-bff.test.mjs).
- [Transporte, cache e comandos](../apps/web/test/image-plan-api.test.mjs).
- [Geometria e unidades](../apps/web/test/calibration-editor.test.mjs).
- [Contrato e exemplos derivados do backend](../apps/web/test/calibration-contract.test.mjs).

Os testes DOM simulam tamanho e eventos; não constituem inspeção visual do CSS,
renderização real de DICOM ou prova de persistência no serviço publicado.

Revalidação após os ajustes de Sonner e orientação inicial: **362/362 testes**
na suíte completa, incluindo **41 testes do workspace** e o teste de notificações
nos dois temas. TypeScript sem erros; lint dos seis arquivos TypeScript deste
ajuste sem erros/avisos. O aviso é lembrado por imagem na sessão em memória da
organização; confirmar cria somente a geometria inicial, sem medida presumida
nem gravação automática. Calibrações e rascunhos existentes dispensam o aviso.
Não havia navegador conectado para a conferência visual.

## Roteiro para o teste geral

Usar um caso de teste e duas imagens sintéticas, preferencialmente uma horizontal
e outra vertical. Registrar ambiente, versão/commit publicado e data do aceite.

- [ ] Abrir uma imagem pronta pelo terceiro ícone (câmera), em Imagem, e acionar
  Calibrar. Antes do carregamento da prévia, esse acesso permanece indisponível.
- [ ] Na primeira entrada de uma imagem sem calibração nem rascunho, conferir
  o popup no canto inferior direito do visualizador, com margem de 16 px,
  título sem ícone, orientação própria do produto e apenas o botão “Ok”. A
  radiografia permanece nítida; zoom, movimento, marcações e atalhos do
  visualizador ficam bloqueados até confirmar. Clicar fora ou no acesso atual
  não aceita nem fecha o aviso. Em telas pequenas, o card respeita a largura
  disponível; em tela cheia, permanece dentro do visualizador.
  Escape ou trocar de painel encerra essa entrada sem aceitar a orientação;
  confirmar move o foco ao visualizador e cria
  a linha inicial, mantém a medida vazia e salvar desabilitado. Reabrir a mesma
  imagem na sessão não repete o aviso. Outra imagem recebe sua própria orientação.
- [ ] Posicionar uma linha, selecionar a medida na régua e salvar. Confirmar
  notificação, estado salvo e escala. Recarregar a página e conferir os mesmos
  pontos, medida e escala.
- [ ] Repetir com círculo. Usar também “Outro valor”, vírgula decimal e troca
  mm/cm; o controle representa o diâmetro, e trocar unidade conserva a medida.
- [ ] Editar a referência salva e descartar pelo cabeçalho. Conferir a restauração
  da versão salva. Tentar sair/trocar imagem durante uma edição: continuar
  editando preserva o ajuste; confirmar descarte permite seguir.
- [ ] Calibrar as duas imagens com referências diferentes. Alternar entre elas
  e reabrir o caso; cada imagem recupera apenas sua própria calibração.
- [ ] Fazer zoom, pan, ajustar a vista e redimensionar a janela. O marcador deve
  acompanhar a imagem; valor conhecido e escala permanecem iguais.
- [ ] Abrir a mesma imagem em duas abas. Preparar ajustes diferentes antes de
  salvar. Salvar na primeira e depois na segunda: a segunda deve mostrar conflito,
  manter o rascunho e exigir descarte/releitura antes de uma nova edição.
- [ ] Se simular falha de rede, conferir ausência de sucesso prematuro. Restaurar
  a conexão e usar “Verificar salvamento”. Se a gravação for encontrada, confirmar
  sucesso; se continuar indefinida, manter bloqueio e rascunho, sem novo PUT.
- [ ] Conferir tentativas de exclusão com edição pendente e com gravação em curso.
  Descarte e confirmação de exclusão são etapas distintas; o bloqueio de uma
  gravação não pode ser contornado pela lixeira.
- [ ] Conferir teclado (setas, Alt, Shift e Escape), toque e foco dos tooltips.
  Verificar painel em tema claro/escuro e larguras de 320, 768, 1024 e 1440 px.
- [ ] Conferir Sonner nos dois temas: ícone alinhado ao título e descrição abaixo;
  ícones sólidos de 14 px, verde em sucesso, amarelo em alerta, vermelho em erro
  e azul em informação. A caixa do ícone e a primeira linha do título usam a
  mesma altura, sem margem de compensação. O modal temporário de prévia foi
  removido após aprovação visual; esse padrão permanece nas notificações reais.
- [ ] Conferir que imagens sem dimensões originais ou com anisotropia DICOM
  conhecida continuam bloqueadas. Nenhuma ferramenta de Medidas faz parte desta
  entrega; a elegibilidade está preparada internamente.

Resultado do aceite: **pendente**. Em caso de falha, registrar passo, comportamento
esperado/observado, status HTTP e código público do erro.

## Minuta para o backend após o aceite geral

Pedido preparado para o momento combinado; ainda não enviado.

> Precisamos alinhar o suporte à calibração de DICOM com pixels não quadrados.
> O contrato integrado usa pontos normalizados na matriz original e um único
> `mm_per_pixel`; o frontend bloqueia anisotropia conhecida para não persistir
> uma escala incompatível com os cálculos do backend.
>
> Solicitamos definir e documentar como os espaçamentos já expostos em
> `pixel_spacing_mm` e `imager_pixel_spacing_mm` participam do cálculo:
>
> - Identificação de cada eixo, precedência entre os campos e política para
>   valores ausentes, divergentes ou inválidos.
> - Compensação física no backend e representação do resultado no plano, com
>   origem da escala e informações necessárias para o frontend reproduzir a
>   mesma geometria. Avaliar se a escala única continua adequada ou se o contrato
>   precisa de fatores por eixo.
> - Comportamento da referência circular: um círculo físico pode exigir uma
>   representação diferente na matriz anisotrópica; não assumir correção somente
>   na exibição do navegador.
> - Recalcular os resultados dependentes da calibração, preservar os demais
>   campos e manter o controle de revisão existente.
> - Exemplos e testes com linhas horizontais, verticais e diagonais e referências
>   circulares; a mesma distância física deve produzir resultados consistentes
>   entre orientações. Confirmar também compatibilidade dos planos já salvos.
>
> Após esse contrato estar definido, integraremos o suporte e retiraremos o
> bloqueio apenas das situações cobertas. Referência técnica:
> `docs/calibration-contract-2026-10-23.md`, seção de pixels DICOM não quadrados.
# Complemento TPLO: qualidade radiográfica — 27/10/2026

A equipe de backend confirmou que a qualidade radiográfica é um processo
interno. O formulário e seu acesso foram removidos; este roteiro substitui o
aceite anterior do painel manual.

- [ ] Conferir os três acessos permanentes: Detalhes do caso, Arquivos e
  Imagem, inclusive antes de carregar a prévia e com uma imagem indisponível.
  O acesso condicional Ferramentas segue o roteiro próprio abaixo; não há
  acesso de Qualidade radiográfica.
- [ ] Não há painel, critérios, observações ou botão Salvar avaliação expostos
  ao usuário, mesmo em imagens com `radiographic_quality` já preenchido.
- [ ] Salvar/reabrir calibração preserva os campos internos de qualidade e
  elegibilidade retornados pela API. O frontend não assume critérios aprovados.
- [ ] Navegação, calibração, espelhamento, zoom e exclusão continuam com suas
  proteções. As validações e recusas clínicas da API permanecem respeitadas.

Validação da remoção: **410 testes aprovados**, incluindo **57** do workspace.
Os 12 cenários do formulário retirado foram substituídos por três cenários
de ausência de interface, preservação dos dados internos e bloqueios DICOM.
Os testes de transporte, contrato e coordenação de comandos permanecem.
TypeScript, lint dos três componentes alterados e verificação do contrato
OpenAPI passaram. O aceite visual/autenticado continua para o teste geral.

## Complemento: Arquivos, Imagem e calibração — 27/10/2026

O fluxo atual separa a biblioteca Arquivos das opções de Imagem. Estes itens
complementam os cenários anteriores que abriam diretamente Calibrar:

- [ ] Conferir nomes e ícones de Arquivos e Imagem, em português/inglês, nos dois
  temas e em telas estreitas. Entrar em Imagem apresenta os ajustes visuais,
  sem iniciar uma edição nem abrir a orientação de calibração.
- [ ] Acionar Calibrar imagem para abrir o formulário e a orientação inicial.
  Salvar com sucesso volta às opções, mostra a escala e oculta a referência.
  Calibrar estabelece a escala para cálculos, sem deformar a imagem original.
- [ ] Iniciar cada recalibração explícita: o popup deve avisar sobre substituir
  a escala e revisar medidas/resultados dependentes, com texto próprio. Até Ok,
  referência, medida real, salvamento e controles do visualizador ficam bloqueados.
  Cancelar deve preservar a escala salva e os ajustes visuais. Confirmar abre a
  referência anterior sem gravar nada; somente salvar uma alteração faz a escrita.
  Conferir que os dados enviados preservam os demais campos do plano e validar
  os resultados derivados no backend. O aviso não afirma perda de todas as edições.
- [ ] O formulário começa em Forma do marcador, sem os status fixos de salva,
  sem calibração ou alterações não salvas, nem repetição da escala no editor.
  O valor continua disponível na linha do painel Imagem. Avisos de erro,
  conflito, carregamento e confirmação incerta permanecem disponíveis.
- [ ] O painel Imagem não oferece Referência da calibração nem Mostrar
  referência. A marcação aparece somente ao abrir a calibração, inclusive
  quando a sessão antiga tinha essa preferência ativa. Retomar um rascunho
  já aberto preserva a edição em andamento.
- [ ] Erro, conflito ou resposta perdida mantêm o editor e sua recuperação. O
  painel só retorna às opções após confirmação; durante um resultado incerto,
  Cancelar permanece bloqueado.
- [ ] Ajustar brilho, contraste e inversão, trocar de painel e voltar. Conferir
  isolamento por imagem/organização e manutenção na renovação da prévia. Os
  ajustes não gravam o plano nem marcam mudanças clínicas pendentes.
  Inverter cores também deixa branca a área ao redor da radiografia, nos dois
  temas e em tela cheia; desligar a inversão ou restaurar os ajustes repõe o
  fundo preto. Barra de ferramentas, dicas e marcações permanecem legíveis.
- [ ] Restaurar ajustes visuais repõe brilho/contraste a 100%, desliga inversão
  e oculta a referência, preservando a calibração salva e o zoom.

Aceite visual e teste autenticado continuam pendentes, conforme combinado.

Validação automatizada desta alteração: **406 testes aprovados**, com HTTP
simulado; TypeScript do web e SDK, verificação do contrato OpenAPI e lint dos
nove arquivos TypeScript envolvidos também passaram. A suíte cobre retorno
após confirmação, cancelamento preservando a escala, recuperação de resposta
perdida, filtros visuais e isolamento das preferências por imagem/organização.

Após a mudança da orientação inicial para popup local: **407 testes aprovados**,
incluindo bloqueio dos controles/gestos antes de Ok, foco após confirmação,
cancelamento e troca de painel sem aceitar a orientação. TypeScript passou.
A posição, responsividade e apresentação em tela cheia seguem no aceite visual
manual acima; os testes automatizados usam DOM e HTTP simulados.

Recalibração com aviso próprio e remoção dos status fixos: **408 testes
aprovados** na suíte completa. Os cenários específicos também passaram após a
revisão do retorno de foco. TypeScript e lint dos três componentes alterados
passaram. O aceite visual/autenticado permanece pendente.

## Círculo com diâmetro e alças — 27/10/2026

- [ ] No modo Círculo, conferir linha amarela clara (`#F6D86B`), sem contorno
  adicional, e diâmetro azul com uma alça em cada ponta. Avaliar legibilidade nos dois temas e com
  inversão, brilho e contraste; filtros da radiografia não alteram essas cores.
- [ ] Passar o cursor pelas pontas da linha e do diâmetro: somente a alça sob
  o cursor cresce. A circunferência, a medida real e os dados do plano não mudam
  com hover. Retirar o cursor restaura o tamanho; conferir com zoom e movimento
  reduzido habilitado.
- [ ] Arrastar cada ponta do diâmetro: a outra permanece fixa e o círculo muda
  junto. Arrastar o interior move o conjunto. Conferir também setas, Alt/setas,
  perda de captura e cancelamento do gesto, sem gravação até Salvar.
- [ ] Alternar Linha/Círculo preserva o segmento como diâmetro e a medida real
  quando a geometria é representável. Círculos salvos podem cruzar os limites
  da imagem; se o diâmetro completo não couber na matriz, mudar para Linha exige
  posicionar uma referência válida, mantendo Salvar bloqueado até isso ocorrer.
- [ ] Desenhar um círculo novo de uma extremidade à oposta do diâmetro. Conferir
  que a API recebe somente `REFERENCE_CIRCLE`, com centro, borda e
  `known_diameter_mm`. Não há uma segunda referência independente. Verificar
  a escala retornada, cancelar e reabrir sem deslocamento ou alteração indevida.
- [ ] Após salvar, a referência fica oculta. Recalibrar restaura o círculo e
  o conjunto de controles depois da confirmação do aviso. Cancelar volta a
  ocultar a marcação, preservando a calibração salva.
- [ ] Com uma referência desenhada, não aparece Reposicionar referência.
  Posicionar referência continua disponível apenas sem marcação, inclusive
  para iniciar pelo teclado.
- [ ] Cancelar e Salvar/Atualizar ficam lado a lado no rodapé, sem cortar os
  rótulos. Durante o salvamento, conferir os bloqueios existentes e um único
  ícone de carregamento no botão principal.

Aceite visual e gravação autenticada no ambiente real continuam pendentes.

Validação automatizada: **416 testes aprovados**, incluindo oito cenários novos
de geometria/interação. TypeScript e verificação do contrato OpenAPI passaram.
O lint dos cinco arquivos TypeScript envolvidos não apresentou erros; permanece
o aviso anterior de uso de `<img>` na prévia assinada. Os testes usam DOM e HTTP
simulados, com validação de centro/borda, diâmetro real, zoom, hover, reabertura,
gestos nas duas pontas, movimento do conjunto e limites da matriz original.

## Espelhamento horizontal — 27/10/2026

- [ ] Em Imagem, conferir Espelhar imagem abaixo de Calibrar, com texto à
  esquerda, ícone à direita e estado ativo perceptível. Acionar pelo teclado
  e conferir o estado de alternância anunciado pelo leitor de tela.
- [ ] Espelhar antes e depois de calibrar: radiografia e referência invertem
  juntas, sem espelhar barra de ferramentas, textos ou popup. Um segundo
  clique retorna à orientação original. Conferir temas e inversão de cores.
- [ ] Com linha e círculo espelhados, desenhar, ajustar ambas as pontas,
  mover o corpo e conferir o hover das alças, inclusive com zoom e pan.
  As setas movem na direção da tela; Alt/setas ajustam o tamanho e Shift
  amplia o passo. Cancelar um gesto não altera a referência confirmada.
- [ ] Salvar e reabrir a calibração: coordenadas continuam pertencendo à matriz
  original, sem alteração indevida de escala ou deslocamento da marcação.
  Fora do editor, a referência continua oculta mesmo ao espelhar a imagem.
- [ ] Trocar de painel e voltar, renovar a prévia e reabrir a imagem na mesma
  sessão preservam a preferência. Outra imagem/organização começa sem espelhar.
- [ ] Restaurar ajustes visuais desliga o espelhamento e a inversão e repõe
  brilho/contraste, preservando calibração, zoom e pan.

Validação automatizada: **419 testes aprovados**, sendo **66** do workspace.
Os novos cenários exercitam linha e círculo espelhados, ambas as alças,
hover, zoom, pan, teclado, cancelamento do gesto, limites da matriz e gravação
nas coordenadas originais. Os cenários de preferências cobrem alternância,
restauração, renovação da prévia, remontagem e isolamento por imagem/sessão.
TypeScript passou; lint dos quatro arquivos TypeScript alterados sem erros,
mantendo apenas o aviso anterior sobre `<img>` na prévia assinada.
Os testes usam DOM e HTTP simulados. O aceite visual/autenticado continua
pendente para o teste geral.

## Ferramentas — tarefa 1: estrutura e acesso — 27/10/2026

- [ ] Antes da calibração confirmada, não há acesso a Ferramentas. Após salvar
  ou reabrir uma imagem já calibrada e carregar sua prévia, surge o quarto
  acesso, após Imagem, com ícone de chave inglesa.
- [ ] Conferir cabeçalho com ícone preenchido, título, dimensões, cores, cantos,
  espaçamento, rolagem e foco no padrão dos demais painéis, nos dois temas,
  em português/inglês e larguras de 320, 768, 1024 e 1440 px.
- [ ] Abrir Ferramentas pelo teclado: o título recebe foco e o acesso fica
  selecionado. A seção Medidas contém somente texto de apoio nesta tarefa,
  sem controles de desenho/cálculo/salvamento ainda não integrados.
- [ ] Abrir o painel não altera a calibração, não cria rascunhos nem realiza
  escritas na API. Zoom, pan, espelhamento, inversão, brilho e contraste
  continuam funcionando no visualizador; a marcação de calibração fica oculta.
- [ ] Entrar na recalibração oculta Ferramentas antes mesmo de alterar a
  referência. Cancelar restaura o acesso com a escala salva. Rascunho inválido,
  conflito, leitura com erro e salvamento pendente/incerto mantêm o acesso oculto.
- [ ] Partindo de Ferramentas, trocar para uma imagem sem calibração volta a
  Imagem imediatamente. Voltar à imagem calibrada permite acessar Ferramentas
  novamente, sem reabrir o painel automaticamente nem herdar escala de outra imagem.
- [ ] Perda da escala confirmada ou falha da prévia enquanto Ferramentas está
  aberto retira seu conteúdo e retorna às opções da imagem. Sem prévia elegível,
  permanece o fallback de Arquivos. Matriz ausente, DICOM incompatível e exclusão
  em curso/incerta não permitem acesso, mesmo com calibração em cache.

O aceite visual/autenticado continua pendente para o teste geral. A próxima
tarefa integra a primeira medida (distância entre dois pontos).

Validação automatizada: **415 testes aprovados**, incluindo **62** do workspace.
Cinco cenários novos cobrem acesso/foco, entrada e cancelamento da recalibração,
troca de imagem, perda de escala/prévia e estados bloqueados. Os cenários de
salvamento e resposta perdida também conferem a liberação somente após
confirmação. TypeScript e lint dos cinco componentes alterados passaram,
usando DOM/HTTP simulados para os testes de interação.
