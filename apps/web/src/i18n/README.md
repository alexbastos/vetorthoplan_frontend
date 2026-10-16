# Internacionalização

Este módulo é o único ponto de entrada para mensagens e configuração de idioma
do frontend. Features não devem importar catálogos JSON diretamente.

## Uso

Em Client Components, use `useTranslations` do `next-intl` com um namespace:

```tsx
const t = useTranslations("settings")
return <Button>{t("profile.saved")}</Button>
```

Em Server Components, use `getTranslations` de `next-intl/server`.

## Convenções

- Adicione a mesma chave em `messages/pt-BR` e `messages/en`.
- Organize mensagens pelo domínio funcional (`auth`, `settings`, `dashboard`),
  não pelo componente que hoje as consome.
- Use chaves semânticas estáveis; nunca use texto exibido ao usuário como chave.
- Para variáveis e plurais, use ICU. Exemplo: `"welcome": "Olá, {name}!"`.
- Dados persistidos e mensagens vindas de APIs não devem ser traduzidos aqui;
  o frontend traduz códigos estáveis de domínio.

## Resolução das preferências regionais

O idioma da renderização é resolvido nesta ordem:

1. Cookie HttpOnly `capta_locale`, projeção da preferência persistida no perfil.
2. Cabeçalho `Accept-Language` do navegador.
3. `pt-BR` como fallback.

O fuso horário usa a preferência IANA projetada no cookie HttpOnly
`capta_time_zone` e recorre a `America/Sao_Paulo` quando ela estiver ausente ou
inválida. Idioma e fuso são sincronizados no login, na renovação de sessão e ao
salvar as preferências. Esses cookies evitam consultar o perfil durante a
renderização de cada rota.

Datas visíveis devem usar os formatadores do `next-intl`. Componentes que
dependem do calendário do `date-fns` devem obter o locale por
`getDateFnsLocale`; não importe `ptBR` ou `enUS` diretamente em features ou
componentes.
