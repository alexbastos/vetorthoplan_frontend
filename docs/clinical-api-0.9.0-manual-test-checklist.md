# Checklist de testes — integração clínica 0.9.0

Base: [plano de implementação](./clinical-api-0.9.0-execution-plan.md). Preparado em **22/10/2026**.

As tarefas 1–9 foram implementadas e verificadas com testes automatizados. A tarefa 10 e a parte de identidade da tarefa 13 também foram implementadas; a integração real ainda precisa deste aceite. **Nenhum item abaixo está marcado como aprovado antecipadamente.**

## Antes de começar

- Reinicie o frontend para carregar a configuração remota/JWT.
- Use uma conta de teste e casos/arquivos sintéticos. Reserve imagens que possam ser excluídas.
- Separe dois arquivos PNG/JPEG válidos e um DICOM suportado. Para rejeição, peça uma fixture sintética ao backend.
- Faça primeiro a **tarefa 10**, pois o acesso às organizações e à API é necessário para testar as demais. Depois, siga as tarefas 1–9 e a regressão final.
- Marque apenas os testes que passaram. Registre os demais como **falhou** ou **bloqueado**, com o número do teste. Não conseguir produzir um estado não significa aprovação.

## Pré-verificação — autenticação antes dos testes clínicos

Login e acesso clínico têm aceites separados. Um banco clínico novo não implica que o banco de usuários da Authentication API também tenha sido recriado. Confirme com o backend quais contas devem existir no ambiente. Criar outra conta não garante uma organização ativa nem resolve uma rota de troca de token indisponível.

- [ ] **AUTH.1 — Ambiente:** confirme a origem da Authentication API e da API clínica, reinicie o frontend e confira com o backend o ambiente/banco atendido por cada serviço. **Esperado:** os dois serviços pertencem ao ambiente pretendido; a URL do gateway, sozinha, não comprova qual banco está sendo usado.
- [ ] **AUTH.2 — Login novo:** use uma janela anônima para entrar com email/senha da conta de teste, sem aproveitar uma sessão anterior. **Esperado:** credenciais validadas pela Authentication API; entrar por uma sessão já aberta não conta como teste de senha. Teste login social separadamente, se utilizado.
- [ ] **AUTH.3 — Credenciais inválidas:** tente uma senha incorreta e uma conta sintética que o backend confirme não existir. **Esperado:** login recusado, sem sessão autenticada nem acesso à área protegida.
- [ ] **AUTH.4 — Conta antiga:** teste a conta do projeto anterior em sessão nova. **Esperado:** recusa se ela não existir mais na Authentication API do ambiente; se foi preservada/migrada, login pode funcionar e o acesso clínico ainda depende de organização e token próprios. Registre qual condição foi confirmada pelo backend.
- [ ] **AUTH.5 — Cadastro novo:** cadastre uma conta sintética e conclua a verificação de email. **Esperado:** login funciona após as etapas exigidas; sem associação ativa, os casos exibem ausência de organização. Depois de a equipe preparar a associação e o contexto clínico correspondente, repita o teste 10.2. Não pressupor criação automática de organização pelo frontend.
- [ ] **AUTH.6 — POSTs vazios em produção:** após publicar o ajuste do BFF e dos clientes, abra casos e configurações/perfil e recarregue com access token expirado e sessão renovável. **Esperado:** `/api/auth/session`, `/api/cases/context` e `/api/settings/profile` enviam `Content-Type: application/json` explícito, sem corpo, e não falham com 415 por ausência desse cabeçalho. Sem sessão válida, a verificação chega a 401; com sessão renovável, o acesso prossegue após a renovação. O BFF continua exigindo sessão, origem válida e zero bytes no corpo. Se necessário, compare somente `Content-Type` e presença/tamanho do corpo no navegador e na entrada do container, sem registrar cookies ou tokens. A camada responsável por alterar/rejeitar o cabeçalho em produção ainda não foi identificada.

**Diagnóstico do bloqueio observado em 22/10/2026:** `POST /api/cases/context` retornou `CLINICAL_ORGANIZATION_UNAVAILABLE`, conforme resposta fornecida pelo usuário. No resolvedor atual, esse código no POST sem seleção corresponde a HTTP 404 da consulta de organizações ou da troca de token na Authentication API. Não equivale ao estado normal `no_organizations`, nem comprova conta inválida. O BFF não informa qual dessas duas chamadas falhou: conferir no backend `GET /authentication_api/api/v1/organizations` e, se houver organização ativa, `POST /authentication_api/api/v1/auth/organizations/{orgId}/token`. Registrar somente etapa, status e código sanitizados; não compartilhar credenciais. O acesso clínico real permanece **bloqueado**, sem aprovação dos demais testes por esse diagnóstico.

