# Aceite visual e autenticado da calibração

Roteiro atualizado em 28/10/2026. Usar um caso sintético com pelo menos duas
imagens, incluindo uma horizontal e outra vertical. Registrar ambiente, versão
publicada e navegador. O usuário confirmou que o caso voltou a carregar após
a correção de contrato de 28/10; o roteiro completo abaixo ainda não tem aceite.
Testes DOM/HTTP simulados não substituem persistência real ou validação clínica.

## Navegação e disponibilidade

- [ ] Conferir os quatro acessos permanentes: Detalhes do caso, Arquivos,
  Imagem e Ferramentas. Não deve existir um painel manual de qualidade radiográfica.
- [ ] Arquivos lista os uploads; Imagem abre ajustes visuais sem iniciar edição.
- [ ] Com prévia decodificada e calibração salva, Ferramentas abre diretamente
  seu painel. Sem calibração, o clique abre o editor e a orientação inicial.
- [ ] Sem imagem/prévia pronta ou durante a primeira consulta, o acesso continua
  visível e desabilitado. Imagem sem dimensões ou DICOM anisotrópico não permite edição.
- [ ] Durante recalibração, clicar em Ferramentas retoma o editor sem perder o
  rascunho. Cancelar restaura a escala salva e o acesso ao conteúdo de Ferramentas.
- [ ] Trocar de imagem não herda escala/rascunho. Perder escala ou prévia fecha
  o conteúdo de Ferramentas; resultados incertos e exclusão mantêm os bloqueios.

## Orientação e criação da referência

- [ ] Primeira entrada sem calibração/rascunho mostra orientação no canto inferior
  direito do visualizador, sem borrar a radiografia; texto e botão Ok cabem na tela.
- [ ] Enquanto aberta, a orientação bloqueia gestos, marcações e atalhos do
  visualizador. Clicar fora não aceita; Escape/trocar painel cancela a entrada.
- [ ] Ok cria somente uma referência inicial, sem valor conhecido presumido nem
  gravação. Mover foco ao visualizador; lembrar a orientação por imagem/organização.
- [ ] Cada recalibração explícita avisa sobre substituição da escala e revisão
  de resultados dependentes. Confirmar mantém a referência salva para edição;
  cancelar não altera a escala. Rascunho existente é retomado sem reinicialização.
- [ ] Posicionar linha e círculo, usar régua, valor digitado com vírgula e
  troca mm/cm. A medida do círculo é o diâmetro; trocar unidade conserva a grandeza.
- [ ] Desenhar pelo diâmetro e mover/redimensionar pelas duas alças ou pelo corpo.
  Círculo parcialmente visível não deve saltar para caber na imagem.

## Persistência, concorrência e recuperação

- [ ] Salvar volta a Imagem, mostra a escala e oculta o marcador. Reabrir/recarregar
  recupera geometria, medida, tipo e resultado da mesma imagem.
- [ ] Calibrar duas imagens com referências diferentes e alternar entre elas.
- [ ] Descartar restaura o plano salvo. Cancelar a confirmação de saída preserva
  o rascunho; confirmar descarte permite navegar. Uma gravação iniciada durante
  a confirmação impede o descarte/saída até ser resolvida.
- [ ] Duas sessões com a mesma revisão: apenas uma grava; a outra mostra conflito,
  mantém o rascunho e exige releitura/descarte antes de novo comando.
- [ ] Resposta perdida conserva rascunho e bloqueios. Verificar salvamento faz
  GET; nunca repete PUT automaticamente nem anuncia sucesso sem confirmação.
- [ ] Exclusão de caso/imagem protege rascunhos e resultados incertos; respostas
  tardias não restauram recursos excluídos. Cancelar calibração e excluir são ações distintas.
- [ ] Escrita de calibração preserva qualidade, elegibilidade, objetos, auditoria
  e demais campos internos do plano. Não pedir aprovação radiográfica ao usuário.

## Erros, cache e ajustes visuais

- [ ] Erro de leitura mostra um Sonner e Calibrar vermelho com tooltip por cursor
  e teclado, sem texto de erro ou botão separado de nova tentativa no painel.
  Clicar em Calibrar tenta recuperar; falha não grava nem perde o rascunho.
- [ ] Novas tentativas atualizam o mesmo aviso; recuperação o fecha. Sair durante
  uma consulta impede a abertura tardia do editor.
- [ ] Voltar à aba com URL de prévia válida não renova a imagem nem derruba
  Ferramentas. Consulta do plano em segundo plano mantém escala/painel; erro real
  ou resposta sem escala continua bloqueando. Renovação perto da expiração funciona.
- [ ] Brilho, contraste, inversão, espelhamento e zoom continuam independentes
  da calibração, isolados por imagem/organização e preservados na renovação da prévia.
- [ ] Inversão clareia também o fundo ao redor da radiografia; desligar/restaurar
  repõe o fundo preto. Barra, marcações e dicas permanecem legíveis nos dois temas.
- [ ] Restaurar ajustes repõe brilho/contraste a 100% e desliga inversão/
  espelhamento, sem apagar calibração ou alterar zoom. Marcador salvo aparece só no editor.

## Geometria e acessibilidade

- [ ] Imagens horizontais, verticais e quadradas mantêm pontos/escala durante
  zoom, pan, espelhamento, redimensionamento e tela cheia, usando a matriz original.
- [ ] Conferir setas, Alt, Shift, Escape, foco, tooltips e gestos de toque.
  Segunda ponta de toque e perda de captura cancelam gestos inacabados.
- [ ] Testar 320, 768, 1024 e 1440 px, temas claro/escuro e idiomas pt-BR/en.
- [ ] Loader de preparação usa a patinha do login. Sonner mantém título,
  descrição e ícone de status legíveis, inclusive com movimento reduzido.

## Alinhamento DICOM pendente com o backend

O pedido de suporte a pixels não quadrados foi preparado, mas não enviado.
Definir: eixo e precedência entre pixel_spacing_mm/imager_pixel_spacing_mm,
valores ausentes/divergentes, compensação física no backend, escala única vs
fatores por eixo, círculo físico em matriz anisotrópica e compatibilidade de
planos existentes. Pedir exemplos horizontais/verticais/diagonais/circulares
e recálculo de resultados preservando revisão e outros campos. Só remover o
bloqueio nas situações cobertas pelo contrato e pelos testes.

Referência: [contrato geométrico](./calibration-contract-2026-10-23.md).
Registrar o resultado de cada cenário, com passos, esperado/observado e código
público de erro; nunca copiar tokens, cookies ou URLs assinadas para as evidências.
