# Inventario do design system

Este documento registra a base visual importada e orienta sua migracao para o
Orthovet. A direcao visual adotada e a referencia Aqua Voice: superficies
quase brancas, hierarquia tipografica leve, controles compactos e um unico azul
saturado como sinal funcional.

As fontes pagas da referencia nao fazem parte do projeto. Geist Sans substitui
PP Neue Montreal e Geist Mono permanece nos usos tecnicos.

## Fundacao atual

- Tailwind CSS 4, shadcn e primitivas Radix.
- Geist Sans e Geist Mono no shell; TTFs locais adicionais usados apenas em uma
  visualizacao Three.js da landing page.
- Temas claro e escuro controlados por classe `.dark`.
- Escala de espacamento de `0.25rem` a `4rem`.
- Raios de `0.25rem`, `0.5rem`, `0.75rem`, `1rem` e `full`.
- Duracoes de movimento de 100, 150, 200 e 300 ms, com suporte global a
  `prefers-reduced-motion`.
- Breakpoints padrao do Tailwind, com uso adicional de container queries.
- Tokens de componentes para Button, Input, InputField, Checkbox e Card.

## Contrato semantico

Os componentes novos devem preferir os tokens padrao `background`, `foreground`,
`card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`,
`border`, `input` e `ring`.

Textos principais usam Obsidian `#171719` no tema claro por meio de
`--color-text-primary`, incluindo o alias `foreground`. No tema escuro,
esse token continua usando Paper White. Abas ativas herdam `foreground`
no texto, sublinhado e preenchimento do contador.

As extensoes necessarias ao shell usam nomes de funcao, nao de cor ou produto:
`workspace`, `stage`, `raised`, `inverse`, `hover`, `selected`,
`content-secondary`, `content-disabled`, `success`, `warning` e `info`.

O namespace visual legado `capta-*` foi removido. Componentes e features usam
somente tokens semanticos; identificadores internos de SVG e o componente de
logo antigo permanecem ate a etapa dedicada a assets de marca.

## Componentes reutilizaveis

Na area autenticada, Sidebar e Header compartilham a superficie Neutral 50
`#FAFAFA`, enquanto o palco principal usa Neutral 0 `#FFFFFF`. Os botoes
primarios usam Neutral 800 no tema claro e Neutral 200 no tema escuro, sempre
com raio completo; a variante secundaria preserva a hierarquia por meio de
borda e fundo transparente. Cards usam a mesma superficie do palco, com borda
e sem sombra de preenchimento, e controles interativos compartilham o token de
hover da Sidebar. Abas inativas usam `#8F8F8F`, descricoes usam Neutral 400
`#A3A3A3` e os icones da navegacao de Configuracoes seguem a familia SVG
preenchida de 20 px com `currentColor`: `#BBBBBB` no estado inativo e `#555555`
no estado ativo. A superficie de hover identifica permanentemente somente a
aba ativa; passar o cursor por abas inativas nao altera fundo, texto ou icone.
A busca global usa uma superficie Neutral 100 dedicada no tema claro e uma
superficie neutra equivalente no tema escuro. Quando ativa, muda para a
superficie branca do palco e recebe somente uma sombra leve, sem borda. Aneis e
bordas de foco usam o token semantico `--color-border-focus`: Neutral 800 no
tema claro e Neutral 200 no tema escuro, sem reutilizar o azul funcional da
marca. O alias `muted` inteiro foi neutralizado: Neutral 100 para superficies e
Neutral 500 para conteudo no tema claro; Neutral 800 e Neutral 400 cumprem os
mesmos papeis no tema escuro, eliminando o antigo cinza azulado dos consumidores.
Os icones da Sidebar formam uma familia distinta das abas internas: SVGs de
contorno de 20 px, `viewBox` 24, traco de 1.5 px e extremidades arredondadas.
Eles usam tokens proprios para os estados padrao e ativo; os icones das abas
continuam preenchidos.

`Button` oferece `pill` para acoes neutras em superficie branca, com sombra
suave e hover cinza, e `pillOption` para opcoes de acesso com borda leve,
sombra mais projetada e sem alteracao no hover. O tamanho `lg` mede 56 px de
altura, usa texto de 16 px e padding horizontal de 24 px; o tamanho padrao
permanece em 40 px. `Input`, `InputField` e `PasswordInputField` aceitam
`variant="pill"`: altura de 36 px, raio completo e borda cinza de 1 px que
passa a 2 px no foco. Os valores de superficie, borda, sombra e medidas ficam
nos tokens `--control-pill-*`, `--button-pill-*` e `--input-pill-*` em
`globals.css`.

