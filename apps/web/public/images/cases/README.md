# Ilustrações de empty-state

Os assets desta pasta são SVGs vetoriais locais. `empty-cases.svg` e
`empty-filtered-cases.svg` têm variantes `-dark.svg`; os componentes de casos
selecionam a versão com `dark:hidden` / `dark:block` e usam `next/image`,
`alt=""`, `aria-hidden="true"`, largura de `10.5rem` e altura automática.
Títulos, descrições e ações pertencem aos componentes, fora dos SVGs.

## Sem imagens

- Claro: [`empty-images.svg`](./empty-images.svg), do [nó 1:1422 no Figma](https://www.figma.com/design/YlVDp9aA91nlmGwhq64DNk/Empty-State-Illustrations--Community-?node-id=1-1422).
- Escuro: [`empty-images-dark.svg`](./empty-images-dark.svg), do [nó 1:882 no Figma](https://www.figma.com/design/YlVDp9aA91nlmGwhq64DNk/Empty-State-Illustrations--Community-?node-id=1-882).

Obtidos pelo plugin do Figma em 23/10/2026. Cada arquivo preserva os 17 paths
da ilustração original (`Vector_2` a `Vector_18`), incluindo coordenadas,
cores, preenchimentos e traços. A versão escura vem do desenho original,
sem recoloração automática.

O recorte `viewBox="20 27 142 114"` mantém a ilustração inteira, com fundo
transparente e dimensões de 142 × 114, como nos assets existentes. Apenas
a moldura/fundo da apresentação e as legendas “No Image” e
“You have no photos yet” foram excluídos. Os IDs de exportação foram removidos.
Não há imagens rasterizadas, fontes ou referências externas.

Validação: os atributos dos 17 paths foram comparados com os exports originais.
A renderização em 4× (568 × 456), sobre o fundo original de cada tema,
teve zero pixels diferentes do mesmo recorte dos exports do Figma.

Para consumir, use `/images/cases/empty-images.svg` e sua variante escura,
com `width={142}`, `height={114}` e o mesmo tratamento decorativo dos demais
empty-states. Os arquivos estão disponíveis para uso; nenhuma tela foi
alterada para exibi-los nesta inclusão.