## Tarefa 1 — criação e sexo obrigatório

- [ ] **1.1 — Obrigatórios:** tente criar sem título, nome do animal, espécie ou sexo. **Esperado:** indicação junto aos campos; nenhum caso criado.
- [ ] **1.2 — Sexo:** abra um formulário novo. **Esperado:** nenhuma opção selecionada automaticamente. Crie um caso Macho e outro Fêmea; reabra e confira os valores.
- [ ] **1.3 — Criação sem imagem:** preencha os dados válidos, crie e abra o caso sem radiografia. **Esperado:** caso salvo como rascunho, acessível após recarregar; imagem continua opcional.
- [ ] **1.4 — Envio repetido:** clique rapidamente duas vezes em criar. **Esperado:** botão protegido durante o envio e um único caso na lista.
- [ ] **1.5 — Erro de conexão:** fique offline antes de enviar e depois reconecte. **Esperado:** formulário preservado e possibilidade de tentar novamente, sem mensagem falsa de sucesso.

## Tarefa 2 — sessões de upload e múltiplos arquivos

- [ ] **2.1 — Seleção múltipla:** selecione dois arquivos juntos e adicione outro depois. **Esperado:** três linhas independentes; nenhum arquivo substitui o anterior.
- [ ] **2.2 — Progresso:** envie um arquivo; use rede lenta nas ferramentas do navegador se necessário. **Esperado:** barra avança conforme o transporte, sem simular conclusão nem ficar em movimento indefinido após terminar.
- [ ] **2.3 — Etapas separadas:** acompanhe envio e processamento. **Esperado:** terminar o transporte não anuncia imagem pronta; confirmação e ingestão têm seus próprios estados.
- [ ] **2.4 — Arquivo inválido:** selecione extensão não permitida e um arquivo acima de 100 MiB. **Esperado:** recusa com mensagem compreensível, sem criar uma sessão para esses arquivos.
- [ ] **2.5 — Independência:** envie arquivos diferentes em sequência e acompanhe cada linha. **Esperado:** progresso e resultado de um não substituem os dados dos demais.

Perda da resposta de criação, expiração e limite de sessões: **A2**, nos testes assistidos abaixo.

## Tarefa 3 — estados das imagens

Alguns estados são rápidos ou dependem de fixtures do backend. Confira os disponíveis e registre os demais como bloqueados.

- [ ] **3.1 — Pendente:** confira uma sessão ainda não confirmada. **Esperado:** envio pendente; não aparece como arquivo recebido ou pronto.
- [ ] **3.2 — Quarentena e processamento:** acompanhe um upload válido. **Esperado:** arquivo recebido/aguardando ingestão e validando conteúdo são distintos de conclusão.
- [ ] **3.3 — Pronta:** selecione uma imagem `READY` com prévia disponível. **Esperado:** conclusão e abertura da prévia.
- [ ] **3.4 — Rejeitada, falha e cancelada:** abra exemplos de `REJECTED`, `FAILED` e `CANCELLED`. **Esperado:** mensagens distintas, sem check de sucesso ou prévia indevida; rejeição permite escolher outro arquivo.
- [ ] **3.5 — Lista mista:** abra um caso com uma imagem pronta e outra com erro. **Esperado:** a lista funciona; selecionar a pronta não mostra o erro da outra.

## Tarefa 4 — retomada após recarregar

- [ ] **4.1 — Refresh:** recarregue depois da confirmação, enquanto o processamento estiver na fila ou em andamento. **Esperado:** acompanhamento retomado, sem selecionar o arquivo ou enviar novamente.
- [ ] **4.2 — Nova aba:** abra diretamente a URL desse caso em outra aba autenticada. **Esperado:** imagens persistidas e processamento recuperados.
- [ ] **4.3 — Término:** aguarde o job terminar. **Esperado:** estado atualizado e fim das consultas periódicas daquele job; a imagem só fica pronta quando o backend informar `READY`.
- [ ] **4.4 — Vários arquivos:** acompanhe dois jobs e alterne entre quadro e área de upload. **Esperado:** cada arquivo mantém seu acompanhamento; abrir a área não multiplica consultas do mesmo job.
- [ ] **4.5 — Falha na consulta:** interrompa a conexão durante o acompanhamento e reconecte. **Esperado:** mensagem de indisponibilidade e recuperação pela atualização manual, sem criar outro upload.

