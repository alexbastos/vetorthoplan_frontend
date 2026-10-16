# Componentes compartilhados

Componentes compostos e reutilizáveis do produto vivem nesta área. Eles não
buscam dados de domínio nem chamam APIs diretamente.

## App shell

`app-shell/` contém as partes estruturais reutilizáveis da área autenticada:

- `AppSidebar`: navegação persistente, com estados controlados `expanded` e
  `collapsed`.
- `HeaderApp`: contexto da rota, busca global, slot de ações e indicadores
  globais.
- `AppStage`: superfície de conteúdo que pertence a cada página.
- `AppShell`: composição responsiva da Sidebar, Header e Stage; persiste apenas
  a preferência visual de largura da Sidebar em `localStorage`.
- `app-navigation.ts`: fonte única para rótulos, ícones e destinos da
  navegação.

O layout protegido fornece ao `AppShell` somente o nome sanitizado do usuário.
Dados de domínio, ações de rota e interações dos utilitários globais permanecem
nas features e serão implementados em etapas próprias.
