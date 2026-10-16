# Feature de Home

A Home é a rota de entrada da área autenticada. Ela apresenta a visão da
Orthovet, reserva uma miniatura para o futuro vídeo de apresentação e um espaço
para os canais oficiais. Enquanto o vídeo e os perfis não forem publicados,
esses elementos são informativos e não expõem links sem destino.

Os três cards inferiores têm conteúdo integrado em uma única superfície, sem
rodapé separado. O primeiro usa Riffle do Hairline como ilustração interativa e
leva à página de Casos; os outros dois permanecem informativos até que seus
conteúdos e destinos sejam definidos.

O banner de apresentação usa Obsidian como base e mantém a paisagem em uma
faixa à direita, com corte vertical. `home-data-transition.tsx` desenha em
Canvas uma onda de pontos e microcaracteres no lado escuro do corte. A posição
e a intensidade ficam no código e em `home-page.module.css`, sem alterar a imagem.

## Animação de entrada

`use-home-page-entrance.ts` mantém a sequência GSAP da versão anterior:
avatar e saudação, banners e seus conteúdos, título da seção e cards com
stagger. A sequência dura aproximadamente 2,14 segundos. Os marcadores
`data-home-*` separam a animação da apresentação visual dos componentes;
os cards animam pelo `li` para preservar os efeitos de hover.

O estado `data-home-entrance="pending"` reserva o layout e oculta a Home
antes da hidratação, somente com JavaScript habilitado e sem preferência
por movimento reduzido. O hook prepara os estados iniciais antes de liberar
essa proteção, evitando mostrar o conteúdo antes de ocultá-lo para animar.
Ao terminar, remove os estilos temporários e `will-change`; ao desmontar,
reverte o contexto GSAP. A transição após login continua sob responsabilidade
do AppShell, sem uma segunda entrada da Home.

Quando a Home passar a consumir dados próprios, siga a convenção das features:
`services/` para acesso remoto, `hooks/` para cache e coordenação client-side,
e `types/` ou `schemas/` para contratos.
