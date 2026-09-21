# Rotas protegidas

As páginas autenticadas vivem em `app/`, cujo `layout.tsx` é o limite de
segurança da área privada. Ele confirma a sessão no servidor antes de liberar
o conteúdo de uma rota.

O `middleware.ts` continua sendo apenas uma barreira rápida para requests sem os
cookies cifrados de sessão. Quando o access token expirou, o layout não renderiza
conteúdo protegido: ele aciona o BFF `/api/auth/session`, que pode rotacionar
os cookies HttpOnly, e só então atualiza a árvore do App Router.

A Home é a rota de entrada em `app/`; o Dashboard é a primeira feature de
referência em `app/dashboard`. Editais, Troni, Alertas e Relatórios serão
adicionados em etapas próprias abaixo de `app/`.
