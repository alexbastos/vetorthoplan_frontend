# Plano de implementação da Comunidade

A Comunidade será uma área de mensagens diretas dentro do VetOrthoPlan. A primeira entrega cobre a interface navegável com dados de demonstração. A segunda conecta o fluxo a um serviço de mensagens, assim que os contratos estiverem disponíveis.

## 1. Entrada e estrutura da página

- Criar a rota protegida `/app/community` em `apps/web/src/app/(protected)/app/community` e concentrar os componentes e estados da tela em `apps/web/src/features/community`.
- Usar o `AppShell` para manter navegação, sessão e tema. Fazer a área de mensagens preencher a altura disponível no `AppStage`. A barra superior do aplicativo já ocupa parte da janela, então a altura do painel deve acompanhar a área útil do shell.
- Ligar **Acessar Comunidade**, na Home, à nova rota. Usar **Comunidade** no contexto da barra superior e **Mensagens** como título da lista. Incluir as traduções em português e inglês.
- Montar a estrutura com dois blocos no desktop. O primeiro contém a lista de **320 px**, um divisor de **1 px** e o chat flexível, dentro da mesma superfície com cantos arredondados. O segundo é o perfil, fechado por padrão, com **cerca de 300 px** e **16 px** de separação quando aberto. Usar os tokens do projeto para superfícies, bordas e estados nos dois temas.

**Aceite** — O atalho abre a página autenticada. O painel aproveita a altura disponível, sem rolagem horizontal. Com o perfil fechado, o chat ocupa todo o espaço à direita da lista.

## 2. Lista de conversas e navegação

- Criar o cabeçalho de **Mensagens** com o ícone de chat de **16 px**, título de **15 px** e botão circular de busca de **36 px**. Ao abrir a busca, expandir o campo em aproximadamente **300 ms** e mover o foco para ele. Ao fechar, devolver o foco à lupa.
- Abaixo do cabeçalho, mostrar **Mensagens diretas** com contagem. Cada item tem avatar de **40 px**, nome, prévia em uma linha, data à direita e menu de contexto. A conversa selecionada recebe um fundo discreto. O menu aparece ao passar o cursor, receber foco ou abrir, com acesso direto em telas de toque.
- Compor cada item com um controle para abrir a conversa e outro para o menu. Manter a rolagem da lista independente do histórico.
- No desktop, abrir a primeira conversa disponível se ainda não houver seleção. No celular, entrar pela lista e mostrar a conversa em largura total quando selecionada. O botão de voltar retorna à lista com a posição anterior.

**Aceite** — A busca filtra por nome, a seleção acompanha o chat aberto e o menu de um item pode ser acionado sem trocar a conversa. A lista funciona com teclado, mouse e toque.

## 3. Conversa, histórico e composição

- Manter o cabeçalho acima da rolagem, com avatar de **36 px**, nome em **14 px**, subtítulo profissional e ações circulares de **32 px**. Reproduzir no desktop a sequência visual de cinco posições: busca, duas ações intermediárias, perfil e menu. Na demonstração, as duas posições intermediárias ficam desabilitadas até a definição das ações da Comunidade. Em telas estreitas, o botão de voltar fica antes do avatar.
- Organizar o histórico por data, com separadores discretos. Prever o espaço para um aviso contextual centralizado, com até **560 px**, acima do primeiro separador. Alinhar mensagens recebidas à esquerda e enviadas à direita. Usar balões com largura máxima de **75%**, texto de **13 px**, avatar de **26 px** nas mensagens recebidas e identificação de autor e horário. Preservar quebras de linha e acomodar palavras longas.
- Fazer o histórico ocupar o espaço entre cabeçalho e campo de mensagem, com rolagem própria. Ao abrir uma conversa, mostrar as mensagens recentes. Ao receber uma nova mensagem enquanto a pessoa lê trechos antigos, preservar a posição e oferecer um atalho para o fim.
- Reproduzir o campo de mensagem no rodapé com cantos de **19 px**, área inicial de uma linha e expansão até **140 px**. A fileira inferior reserva o anexo à esquerda e os controles de áudio e envio à direita. Respeitar a área segura no celular. O envio fica indisponível enquanto o rascunho estiver vazio e não houver anexo pronto.
- Na demonstração, permitir digitar e enviar texto localmente. Usar dados fictícios para validar histórico curto e longo, nomes extensos, conversa vazia e múltiplas conversas. Preservar o rascunho por conversa durante a navegação na tela.

**Aceite** — O cabeçalho e o campo de mensagem permanecem visíveis com histórico longo. Trocar de conversa preserva o rascunho de cada uma. O teclado virtual mantém o campo de mensagem alcançável.

## 4. Perfil lateral e ações do cabeçalho

- Abrir **Ver perfil** como terceira coluna, com título **Perfil**, botão de fechar e rolagem própria. O botão no cabeçalho indica o estado aberto. Organizar o perfil em identidade profissional, informações básicas, **Sobre** e áreas de atuação, com **Ver perfil completo** abaixo da identidade quando houver uma página de destino.
- Com espaço suficiente no desktop, manter a lista com 320 px e reduzir só a largura do chat ao abrir o perfil. Em uma largura intermediária, abrir o perfil sobre a conversa quando a terceira coluna deixaria o chat apertado. No celular, mostrar o perfil em largura total e voltar para a mesma conversa.
- Preservar a mensagem visível e o rascunho ao abrir ou fechar o perfil, mesmo quando a mudança de largura altera as quebras de linha. Ao fechar pelo botão ou por `Escape`, devolver o foco ao acionador.
- Implementar **Buscar na conversa** com contagem e navegação entre resultados. Ao selecionar um resultado, rolar até ele e aplicar um destaque de aproximadamente **2 segundos**, respeitando a preferência por movimento reduzido.
- Usar o menu existente do projeto para as opções. Prever **Marcar como não lida** e **Silenciar** como ações de conversa. Propostas, pagamentos e agendamento ficam fora desta entrega. Disponibilizar ações de mensagem tanto por foco quanto por mouse ou toque.