## Tarefa 5 — nascimento e idade

- [ ] **5.1 — Desconhecida:** crie sem nascimento e sem idade; reabra. **Esperado:** informação permanece ausente, sem idade zero ou nascimento inventado.
- [ ] **5.2 — Idade declarada:** crie com **4 anos e 2 meses**; teste também **0 anos e 7 meses**. **Esperado:** valores preservados após reabrir, equivalentes a 50 e 7 meses respectivamente.
- [ ] **5.3 — Nascimento:** informe uma data passada e depois altere-a. **Esperado:** idade calculada e não editável enquanto houver nascimento; após salvar, o detalhe apresenta a idade/referência registrada pelo backend.
- [ ] **5.4 — Limpar nascimento:** preencha idade, selecione nascimento e depois limpe a data. **Esperado:** campos de idade voltam a ser editáveis e recuperam o rascunho declarado.
- [ ] **5.5 — Limites:** tente nascimento futuro, meses acima de 11 e idade de 50 anos e 1 mês. **Esperado:** bloqueio com mensagem no campo. Idade de zero meses e o limite de 50 anos são válidos.
- [ ] **5.6 — Layout:** confira alinhamento entre nascimento/idade, unidades discretas nos inputs, tooltip breve e botão de limpar; repita em tela estreita e usando Tab. **Esperado:** campos legíveis e ajuda acessível.

Coerência dos dois campos HTTP e datas especiais: **A5**.

## Tarefa 6 — tentar processamento novamente

**Pré-requisito:** job com falha operacional `FAILED`, preparado com apoio do backend se necessário.

- [ ] **6.1 — Retry:** clique em “Tentar processamento novamente”. **Esperado:** mesmo arquivo e job voltam ao acompanhamento; não há nova seleção nem transporte ao storage.
- [ ] **6.2 — Clique repetido:** clique rapidamente duas vezes. **Esperado:** uma solicitação em andamento, sem comandos duplicados pela tela.
- [ ] **6.3 — Resultado:** aguarde a nova tentativa. **Esperado:** estado atualizado; conclusão apenas com imagem pronta. Se falhar novamente, a nova falha é informada.
- [ ] **6.4 — Rejeição:** abra um arquivo rejeitado por conteúdo. **Esperado:** não oferecer retry operacional; orientar novo arquivo.

Resposta perdida, conflito e resultado indefinido: **A6**.

## Tarefa 7 — cancelar sessão de envio

- [ ] **7.1 — Antes do envio:** remova um arquivo ainda na fila/preparação. **Esperado:** trabalho local interrompido e linha removida; outros arquivos preservados.
- [ ] **7.2 — Durante o envio:** com rede lenta, cancele um arquivo. **Esperado:** transporte interrompido e cancelamento solicitado; a linha só anuncia cancelamento confirmado, sem afirmar exclusão da imagem.
- [ ] **7.3 — Após refresh:** reabra um caso com sessão `PENDING_UPLOAD` e use “Cancelar envio”. **Esperado:** ação funciona sem o arquivo local original.
- [ ] **7.4 — Falha de conexão:** tente cancelar offline. **Esperado:** erro/resultado indefinido informado; não anunciar sucesso. Ao reconectar, permitir verificar ou concluir o cancelamento.
- [ ] **7.5 — Outros arquivos:** cancele apenas um entre vários. **Esperado:** os demais continuam intactos e arquivos já confirmados não são excluídos.

Corrida com confirmação, upload tardio e limpeza: **A7**.

## Tarefa 8 — excluir imagem salva

- [ ] **8.1 — Desistir:** abra a confirmação de exclusão e cancele o modal. **Esperado:** arquivo permanece; nenhum DELETE enviado.
- [ ] **8.2 — Confirmar:** exclua uma imagem sintética pronta. **Esperado:** confirmação identifica o arquivo; imagem removida também após recarregar.
- [ ] **8.3 — Selecionada/última:** exclua a imagem selecionada e depois a última imagem do caso. **Esperado:** prévia/seleção limpas ou ajustadas e estado vazio correto; os dados do caso permanecem.
- [ ] **8.4 — Preservação:** exclua uma entre várias imagens. **Esperado:** as outras continuam disponíveis e funcionando.
- [ ] **8.5 — Bloqueio/falha:** confira imagem em processamento e tente uma exclusão sem conexão. **Esperado:** processamento não oferece exclusão; erro ou conflito não remove a imagem nem anuncia sucesso.

