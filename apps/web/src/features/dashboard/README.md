# Feature de Dashboard

Esta feature é a referência de composição para as primeiras páginas da área
autenticada. A rota importa apenas o seu componente público; o conteúdo de
palco, controles contextuais e contratos futuros permanecem neste diretório.

Os controles de período e exportação ocupam o slot global do Header por meio
de `HeaderActionsSlot`, sem fazer o shell compartilhar dependências com a
feature.

Quando existir o contrato de dados, as chamadas deverão entrar em `services/`,
o cache client-side em `hooks/` e os contratos em `types/` ou `schemas/`.
