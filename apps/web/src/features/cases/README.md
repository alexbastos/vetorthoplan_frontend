# Feature de Casos

Esta feature concentra a experiência de casos clínicos da área autenticada.
A rota `/app/cases` hospeda os estados de listagem e vazio, enquanto
`/app/cases/new` hospeda o cadastro e a importação dos arquivos clínicos.
`/app/cases/[caseId]/plan` abre o quadro de radiografias e calibração após o
envio. As rotas importam somente a interface pública exposta por `index.ts`.

O quadro usa o shell focado e organiza miniaturas, visualizador e painel de
calibração. Para PNG/JPEG prontos, o usuário pode selecionar imagem, ajustar
zoom, mover, alternar tela cheia, modificar brilho/contraste, traçar linha ou
círculo, informar projeção/lado e a medida real do marcador. O painel mostra a escala antes
da gravação e oferece entrada de coordenadas pelo teclado. A calibração salva
pertence à imagem ativa; trocar de imagem não transfere sua escala. A navegação
avisa sobre ajustes ainda não salvos.

O quadro apresenta estados separados para caso ausente, falha de leitura,
nenhuma radiografia, processamento e prévia indisponível. DICOM não recebe uma
prévia fictícia enquanto faltar renderizador. Em produção, o adapter ainda
retorna indisponibilidade até a integração com o servidor.

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

`CasesRepository` é a interface entre a feature e a fonte de dados. Ela expõe
listagem, criação, importação de arquivos, leitura do retrato de um caso para o
quadro e gravação de calibração por imagem. Retorna erros públicos discriminados
e aceita cancelamento com `AbortSignal`. Os hooks de React Query atuais chamam
as operações de listagem, criação e importação; o quadro consumirá as novas
operações na próxima etapa.

Durante o desenvolvimento, `createInMemoryCasesAdapter` permite validar as duas
etapas e o contrato do futuro quadro sem persistência. PNG/JPEG importados
podem ser reabertos por URLs `blob:` na sessão atual; DICOM permanece sem
renderização até existir um processador. Novas importações são acrescentadas ao
caso e calibrações são associadas à imagem, com revisão para detectar conflitos.
Builds de produção usam
`createFrontendOnlyCasesAdapter`: a listagem permanece vazia e tentativas de
criação, importação, leitura ou calibração falham explicitamente, sem simular que
dados clínicos foram salvos.

Quando o contrato do backend estiver disponível, um adapter BFF substituirá
essas implementações sem alterar as páginas ou os hooks. O formulário permanece
como rascunho local entre as etapas; ao concluir, o módulo cria o caso, recebe o
`caseId` e então vincula os arquivos. As rotas BFF devem permanecer em
`app/api/cases` e não expor tokens ao navegador.

Dados clínicos temporários não devem ser persistidos em `localStorage` ou em
outro armazenamento do navegador. O adapter de desenvolvimento mantém seus
dados somente em memória e reinicia junto com a aplicação.