**Aceite** — Abrir e fechar o perfil conserva a conversa ativa, o ponto de leitura e o texto digitado. Uma busca encontra e destaca a mensagem certa. Perfil e menus funcionam por teclado e têm nomes acessíveis.

## 5. Integração com mensagens e perfis

Esta etapa depende do serviço de Comunidade. A inspeção do código do backend clínico e dos contratos OpenAPI clínico e de autenticação disponíveis no workspace confirmou que eles ainda não expõem operações de conversas ou mensagens. A interface atual usa dados fictícios, e o envio existe apenas no estado da tela.

Para iniciar a integração, confirmar qual serviço será responsável pela Comunidade e obter o contrato OpenAPI correspondente ou uma especificação equivalente. A primeira entrega do serviço precisa permitir listar e abrir uma conversa existente entre duas contas de teste, enviar texto e consultar o histórico após recarregar. Também é preciso definir como uma conversa começa e quem pode encontrar e contatar outros membros. Isso determina se a Comunidade é global ou restrita a uma organização e qual identidade o frontend deve apresentar ao serviço.

| Fluxo | Contrato necessário |
| --- | --- |
| Conversas | Lista paginada com ID estável, última mensagem, contagem de não lidas e resumo do participante. Definir criação de conversas e regras de descoberta e acesso. |
| Histórico | Mensagens com identificador e ordenação estáveis, paginação de mensagens anteriores e busca com acesso ao contexto do resultado. |
| Envio | Criação de mensagem com uma chave de idempotência gerada no cliente e devolução da mensagem persistida. A mesma chave identifica a mesma tentativa após timeout. O serviço deve documentar o comportamento se a chave for repetida com conteúdo diferente. |
| Atualizações | Mecanismo para receber novas mensagens, atualizar contagens e retomar o histórico após reconexão. |
| Perfil e preferências | Campos visíveis do perfil profissional, regras de visibilidade, leitura e silenciamento. |
| Anexos e áudio | Tipos e limites aceitos, autorização de upload e download, progresso e tratamento de falhas. Ativar cada controle quando seu fluxo estiver pronto. |

1. **Conectar leitura e envio de texto.** Usar a sessão do aplicativo na integração do servidor com o serviço. Carregar a lista e o histórico por conversa, renderizar os estados de carregamento, vazio, erro e nova tentativa e substituir a mensagem em envio pela mensagem confirmada. Atualizar a prévia e a ordenação da lista a partir da resposta do serviço.
2. **Conectar atualização, busca e preferências.** Reconciliar mensagens por ID, retomar do ponto conhecido após uma reconexão e preservar a posição de leitura quando chegam mensagens. Buscar no histórico completo conforme o contrato e carregar o trecho que contém o resultado. Integrar os campos públicos de perfil, a leitura e o silenciamento.
3. **Ativar anexos e áudio.** Aplicar os limites do serviço, acompanhar o progresso e manter os arquivos vinculados à tentativa de envio em caso de falha. Confirmar que o serviço valida o acesso tanto no envio quanto na leitura do anexo.

O aceite integrado precisa de duas contas participantes e uma terceira sem acesso. Exercitar o envio em ambos os sentidos e recarregar as duas sessões. Simular a perda da resposta depois que a mensagem foi persistida e confirmar que a nova tentativa retorna a mesma mensagem. Validar que a terceira conta não consegue acessar diretamente a conversa, o histórico ou os anexos, mesmo conhecendo os identificadores.

**Aceite** — Dois usuários conseguem trocar mensagens e consultar o histórico após recarregar. Falhas de rede permitem tentar novamente sem duplicar envios. Uma conta fora da conversa não consegue ler seu conteúdo ou abrir seus anexos.

## 6. Revisão visual e aceite final

| Cenário | Conferir |
| --- | --- |
| Desktop, perfil fechado | Lista de 320 px, divisor fino, chat até a borda direita, alinhamento dos cabeçalhos, densidade da lista e posição do campo de mensagem. |
| Desktop, perfil aberto | Painel lateral de cerca de 300 px, espaçamento de 16 px, seções de perfil e histórico na mesma posição após fechar. |
| Largura intermediária e celular | Mudança de layout sem cortes, controles alcançáveis, retorno entre lista, chat e perfil, teclado virtual e áreas seguras. |
| Claro e escuro | Superfícies, separadores, balões, seleção, estados de foco e contraste dos textos secundários. |
| Conteúdo e estados | Nomes e mensagens longos, conversa vazia, busca sem resultado, falha de envio, anexos e atualização com a pessoa longe do fim do histórico. |

Capturar a página no navegador com perfil aberto e fechado, nos dois temas, e revisar proporções, espaçamentos e alinhamentos antes de aprovar a interface. Cobrir com testes as transições que preservam o rascunho e a seleção, além de paginação e reenvio quando o serviço entrar.

**Ordem de entrega** — As etapas 1 a 4 compõem a interface navegável. A revisão visual começa ao final da etapa 4. A etapa 5 habilita a troca real de mensagens e a etapa 6 fecha o aceite integrado.