O editor focado de casos usa os tokens `--case-editor-canvas`,
`--case-editor-input-surface`, `--case-editor-input-border`,
`--case-editor-input-border-focus`, `--case-editor-placeholder` e
`--case-editor-radio-active`. No tema claro, o canvas usa Neutral 100
(`#F5F5F5`), os campos usam Neutral 50 (`#FAFAFA`), a borda usa `#F0F0F0`, o
foco usa `#D0D0D0` e o placeholder usa `#C0C0C0` em 13 px. Os radios
selecionados preservam o anel externo e usam um núcleo azul amplo. O escopo
`data-case-editor` mantém essas decisões isoladas dos formulários de outras
áreas do produto.

O icone de femea nos detalhes do paciente usa o token semantico
`--color-patient-sex-female`: Pink 600 (`#DB2777`) no tema claro e Pink 400
(`#F472B6`) no tema escuro. Esses tons ficam na paleta como
`--color-pink-600` e `--color-pink-400`; o icone de macho conserva o azul
funcional do editor.

`Sonner` usa os tokens `--toast-*`: superficie branca, titulo e icone Obsidian,
descricao Pewter, borda Linen e sombra de baixa opacidade para notificacoes
neutras e legiveis.

Ordem de migracao:

1. Button.
2. Input e InputField.
3. Card.
4. Select, Dropdown e Checkbox.
5. DatePicker e Calendar.
6. Feedback, Sonner e estados vazios.
7. SlideMenu, modais e loaders.
8. Shell, header, sidebar e navegacao.
9. Autenticacao.
10. Paginas completas.

## Divida visual identificada

- Classes `capta-*` ainda aparecem em componentes e features legadas.
- Landing e home concentram cores, medidas, sombras e layouts arbitrarios.
- Existem assets especificos de governo em landing, home e autenticacao.
- O componente de logo referencia `logo_currentColor.svg`, que nao existe.
- A landing combina GSAP, WebGL/Three.js e CSS, aumentando o custo de uma troca
  visual ampla.
- Textos legais e de produto precisam de revisao editorial/juridica, nao de
  substituicao automatica.

## Direcao recebida

- Canvas Paper White `#fafbfc`, palco neutro Showcase `#f4f4f4`, bandas Mist
  `#f3f7fa` e cards Fog `#f2f6fa`.
- Inkstone `#292c3d` para titulos, Slate `#3e4150` para corpo e Pewter
  `#686a76` para texto secundario.
- Neutral 800 `#262626` como preenchimento de acao principal no tema claro e
  Neutral 200 `#e5e5e5` no tema escuro.
- Sky Signal `#67beff` permanece como sinal funcional da marca.
- Electric Iris `#4288ff` fica reservado aos acentos funcionais da marca;
  links de texto usam a variante acessivel `#3270db` sobre Paper White. Foco e
  selecao de controles usam o token neutro `--color-border-focus`.
- Bordas Linen `#e5e8ec`, sombras de baixa opacidade e raios entre 8 e 20 px.
- Titulos Geist Sans peso 200, sem tracking negativo.
- Layout de ate 1200 px, blocos de leitura de ate 680 px e ritmo vertical de
  80 a 120 px.

Os botoes primarios usam texto branco sobre Neutral 800 no tema claro e
Neutral 900 sobre Neutral 200 no tema escuro, preservando contraste WCAG AA.

## Insumos ainda pendentes

- Logo principal e suas variantes para fundos claros e escuros.
- Referencias visuais ou arquivo de design com estados responsivos.
- Direcao para ilustracoes, iconografia, fotografia e motion.
- Confirmacao sobre o futuro do dark mode; ele permanece compativel por ora.
- Cores finais para estados de sucesso, alerta e erro. Os tons funcionais atuais
  ficam restritos a feedback ate essa definicao.

Enquanto esses itens estiverem pendentes, a migracao nao deve inventar logo,
fotografia ou ilustracao proprietaria.