Ausência em outra aba, resposta perdida e limpeza física: **A8**.

## Tarefa 9 — peso

- [ ] **9.1 — Valores válidos:** crie/reabra casos com `31,40`, `31.4`, `0,01`, `,5` e `99999,99`. **Esperado:** peso correto, sem arredondamento indevido; vírgula e ponto aceitos. A exibição pode simplificar `31,40` para `31,4 kg`.
- [ ] **9.2 — Opcional:** deixe vazio e reabra o caso. **Esperado:** ausência de peso, sem converter para zero.
- [ ] **9.3 — Caracteres:** digite e cole letras, `-15`, `1e2`, `31kg`, `1.234,56` e espaços. **Esperado:** edição inválida recusada integralmente, mantendo o valor anterior, sem alerta novo nem conversão para outro peso.
- [ ] **9.4 — Quantidade:** tente seis dígitos inteiros e três casas decimais. **Esperado:** edição recusada; até cinco dígitos inteiros e duas casas aceitos.
- [ ] **9.5 — Envio inválido:** tente salvar com `0` ou decimal incompleto. **Esperado:** validação impede criar com esse peso.
- [ ] **9.6 — Edição:** apague tudo, substitua uma seleção, altere o separador e teste no celular. **Esperado:** edição fluida e teclado decimal quando disponível. Espécie e raça permanecem texto livre.

## Tarefa 10 + identidade da tarefa 13 — acesso e ambiente remoto

**Comece por esta seção.** Para as variações de organização/MFA, use contas de teste preparadas pela equipe.

- [ ] **10.1 — Login:** após a pré-verificação AUTH, entre com uma conta válida; conclua MFA quando solicitado. Para acessar casos, use uma conta com organização ativa e contexto clínico preparados pela equipe. **Esperado:** sessão autenticada no produto; acesso aos casos somente após resolver organização e emitir o token clínico, sem pedir tokens ao usuário.
- [ ] **10.2 — Uma organização:** use conta com uma organização ativa. **Esperado:** seleção automática e organização identificada na área de casos.
- [ ] **10.3 — Várias organizações:** use conta com duas ou mais ativas. **Esperado:** escolha explícita antes de acessar os casos.
- [ ] **10.4 — Nenhuma organização:** use conta sem organização ativa. **Esperado:** contexto com estado `no_organizations` e orientação de associação a uma organização; nenhum acesso a casos de outra organização. Um erro 403/404 na consulta/troca não aprova este cenário: registrar como falhou/bloqueado e investigar o backend.
- [ ] **10.5 — Troca:** pela listagem, mude de organização. **Esperado:** lista, imagens, prévias e jobs passam ao novo contexto, sem mostrar dados anteriores.
- [ ] **10.6 — Duas abas:** deixe um caso aberto em uma aba e troque a organização pela outra. Ao voltar, tente uma ação. **Esperado:** divergência bloqueada e solicitação para atualizar o contexto; nada é alterado na organização errada.
- [ ] **10.7 — Sair/entrar:** faça logout e entre com outra conta. **Esperado:** nenhum dado da conta anterior reaparece.
- [ ] **10.8 — Upload completo remoto:** envie PNG/JPEG e DICOM suportado, aguarde processamento e abra a prévia. **Esperado:** storage acessível, confirmação e worker funcionando; sem `127.0.0.1:9000`, conexão recusada ou 409 persistente de objeto ausente.
- [ ] **10.9 — Prévia temporária:** deixe uma prévia expirar e abra-a novamente. **Esperado:** acesso renovado quando necessário; URL antiga não deixa a tela quebrada permanentemente.

Renovação de tokens, permissões, CORS e isolamento técnico: **A10**.

## Regressão final — jornada da tarefa 11

- [ ] **11.1 — Listagem:** listar, buscar por título/animal/espécie/raça, aplicar status, limpar filtros e avançar páginas. **Esperado:** resultados coerentes e sem duplicações entre páginas; vazio e erro com mensagens adequadas.
- [ ] **11.2 — Jornada completa:** login → organização → criar caso → enviar dois arquivos → adicionar outro → acompanhar → abrir prévia → recarregar → reabrir pela listagem. **Esperado:** dados e estados preservados em cada passagem.
- [ ] **11.3 — Jornada sem imagem:** criar → abrir sem radiografia → voltar depois e adicionar arquivo. **Esperado:** nenhum bloqueio exigindo as duas etapas juntas.
- [ ] **11.4 — Apresentação:** testar tela estreita, teclado e idiomas português/inglês. **Esperado:** textos, foco, botões, tooltip, barras e mensagens por arquivo utilizáveis, sem sobreposição.

