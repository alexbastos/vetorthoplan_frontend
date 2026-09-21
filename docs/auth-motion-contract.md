# Contrato visual das transições de autenticação

## Objetivo

As transições entre `/login`, `/cadastro`, `/esqueci-senha` e `/redefinir-senha` devem parecer uma única coreografia contínua. A troca de rota não pode produzir salto de layout, reaparecimento de elementos ou mudança visível de opacidade entre frames.

Este documento define o resultado visual esperado antes da alteração da arquitetura de animação. Ele não define a implementação de hooks, timelines ou estado React.

## Superfícies visuais

| Superfície | Papel visual | Persistência esperada |
| --- | --- | --- |
| Stage | Moldura que contém toda a experiência de auth | Permanece estável entre todas as rotas |
| Logo | Elemento compartilhado que conecta os modos split e recovery | Deve ter uma única posição visual contínua |
| Botão voltar | Elemento compartilhado de navegação | Deve ter uma única posição visual contínua |
| Painel esquerdo | Cenário do modo split, formado por fundo, indicador, card e tagline | Disponível no desktop e oculto no recovery |
| Fundo de recovery | Cenário do modo recovery | Disponível em todas as rotas, visível apenas no recovery |
| Formulário | Conteúdo específico da rota | Sai antes de desmontar; entra somente após montar no estado inicial invisível |

## Modos finais

### Split

Aplicável a `/login` e `/cadastro` em desktop.

- Grade em duas colunas com proporção `1.1fr / 0.9fr`.
- Painel esquerdo totalmente visível.
- Fundo de recovery invisível.
- Logo na posição superior esquerda do stage.
- Botão voltar na posição externa definida para o fluxo split.
- Formulário na coluna direita; rodapé legal visível quando aplicável.

### Recovery

Aplicável a `/esqueci-senha` e `/redefinir-senha` em desktop.

- Grade em uma coluna.
- Fundo de recovery totalmente visível.
- Painel esquerdo visualmente oculto e sem interação.
- Logo centralizada no eixo horizontal do stage.
- Botão voltar na posição interna definida para recovery.
- Formulário centralizado, com o deslocamento vertical previsto pelo layout do recovery.

### Mobile

Aplicável abaixo do breakpoint `lg`.

- O painel esquerdo nunca é revelado como consequência de uma animação.
- A transição trabalha com formulário, logo, botão e fundo de recovery.
- A navegação preserva o mesmo conteúdo e ordem de foco dos modos finais.

## Transições e timing

| Origem | Destino | Duração-alvo | Resultado obrigatório |
| --- | --- | --- | --- |
| Split | Recovery | 380 ms | Painel sai, fundo recovery entra, logo e botão alcançam suas posições recovery e o formulário de origem desaparece sem salto |
| Recovery | Split | 380 ms | Grade abre, quatro camadas do painel entram em cascata, logo e botão retornam ao split e o formulário de origem desaparece sem salto |
| Login | Cadastro | 280 ms | O stage split permanece estável e apenas o conteúdo do formulário troca em continuidade |
| Cadastro | Login | 280 ms | O stage split permanece estável e apenas o conteúdo do formulário troca em continuidade |

Na entrada de login ou cadastro, os itens do formulário usam cascata vertical de `y: 10px` para `y: 0`, com duração de `280 ms`, `stagger` de `50 ms` e atraso inicial de `20 ms`.

Na volta recovery para split, as camadas do painel seguem esta ordem, em paralelo com logo e botão:

1. Fundo do painel, em `0 ms`.
2. Indicador de fonte, em `40 ms`.
3. Card de oportunidade, em `60 ms`.
4. Tagline, em `80 ms`.

## Invariantes de qualidade

- Nenhuma superfície pode passar por `visível → invisível → visível` durante uma única navegação.
- A troca de rota não pode alterar a posição visual de logo, botão ou stage em um frame isolado.
- Um elemento compartilhado não pode ser desmontado e remontado em outro contexto visual no meio da transição.
- O formulário de destino não pode pintar visível antes de sua animação de entrada começar.
- O painel não pode ser forçado a `display: block` em mobile.
- A interação é bloqueada durante a transição; uma segunda navegação não reinicia ou sobrepõe a timeline ativa.
- Com `prefers-reduced-motion: reduce`, a rota deve mudar sem estado intermediário animado.

## Critérios de aceite

A etapa de implementação só é aceita quando, em 60 fps e também sob limitação de CPU, estes fluxos não exibem flicker, salto de layout ou conteúdo duplicado:

- `/login` → `/esqueci-senha` → `/login`.
- `/login` → `/cadastro` → `/login`.
- `/redefinir-senha` → `/login`.
- Todos os fluxos acima em desktop e mobile.
- Clique repetido no mesmo link e em links diferentes durante uma animação.
- Primeiro carregamento direto de cada rota.
- Navegação com movimento reduzido.

## Fora do escopo desta etapa

- Alterar hooks, componentes, rotas ou classes CSS.
- Escolher a implementação do controlador de transição.
- Alterar os timings definidos neste contrato sem nova aprovação.
