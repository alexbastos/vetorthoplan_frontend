# Feature de Home

A Home é a rota de entrada da área autenticada. Ela apresenta a central da
plataforma sem assumir dados de oportunidades, editais ou alertas antes que os
respectivos contratos existam.

Quando a Home passar a consumir dados próprios, siga a convenção das features:
`services/` para acesso remoto, `hooks/` para cache e coordenação client-side,
e `types/` ou `schemas/` para contratos.