### Testes assistidos — frontend + backend

Estes cenários exigem inspeção de rede, fixtures, controle de respostas ou acesso ao ambiente. A opção “Offline” do navegador, sozinha, **não comprova perda de resposta depois de o servidor aceitar um comando**. Não interrompa o ambiente compartilhado para produzir falhas; combine os cenários com a equipe.

| ID / tarefa | O que verificar | Resultado esperado |
| --- | --- | --- |
| A1 — Criação | Perder a resposta após o backend criar o caso; recuperar a mesma tentativa. Conferir 422 por campo e leitura de caso antigo com sexo nulo. | Um único caso, dados preservados e erro associado ao campo; registro antigo continua legível. |
| A2 — Sessão | Perder o 201; repetir com mesma chave/metadados; testar chave com outro corpo, assinatura expirada e cota ativa. | Mesmos IDs na recuperação; conflito tratado; assinatura vencida não usada; limite sem retry automático. Chave chega ao backend, não ao storage. |
| A3 — Imagens | Lista com os sete estados, valores nulos e espaçamentos DICOM assimétricos. Tornar indisponível uma imagem com prévia em cache. | Sem erro por enum; ordem/unidade/nulos preservados; prévia antiga retirada. Nenhuma escala clínica inventada. |
| A4 — Retomada | Imagem sem `job_id`, descoberta com `{ job: null }`, 404/503 e consultas antigas atrasadas. | Descoberta quando necessária; sem loop para job ausente/erro; atualização manual recupera; resposta antiga não restaura estado anterior. |
| A5 — Idade | Nascimento/idade HTTP coerentes e divergentes; aniversário, fim de mês e 29 de fevereiro. | Coerentes aceitos, divergentes com 422 no campo; meses completos conforme referência do backend, sem deslocamento de data por fuso. |
| A6 — Retry | Job FAILED, perda do 202, 409 concorrente e leitura ainda ambígua. | GET de reconciliação, sem segundo POST automático; resultado indefinido oferece somente verificação até observar transição. |
| A7 — Cancelamento | Cancelar durante criação/confirmação; perder respostas; conferir upload tardio, expiração e cota. | Recupera a sessão original; confirmação vencedora preserva imagem/job; cleanup e liberação de cota confirmados pelo backend, sem deduzir pela linha removida. |
| A8 — Exclusão | 404 por exclusão em outra aba, 409, perda do 204 e prévia/job com resposta atrasada. Conferir objetos e vínculos no servidor. | Reconciliação sem DELETE automático repetido; conflito preserva imagem; exclusão não reaparece. Limpeza física conferida separadamente. |
| A9 — Peso | Inspecionar payload, resposta 201 e GET real dos valores do teste 9.1. | Entrada decimal canônica; resposta string decimal ou null, valor preservado; formato inesperado é registrado para ajuste explícito. |
| A10 — Identidade/ambiente | Expiração/renovação, revogação, mudança de associação/papel, 401/403/404/429, isolamento entre organizações e CORS. | Troca sem corpo e token clínico aceito; sem repetir mutações automaticamente; acesso indevido recusado; tokens não aparecem no JSON para JS, armazenamento do navegador, logs ou requisições ao storage. Upload/prévia em HTTPS e worker operante. |

**Regressão técnica a cargo do frontend:** executar testes automatizados, typecheck, verificador de contrato e build; corrigir/conferir cobertura do lint para TS/TSX. Isso não é uma ação necessária no seu roteiro pela interface.

## Como registrar um problema

Copie este modelo para cada falha:

```text
Teste: 4.1
Situação: falhou / bloqueado
Passos realizados:
Resultado esperado:
Resultado observado:
Data/hora e navegador:
Evidência: captura da tela e status/código do erro, se disponível
```

Não compartilhe senhas, tokens, cookies, URLs/campos assinados ou exportações completas da rede. Use apenas dados sintéticos nas evidências.

**Fora deste aceite:** planejamento/calibração/medidas clínicas da tarefa 12 continuam aguardando alinhamento. Os testes de autenticação acima cobrem a implementação entregue; o aceite real de JWT, permissões e isolamento da tarefa 13 depende também da equipe de backend.
