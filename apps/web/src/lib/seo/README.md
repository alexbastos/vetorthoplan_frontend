# SEO e rotas pÃºblicas

`public-routes.ts` Ã© a fonte Ãºnica das URLs de conteÃºdo que podem entrar no
`sitemap.xml`. Uma rota sÃ³ deve ser adicionada quando tiver conteÃºdo final,
metadados revisados e autorizaÃ§Ã£o para ser indexada.

## Ao publicar uma nova pÃ¡gina de conteÃºdo

1. Crie a rota e traduza o conteÃºdo em todos os catÃ¡logos suportados.
2. Defina `title`, `description`, `alternates.canonical` e `robots` na pÃ¡gina.
3. Inclua o caminho em `indexablePublicRoutes` com prioridade e frequÃªncia de
   atualizaÃ§Ã£o adequadas.
4. Se a pÃ¡gina precisar de descoberta orgÃ¢nica em mais de um idioma, escolha
   antes uma estratÃ©gia de URLs localizadas (por exemplo, `/pt-BR/...` e
   `/en/...`) e publique `hreflang` para cada versÃ£o.

O idioma atual da aplicaÃ§Ã£o Ã© escolhido por cookie ou navegador, sem um
caminho por idioma. Isso Ã© adequado para a Ã¡rea autenticada, mas nÃ£o permite
anunciar versÃµes localizadas distintas aos buscadores. Portanto, nÃ£o devem ser
criados `hreflang` ou URLs fictÃ­cias antes dessa decisÃ£o de produto.
