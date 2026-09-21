# Inventario do design system

Este documento registra a base visual importada e orienta sua migracao para o
Vetorthoplan. A direcao visual adotada e a referencia Aqua Voice: superficies
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

As extensoes necessarias ao shell usam nomes de funcao, nao de cor ou produto:
`workspace`, `stage`, `raised`, `inverse`, `hover`, `selected`,
`content-secondary`, `content-disabled`, `success`, `warning` e `info`.

Os aliases `capta-*` permanecem temporariamente apenas para consumidores ainda
nao migrados. Eles nao devem ser usados em codigo novo.

## Componentes reutilizaveis

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

- Canvas Paper White `#fafbfc`, bandas Mist `#f3f7fa` e cards Fog `#f2f6fa`.
- Inkstone `#292c3d` para titulos, Slate `#3e4150` para corpo e Pewter
  `#686a76` para texto secundario.
- Sky Signal `#67beff` como preenchimento de acao principal.
- Electric Iris `#4288ff` para foco, bordas e acentos; links de texto usam a
  variante acessivel `#3270db` sobre Paper White.
- Bordas Linen `#e5e8ec`, sombras de baixa opacidade e raios entre 8 e 20 px.
- Titulos Geist Sans peso 200, sem tracking negativo.
- Layout de ate 1200 px, blocos de leitura de ate 680 px e ritmo vertical de
  80 a 120 px.

Por contraste WCAG, botoes Sky Signal usam texto Inkstone. Branco sobre esse
azul teria apenas 2,02:1 de contraste.

## Insumos ainda pendentes

- Logo principal e suas variantes para fundos claros e escuros.
- Referencias visuais ou arquivo de design com estados responsivos.
- Direcao para ilustracoes, iconografia, fotografia e motion.
- Confirmacao sobre o futuro do dark mode; ele permanece compativel por ora.
- Cores finais para estados de sucesso, alerta e erro. Os tons funcionais atuais
  ficam restritos a feedback ate essa definicao.

Enquanto esses itens estiverem pendentes, a migracao nao deve inventar logo,
fotografia ou ilustracao proprietaria.
