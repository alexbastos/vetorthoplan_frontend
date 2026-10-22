# Atualização do frontend para a API clínica 0.9.0

Base: [contrato oficial preservado](./openapi/clinical-api.published-0.9.0-2026-10-20.openapi.json) e [estudo de compatibilidade](./backend-api-0.9.0-review.md). Início: **20/10/2026**.

**Origem oficial atual (21/10/2026):** `https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com` (Swagger em `/docs`). A publicação continua 0.9.0 e passou a declarar Bearer/JWT; veja a [comparação da nova publicação](./clinical-api-gateway-review-2026-10-21.md). A configuração remota depende da integração de identidade no BFF, além da tarefa 10.

## Forma de execução

**Roteiro para a rodada final:** [checklist de testes manuais por tarefa](./clinical-api-0.9.0-manual-test-checklist.md), com resultados esperados e cenários que precisam de apoio técnico.

- Uma entrega por vez, com aprovação antes da próxima.
- Cada fluxo contempla contrato, BFF, serviço do navegador, interface e testes pertinentes.
- Preservar a organização visual; atualizar comportamento, validação e mensagens.
- Registrar verificação automatizada e teste manual separadamente. Tipos gerados não significam integração concluída.
- Usar dados sintéticos nas verificações remotas.

## Acompanhamento

| Tarefa | Entrega | Dependência | Situação |
| --- | --- | --- | --- |
| 1 | Contrato, proveniência, tipos e sexo obrigatório | Snapshot oficial | Concluída; teste manual pendente |
| 2 | Idempotência na criação da sessão de upload | 1 | Concluída; teste final integrado pendente |
| 3 | Novos campos e estados de imagens | 1 | Concluída; teste final integrado pendente |
| 4 | Retomada do processamento após refresh | 3 | Concluída; teste final integrado pendente |
| 5 | Nascimento e idade com origem/referência | 1 | Concluída; teste final integrado pendente |
| 6 | Retry de job com falha operacional | 4 | Concluída; teste final integrado pendente |
| 7 | Cancelamento de sessão no backend | 2 e 3 | Concluída; teste final integrado pendente |
| 8 | Exclusão de imagem persistida | 3 e 7 | Concluída; teste final integrado pendente |
| 9 | Conferência do formato de peso | Documentação/resposta real | Implementada e verificada com HTTP simulado; serialização real pendente do teste integrado |
| 10 | Configuração da API remota e storage | Ambiente publicado e identidade clínica | Implementação JWT e origem remota prontas; aceite autenticado/storage pendente da jornada final |
| 11 | Jornada integrada e regressão final | 2 a 10 | Pendente |
| 12 | Plano, calibração e escala física | Definições complementares | Aguardando alinhamento |
| 13 | Autenticação clínica AUTH-01 | Contrato de identidade/token | Troca/organização implementadas com a tarefa 10; aceite real de JWT/isolamento pendente |

Tarefas 12 e 13 têm aceite próprio. AUTH-01 é necessário antes de homologação/produção autenticada; não impede o desenvolvimento local das anteriores.

## 1. Contrato e compatibilidade obrigatória da criação

- [x] Promover snapshot 0.9.0 e preservar export/metadados anteriores.
- [x] Atualizar origem, data conhecida da consulta, hashes e contagens; registrar identificação desconhecida do build como `null`.
- [x] Regenerar tipos; expor aliases de prontidão, cabeçalho obrigatório de sessão, consulta por imagem, retry, cancelamento e exclusão.
- [x] Conferir a fonte preservada no verificador, tratar metadados ausentes e verificar campos/operações novos.
- [x] Exigir sexo no formulário e no BFF, sem seleção automática, com indicação e erro acessíveis.
- [x] Aceitar `UNKNOWN` explicitamente no BFF; manter leitura de casos antigos com sexo nulo. O formulário mantém Macho/Fêmea.
- [x] Verificar contrato, geração reproduzível, typecheck, lint e testes.
- [ ] Testar manualmente seleção/erro no navegador e criação no backend atualizado.

**Aceite da implementação:** aplicação compila com os tipos oficiais; ausência de sexo impede envio pelo formulário e chamada clínica pelo BFF. As novas operações têm tipos disponíveis; seus fluxos pertencem às tarefas seguintes.

## 2. Idempotência da sessão de upload

**Endpoint:** `POST /api/v1/cases/{case_id}/image-uploads`.

**Trabalho:** chave estável por comando/arquivo em `Idempotency-Key`, enviada navegador → BFF → backend. Reutilizar chave/metadados após resposta perdida; iniciar nova operação quando necessário. Tratar conflito de chave, limite ativo, assinatura expirada e falha ambígua conforme as regras publicadas.

**Testes/aceite:** header chega ao upstream; retry recupera a mesma sessão; metadados diferentes não reutilizam a chave; duplo envio não cria operações paralelas; 409 oferece ação coerente. Prioridade imediata porque o cabeçalho se tornou obrigatório.

### Implementação da tarefa 2

- [x] Gerar uma chave UUID por comando/arquivo e salvar a tentativa antes do POST. Manter a tentativa somente em memória.
- [x] Associar a tentativa ao caso, nome, MIME, tamanho e SHA-256; mudar qualquer metadado ou iniciar outro comando gera outra chave.
- [x] Enviar o cabeçalho no serviço do navegador, validar no BFF e encaminhar sem substituição ao backend, com o tipo `CreateImageUploadHeaders`.
- [x] Reutilizar tentativa e checksum após resposta perdida, falha de rede/serviço ou resposta inválida. Não reenviar automaticamente.
- [x] Recusar assinatura vencida/próxima da expiração antes do transporte; encerrar a tentativa e permitir novo comando por ação explícita.
- [x] Separar limite ativo de conflito de sessão. Não exibir retry para o conflito; preservar seleção e orientar conferência dos arquivos.
- [x] Preservar a confirmação idempotente por `upload_id`, sem criar sessão nova para retry de confirmação.
- [x] Verificar TypeScript, contrato, testes automatizados e build; resultado registrado abaixo.
- [ ] Executar os cenários de navegador/storage/backend real no teste final combinado.

| Situação | Chave e comportamento |
| --- | --- |
| Primeiro comando do arquivo | Gerar chave e guardar metadados antes de enviar. |
| Resposta da criação perdida ou inválida | Repetição manual usa a mesma chave e metadados; não recalcula o hash do mesmo arquivo. |
| Outro arquivo ou novo comando, inclusive mesmo conteúdo selecionado novamente | Chave independente. Não há deduplicação de arquivos por nome. |
| Assinatura recebida já vencida ou próxima do vencimento | Não transportar; próxima tentativa explícita começa novo comando. Não presumir que repetir a chave renova assinatura. |
| Sessão recebida e transporte iniciado | A tentativa de criação sai da memória da fila; uma nova sessão explícita terá outra chave. A identidade da sessão continua disponível para confirmação. |
| Falha recuperável na confirmação | Repetir confirmação para o mesmo `upload_id`; não voltar à criação. |
| 409 de limite | Informar limite; sem retry automático ou troca automática de chave. |
| Outro 409 estruturado da criação | BFF devolve `IMAGE_UPLOAD_SESSION_CONFLICT`, código público próprio. Não assumir o nome interno do código remoto nem expor mensagens do provedor. |

**Limites desta entrega:** a tentativa sobrevive a retries enquanto a fila estiver montada; não é persistida entre refresh/fechamento. Remover um arquivo ainda não cancela a sessão no servidor: essa ação pertence à tarefa 7. O contrato não detalha toda a política de expiração/replay da chave; esses comportamentos devem ser conferidos na jornada real, sem adotar prazo inventado no frontend.

### Roteiro reservado para o teste final — tarefa 2

1. Selecionar dois arquivos juntos e outro depois; conferir sessões/chaves independentes e ausência de substituição na lista.
2. Interromper a resposta de criação depois de o servidor recebê-la; tentar novamente e conferir mesma chave, `upload_id` e `image_id`, sem consumir outra sessão.
3. Repetir ação rapidamente; conferir que a fila mantém um comando ativo por vez e o backend não duplica a sessão.
4. Repetir a chave com metadados diferentes em cenário controlado; conferir 409 tratado como conflito, sem retry cego. Novo comando legítimo usa outra chave.
5. Esperar assinatura expirar ou simular sessão recuperada vencida; conferir ausência de POST binário pela assinatura inválida e nova chave apenas após ação explícita.
6. Atingir o limite ativo e simular 503/JSON inválido; conferir mensagens distintas, arquivo preservado e recuperação com a chave original quando aplicável.
7. Confirmar que a chave vai apenas ao BFF/backend clínico; multipart de storage mantém todos os campos assinados e arquivo por último, sem receber esse cabeçalho ou cookies.
8. Conferir que nenhuma chave, assinatura, metadado clínico ou checksum foi adicionado a logs/telemetria/armazenamento persistente.

## 3. Campos e estados de imagens

**Endpoints:** `GET /api/v1/cases/{case_id}/images` e `GET /api/v1/images/{image_id}`.

**Trabalho:** aceitar `FAILED` e `CANCELLED` em tipos, schemas e apresentação; propagar `job_id` e dados físicos/orientação necessários; preservar nulos e unidades. Atualizar lista, fila e prévia sem invalidar outras imagens.

**Testes/aceite:** lista com todos os estados válidos não gera 502 por enum desatualizado; estados incompatíveis não exibem conclusão/prévia; dados DICOM ausentes não produzem escala inventada.

### Implementação da tarefa 3

- [x] Aceitar os sete estados oficiais em schemas compartilhados pelo BFF e navegador; derivar o tipo local do contrato gerado.
- [x] Propagar os campos novos até `CaseImage`, preservando `null` e exigindo a presença dos campos obrigatórios do contrato.
- [x] Validar pares de espaçamento e orientação com seis números, sem converter unidades, inverter eixos ou preencher dados ausentes.
- [x] Apresentar falha operacional e cancelamento na lista, fila de upload e painel da imagem, sem sucesso indevido ou retry operacional ainda não integrado.
- [x] Bloquear prévia para qualquer estado diferente de `READY`, inclusive quando houver flag de prévia ou URL antiga em cache.
- [x] Encerrar polling de jobs quando a imagem persistida estiver em estado terminal; preservar consulta inicial/manual do job.
- [x] Fazer o painel considerar apenas o job da imagem selecionada; falha de outro arquivo não substitui sua mensagem.
- [x] Validar listas mistas, nulos, geometria, prévia e estados terminais nos testes automatizados.
- [ ] Conferir apresentação visual e respostas reais no teste final integrado.

| Campo upstream | Campo no navegador | Preservação |
| --- | --- | --- |
| `job_id` | `jobId` | UUID ou nulo; sem inventar vínculo quando não existe. |
| `pixel_spacing_mm` | `pixelSpacingMm` | Par `[linhas, colunas]` em mm ou nulo. |
| `imager_pixel_spacing_mm` | `imagerPixelSpacingMm` | Par `[linhas, colunas]` em mm ou nulo, separado de Pixel Spacing. |
| `image_orientation_patient` | `imageOrientationPatient` | Seis números na ordem recebida ou nulo. |

**Comportamento:** `FAILED` informa falha de processamento; `CANCELLED` informa envio cancelado, sem afirmar exclusão do arquivo. Ambos encerram o estado de espera e bloqueiam prévia. Apenas `READY` pode mostrar conclusão; para abrir prévia também é necessário `previewAvailable`. Um estado terminal persistido tem prioridade sobre o estado antigo do job no cache.

**Limites:** os dados físicos são preservados, mas não usados como escala da prévia nem como autorização para medir. Convenções/transformações e aceite clínico pertencem à tarefa 12. `jobId` agora chega ao navegador, mas a reconstrução de acompanhamento após refresh continua na tarefa 4. Retry do worker, cancelamento persistido e exclusão continuam nas tarefas 6–8.

### Roteiro reservado para o teste final — tarefa 3

1. Abrir um caso com os sete estados e conferir que `FAILED`/`CANCELLED` não derrubam a lista nem impedem selecionar uma imagem pronta.
2. Selecionar imagens falhas/canceladas; conferir mensagens e ausência de prévia/check de conclusão. Conferir que falha de outro arquivo não altera o painel selecionado.
3. Alterar uma imagem de `READY` para estado indisponível em cenário controlado; conferir que uma URL já carregada não mantém a prévia visível.
4. Conferir `PENDING_UPLOAD` sem anúncio de recebimento; diferenciar `QUARANTINED`, processamento, rejeição, falha e cancelamento.
5. Conferir parada do polling nos quatro estados terminais, mesmo se o cache ainda tiver job ativo. Atualizar manualmente não deve reenfileirar processamento.
6. Consultar PNG/JPEG e DICOM: nulos permanecem nulos; espaçamentos assimétricos e orientação chegam sem alteração de ordem/unidade. Nenhuma escala clínica é calculada nesta etapa.
7. Conferir no navegador que a resposta BFF contém os campos previstos, sem metadados DICOM livres, checksum ou informações privadas do storage.

## 4. Retomada após refresh

**Endpoints:** `GET /api/v1/images/{image_id}/job` e `GET /api/v1/jobs/{job_id}`.

**Trabalho:** reconstruir acompanhamento pela imagem/job persistidos; usar consulta por imagem quando necessária; tratar `{ job: null }`, 404 e falha de leitura. Evitar polling duplicado e atualizar imagem após término.

**Testes/aceite:** refresh durante fila/processamento recupera o job; estados terminais encerram polling; ausência de job não inicia loop; falha de leitura permite nova consulta consciente.

### Implementação da tarefa 4

- [x] Reconstruir alvos pelas imagens persistidas, sem depender das referências em memória da confirmação.
- [x] Priorizar `jobId` retornado na imagem; manter confirmações em memória como ponte enquanto a lista é atualizada.
- [x] Implementar `GET /api/cases/{caseId}/images/{imageId}/job`, com sessão BFF, verificação de imagem/caso e validação dos vínculos do job.
- [x] Descobrir job por imagem somente quando necessário; aproveitar a resposta no cache canônico, sem outra leitura imediata do mesmo job.
- [x] Centralizar monitoramento no hook `useCaseIngestions`. Quadro, lista e upload compartilham a mesma consulta de imagens; a área de upload oculta não cria outro monitor.
- [x] Consultar jobs ativos a cada dois segundos; encerrar polling em terminal, erro ou imagem terminal. Job nulo não cria temporizador.
- [x] Oferecer atualização manual para consulta indisponível, erro ou ausência de agendamento; atualizar não cria upload nem reenfileira worker.
- [x] Atualizar imagens uma vez por término/tentativa, em lote. Cancelar leituras antigas antes de invalidar, inclusive a primeira leitura ainda pendente.
- [x] Testar recuperação sem cache anterior, descoberta, deduplicação, falhas, identidades e corrida de atualização com o QueryClient real.
- [ ] Executar refresh e navegação com backend/storage reais no teste final combinado.

| Situação persistida | Comportamento |
| --- | --- |
| Imagem em ingestão com `jobId` | Leitura direta de `GET /api/v1/jobs/{job_id}` e acompanhamento enquanto ativo. |
| Imagem em ingestão sem vínculo disponível | Descoberta por `GET /api/v1/images/{image_id}/job`; job encontrado alimenta o cache usado pelo polling direto. |
| `PENDING_UPLOAD` sem job/confirmação | Exibir envio pendente; não iniciar acompanhamento de um job inexistente. |
| Descoberta devolve `{ job: null }` | Informar ausência de agendamento; aguardar atualização manual, sem polling da descoberta. |
| 404 de job/imagem ou falha de consulta | Informar indisponibilidade/falha e parar polling. Permitir nova leitura manual. |
| `SUCCEEDED`, `REJECTED` ou `FAILED` | Encerrar polling e reconciliar a lista. `SUCCEEDED` sozinho não muda imagem para `READY`. |
| Imagem `FAILED` | Recuperar dados do job uma vez para consulta; sem retry automático do worker. |
| Imagem `READY`, `REJECTED` ou `CANCELLED` | Não reconstruir monitor a partir de confirmações antigas dessa imagem. |

**Integridade:** referências são restritas ao caso, imagem, upload e job correspondentes. O endpoint BFF de descoberta confere a imagem antes de consultar o job e entrega apenas o DTO público. Chaves duplicadas não geram dois observadores do mesmo job no monitor. A navegação não persiste dados clínicos em armazenamento do navegador.

**Escopo da retomada:** acompanhamento de ingestão após confirmação do upload. O binário e a assinatura permanecem efêmeros; cancelar sessão, reenfileirar worker e excluir imagem continuam nas tarefas 6–8. A descoberta sem job/indisponível depende de atualização manual para uma nova leitura. Em homologação/produção, o isolamento autenticado será validado com AUTH-01.

### Roteiro reservado para o teste final — tarefa 4

1. Confirmar upload, recarregar o quadro durante `QUEUED` e durante `PROCESSING`; conferir recuperação sem cache anterior e o mesmo `job_id`.
2. Abrir diretamente a URL do caso em nova aba com sessão válida; conferir retomada pelas imagens persistidas, sem arquivo local ou nova sessão de upload.
3. Acompanhar dois arquivos, abrir/fechar a área de upload e verificar na rede um único monitor por job, com intervalo de dois segundos.
4. Simular imagem sem vínculo e descoberta nula; conferir mensagem de agendamento e ausência de chamadas repetidas. Atualizar manualmente após o job existir deve iniciar acompanhamento.
5. Simular 404, falha de rede e 503; conferir parada e recuperação manual, inclusive quando outro arquivo continua processando.
6. Observar término de vários jobs; conferir atualização da lista e parada de timers. Uma leitura antiga de imagens em andamento não pode deixar o quadro preso no estado anterior.
7. Conferir `FAILED`, `REJECTED` e `CANCELLED` após refresh; nenhuma ação deve anunciar retry/exclusão automática ou exibir prévia indevida.
8. Validar tentativa de consulta com imagem de outro caso e vínculos divergentes em cenário controlado; conferir rejeição sem exposição de detalhes privados.

## 5. Nascimento e idade

**Endpoints:** `POST /api/v1/cases` e `GET /api/v1/cases/{case_id}`.

**Trabalho:** substituir exclusão mútua por consistência em meses completos na referência do backend. Com nascimento, calcular idade e impedir edição contraditória; sem nascimento, aceitar idade declarada, com entrada em anos/meses e rótulo “Idade”. Propagar `age_source`/`age_reference_date` até o navegador e preservar informação desconhecida. Mapear divergência 422 ao campo.

**Testes/aceite:** nascimento apenas, idade apenas, ambos coerentes, divergência, idade zero, aniversário, fim de mês/ano bissexto e mudança de data entre preenchimento/envio. Reabrir preserva origem/referência; erro mantém formulário e idempotência.

### Implementação da tarefa 5

- [x] Substituir a entrada única em meses por **Idade**, com campos de anos completos e meses adicionais (0–11).
- [x] Refinar alinhamento com nascimento: somente “Idade” acima, unidades dentro dos campos, descrição curta e ajuda complementar em tooltip acionável por foco, clique ou toque.
- [x] Converter idade declarada para `approximate_age_months`, preservando zero e desconhecido. Uma parte vazia vale zero somente quando a outra foi informada; ambas vazias produzem nulo.
- [x] Preservar o limite de 600 meses para idade declarada: aceitar 50 anos e zero meses; rejeitar 50 anos e um mês.
- [x] Com nascimento selecionado, mostrar cálculo em meses completos, somente para leitura. Manter a idade declarada anterior como rascunho, restaurada ao limpar a data.
- [x] Enviar somente `birth_date` como entrada de idade quando houver nascimento; `approximate_age_months` segue nulo. O backend calcula na data efetiva de criação. A prévia da tela usa a data UTC do navegador e não é enviada.
- [x] Remover a exclusão mútua do BFF: aceitar os dois campos estruturalmente válidos e encaminhá-los intactos, inclusive em replay. A coerência é validada pelo backend, sem recalcular contra o relógio/data do BFF.
- [x] Propagar `age_source` e `age_reference_date` em criação e consulta até o navegador, exigindo a presença das propriedades e preservando nulos.
- [x] Exibir a idade retornada em anos/meses, junto de origem e referência quando disponíveis. Não atualizar silenciosamente a idade declarada nem calcular a idade de leitura pela data atual.
- [x] Retirar o máximo de 600 meses da leitura: o schema de resposta não tem esse máximo, e nascimento pode produzir uma idade calculada maior. Manter inteiros não negativos.
- [x] Mapear erro 422 de `approximate_age_months` para os dois campos de idade; com nascimento selecionado, indicar também a data editável. Preservar valores, corpo e chave da tentativa; nenhuma correção/repetição automática.
- [x] Verificar calendário, limites, feedback e roundtrip criação → consulta com respostas HTTP simuladas.
- [ ] Conferir apresentação, teclado, formulário e valores no backend real durante a jornada final.

| Entrada na interface | Payload de idade | Leitura e apresentação |
| --- | --- | --- |
| Nascimento conhecido | `birth_date`; idade numérica nula | Idade calculada pelo backend; origem `BIRTH_DATE` e referência preservadas. |
| 4 anos e 2 meses, sem nascimento | Nascimento nulo; `approximate_age_months: 50` | Idade declarada, sem fabricar nascimento ou avançar com o relógio. |
| Zero informado em uma ou ambas as partes | `approximate_age_months: 0` | Exibir zero meses, sem confundir com desconhecido. |
| Nascimento e ambas as partes vazias | Nascimento e idade nulos | Preservar origem/referência nulas; exibir “Não informado”. |
| Ambos os campos HTTP enviados por um cliente BFF | Encaminhar valores válidos sem exclusão mútua | Backend confirma coerência ou devolve 422; não substituir seus valores. |

**Referência e calendário:** a prévia usa diferença de meses de calendário, descontando um mês quando o dia de referência ainda não alcançou o dia do nascimento. Não usa dias/30, horas decorridas ou conversão de fuso de datas sem horário. Nos casos de fim de mês/29 de fevereiro, comparar com o backend no teste final; o OpenAPI não detalha convenções especiais para esses dias. Qualquer convenção do servidor continua prevalecendo na idade salva, pois a prévia não entra no payload. Na leitura, idade, origem e referência vêm exclusivamente da resposta.

### Roteiro reservado para o teste final — tarefa 5

1. Criar sem nascimento/idade e recarregar: desconhecido permanece nulo, sem idade zero ou nascimento inventados.
2. Criar com idade apenas: 4 anos e 2 meses, 7 meses, zero meses e 50 anos. Conferir payload em meses, origem `DECLARED`, referência e reabertura.
3. Tentar 50 anos e um mês, meses acima de 11 e entradas inválidas; conferir mensagens associadas aos campos e bloqueio antes de request.
4. Selecionar/alterar nascimento: cálculo somente para leitura, sem possibilidade de idade contraditória. Limpar pelo botão e conferir retorno do rascunho declarado, inclusive zero.
5. Conferir nascimento no dia anterior/no aniversário, fim de mês e 29 de fevereiro; comparar cálculo e referência da resposta. Conferir nascimento futuro/inválido e valor definitivo ao atravessar a meia-noite.
6. Em cenário controlado, enviar os dois campos HTTP coerentes e divergentes: BFF encaminha; backend aceita ou responde 422, com feedback seguro nos campos. Nenhum retry automático ou alteração de valores.
7. Simular perda da resposta de criação e repetir no dia seguinte com o mesmo corpo/chave: conferir um único caso e referência/idade originais. Editar dados inicia outro comando.
8. Abrir casos antigos com sexo nulo e idade desconhecida; conferir preservação dos nulos. Ler origem/referência sem atualizá-las pelo relógio do navegador. Conferir datas sem deslocamento por fuso e textos em português/inglês.
9. Conferir alinhamento com nascimento, unidades dentro dos campos, tooltip por teclado/clique/toque, botão de limpar, campos somente para leitura, associação das mensagens e layout em tela estreita.

## 6. Retry operacional

**Endpoint:** `POST /api/v1/jobs/{job_id}/retry`.

**Trabalho:** rota BFF autenticada, serviço e ação apenas para `FAILED`; reutilizar mesmo job/arquivo e retomar acompanhamento após 202. Tratar 404/409; conteúdo rejeitado exige novo arquivo.

**Testes/aceite:** falha operacional é reenfileirada; clique duplo/resposta perdida são reconciliados consultando o job; `REJECTED` não chama retry.

### Implementação da tarefa 6

- [x] Implementar `POST /api/cases/{caseId}/jobs/{jobId}/retry`, com sessão BFF, validação de origem/método e corpo vazio.
- [x] Consultar e validar o vínculo do job com o caso **antes** de qualquer mutação; permitir o POST clínico somente para `FAILED`.
- [x] Encaminhar o comando sem corpo e sem credenciais do storage. Validar que job, caso, imagem e upload da resposta são os mesmos da leitura anterior.
- [x] Separar 404, 409, falta de permissão, resposta inválida e indisponibilidade com mensagens seguras; não repassar mensagens/detalhes privados do backend.
- [x] Exibir “Tentar processamento novamente” na imagem com job `FAILED` confirmado. Na fila de arquivos já confirmados, a ação existente passa a reenfileirar o job; falhas anteriores à confirmação continuam usando o fluxo de upload correspondente.
- [x] Impedir a ação para conteúdo rejeitado, imagem pronta, cancelada, transporte pendente ou job ainda não conhecido.
- [x] Compartilhar o comando em andamento por caso/job no QueryClient: clique duplo e outra instância da tela aguardam a mesma operação. Arquivos diferentes continuam independentes.
- [x] Fazer nova leitura antes do comando: se o job já avançou, apenas reconciliar e acompanhar. Depois de 409 ou resposta ambígua, consultar o job, sem repetir automaticamente o POST.
- [x] Quando persistir dúvida, substituir a ação por “Verificar processamento”, que faz somente GET. Preservar esse estado no cache em memória ao navegar/remontar a tela.
- [x] Reaproveitar o mesmo cache de job e invalidar a lista após o resultado. Cancelar leituras antigas antes de publicar dados da tentativa.
- [x] Retomar polling a cada dois segundos após confirmação, inclusive enquanto a imagem ainda estiver `FAILED` até o worker iniciar. Também reconhecer uma tentativa externa por uma leitura nova de job ativo; cache antigo sozinho não autoriza essa transição.
- [x] Encerrar polling em estado terminal/erro e reconciliar a imagem por tentativa. Apenas a resposta persistida da imagem pode liberar `READY` e prévia.
- [x] Testar fluxo e concorrência com QueryClient real e HTTP simulado, incluindo navegador → BFF → transporte clínico e perda do 202 após aceitação.
- [ ] Conferir ação, worker real, estados/erros e aparência na jornada final integrada.

| Situação | Comportamento |
| --- | --- |
| Job `FAILED` confirmado | Nova tentativa explícita; mesmo job e arquivo, sem novo upload. |
| Job já `QUEUED`/`PROCESSING` na leitura anterior ao comando | Não enviar POST; retomar acompanhamento. |
| Conteúdo `REJECTED` | Oferecer novo arquivo corrigido; não reenfileirar o job. |
| 404 | Informar indisponibilidade e atualizar a consulta/lista. |
| 409 por mudança de estado | Consultar o job e reconciliar; não fazer retry automático do POST. |
| Resposta perdida, mas GET encontra job ativo/terminal novo | Adotar o estado observado e atualizar a imagem. |
| Resposta ambígua e GET ainda devolve o mesmo `FAILED` | Manter somente verificação manual, sem novo comando enquanto o resultado permanecer indefinido. |
| Uma tentativa nova também termina em `FAILED` | Informar nova falha e permitir outra tentativa explícita. |

**Limite do contrato:** o endpoint de retry não publica chave de idempotência. Uma resposta perdida seguida do mesmo `FAILED`, com a mesma versão/tentativa, não comprova se o comando foi recebido. A interface mantém somente consultas até observar uma transição; não anuncia retry como exatamente uma vez no backend. Comando, bloqueio e informação de dúvida ficam em memória do QueryClient e não sobrevivem a um recarregamento completo. Após refresh, uma ação explícita sempre começa consultando o job novamente.

### Roteiro reservado para o teste final — tarefa 6

1. Em caso sintético com falha operacional, clicar em “Tentar processamento novamente”; conferir um POST sem corpo, mesmo `job_id`/`image_id`/`upload_id` e ausência de novo transporte ao storage.
2. Conferir nova fila/processamento no quadro e na fila de upload; o arquivo não deve continuar anunciado como falho após o agendamento confirmado, nem aparecer como pronto antes da imagem `READY`.
3. Clicar rapidamente duas vezes e alternar entre quadro/upload: conferir um único comando para aquele job. Repetir com dois arquivos distintos e conferir independência.
4. Simular perda da resposta após aceitação: conferir GET de reconciliação, retomada do mesmo job e ausência de segundo POST automático.
5. Simular resultado indefinido, GET com falha e mesmo `FAILED`: conferir “Verificar processamento”, somente GETs, preservação ao navegar e recuperação quando surgir uma transição.
6. Alterar o job entre a leitura e o POST para produzir 409; conferir reconciliação sem reenvio. Conferir job/imagem ausentes e ação sem permissão.
7. Conferir `REJECTED`, `READY`, `CANCELLED` e `PENDING_UPLOAD`: não oferecer reenfileiramento operacional. Conteúdo recusado deve solicitar novo arquivo.
8. Encerrar a tentativa em `SUCCEEDED`, `REJECTED` e `FAILED`; conferir parada do polling, atualização por tentativa e possibilidade de nova ação explícita somente para falha operacional.
9. Recarregar durante uma tentativa iniciada em outra tela: mesmo que a imagem ainda informe `FAILED`, uma leitura nova de job ativo deve retomar o acompanhamento.
10. Conferir foco, estado desabilitado durante a solicitação, mensagens por arquivo, português/inglês e tela estreita. Testar o vínculo com outro caso em cenário controlado e conferir que nenhuma mutação é feita.

## 7. Cancelamento de sessão

**Endpoint:** `DELETE /api/v1/image-uploads/{upload_id}`.

**Trabalho:** separar cancelamento de checksum, interrupção de transporte e cancelamento persistido. Acionar backend quando houver sessão pendente; limpar assinatura local; reconciliar corrida com confirmação. Tratar 204/404/409 e a impossibilidade de revogar a assinatura.

**Testes/aceite:** cancelar antes/depois de criar sessão e durante transporte produz a ação correta; demais arquivos seguem independentes. Conferir upload tardio, limpeza e liberação de cota no ambiente real; não anunciar exclusão quando apenas o transporte foi interrompido.

### Implementação da tarefa 7

- [x] Implementar `DELETE /api/cases/{caseId}/image-uploads/{uploadId}`, com sessão BFF, validação de origem/método, corpo vazio e resposta 204 sem JSON.
- [x] Validar a sessão pela lista de imagens do caso antes da mutação; não existe GET de sessão no contrato. Uma sessão já `CANCELLED` converge para 204; imagem recebida/processando não é cancelada nem excluída.
- [x] Separar remoção local, interrupção do checksum/transporte e cancelamento persistido. Durante checksum/fila sem sessão, remover a seleção sem chamar a API clínica.
- [x] Ao cancelar durante a criação, aguardar a resposta para obter IDs, sem abortar a criação nem iniciar transporte. Se a resposta se perder, recuperar a mesma sessão com a chave/metadados originais e cancelá-la.
- [x] Permitir recuperar IDs de uma assinatura expirada exclusivamente para cancelamento; transporte continua rejeitando assinaturas expiradas. Recusa definitiva de criação não provoca replay/cancelamento de sessão alheia.
- [x] Abortar transporte/confirmação locais quando solicitado; usar requisição independente para cancelar a sessão. Cancelar uma seleção não aborta os demais arquivos.
- [x] Remover a linha após cancelamento confirmado; falha/resultado indefinido mantém a seleção com mensagem e ação de verificação/cancelamento. 404 não é anunciado como exclusão concluída; uma sessão indisponível pode ser dispensada localmente.
- [x] Reconciliar 409 e resposta perdida consultando as imagens. Se a confirmação venceu a corrida, preservar a linha vinculada à imagem recebida e retomar acompanhamento, sem outro transporte ou exclusão.
- [x] Cancelar a sessão anterior antes de reiniciar um transporte que falhou; preservar a intenção de reenvio caso o cancelamento precise de outra tentativa explícita.
- [x] Disponibilizar “Cancelar envio” para imagens persistidas em `PENDING_UPLOAD`, inclusive depois de refresh. Compartilhar solicitações simultâneas por sessão no QueryClient.
- [x] Extrair a fila para `createCaseFileUploadQueue`; o hook React assina snapshots com `useSyncExternalStore`. A mesma interface é exercitada nos testes de concorrência/cancelamento.
- [x] Descartar referências ao formulário assinado após uso/cancelamento. Nenhuma assinatura entra no estado da fila, cache, armazenamento persistente ou telemetria.
- [x] Ao desmontar, interromper trabalho local e tentar encerrar sessões pendentes, inclusive as respostas tardias de criação; preservar arquivos já confirmados.
- [x] Verificar pipeline, respostas 204/404/409, duplicação, criação perdida e progresso independente com HTTP simulado/QueryClient real.
- [ ] Conferir worker/storage, upload tardio, limpeza, cota, aparência e navegação no ambiente real.

| Momento/situação | Efeito |
| --- | --- |
| Arquivo na fila/checksum, sem sessão | Interromper e remover somente a seleção local. |
| Criação em andamento ou resposta ambígua | Obter/recuperar a sessão com a chave original; cancelar sem enviar bytes. |
| Sessão pendente, com transporte/confirmação em andamento | Interromper a chamada local; solicitar cancelamento pelo BFF. |
| 204 ou imagem `CANCELLED` confirmada por leitura | Informar cancelamento; remover a seleção local correspondente. A imagem persistida não é excluída. |
| Resposta perdida, rede indisponível ou mesmo `PENDING_UPLOAD` | Manter seleção; verificar. Um novo DELETE depende de ação explícita após leitura. |
| 404/sessão indisponível | Informar indisponibilidade; não afirmar cancelamento/exclusão. Permitir dispensar a seleção local. |
| Confirmação já ocorreu/409 | Consultar a imagem e acompanhar o processamento; não forçar cancelamento ou exclusão. |

**Limites:** abortar o POST do navegador não garante que nenhum byte chegou ao storage. A assinatura emitida não pode ser revogada; mesmo após 204, um upload tardio pode exigir a limpeza do backend depois de `expires_at`. A rotina de limpeza e liberação de cota serão verificadas no ambiente real. O encerramento da aba/processo não garante execução do cleanup React ou entrega de requests finais; sessões não encerradas dependem da expiração/limpeza do backend. Fila, arquivo, comando e assinaturas continuam apenas em memória.

### Roteiro reservado para o teste final — tarefa 7

1. Cancelar uma seleção na fila e durante checksum: conferir remoção, encerramento do Worker e ausência de criação/cancelamento HTTP.
2. Cancelar durante criação e simular perda da resposta 201: conferir mesma chave/metadados, um único registro, nenhum transporte e cancelamento da sessão recuperada.
3. Cancelar durante transporte: conferir abort somente daquele arquivo, DELETE sem corpo pelo BFF e progresso normal dos demais arquivos.
4. Cancelar durante confirmação e produzir corrida 409: conferir que o arquivo recebido permanece e que o job é acompanhado. Nenhuma exclusão de imagem ou reenvio binário deve ocorrer.
5. Simular 204 perdido, rede indisponível e 404; conferir verificação, mensagens e preservação da seleção, sem falso anúncio de exclusão. Testar clique duplo e cancelamento pela lista após refresh.
6. Reiniciar transporte recusado/expirado: conferir cancelamento da sessão anterior antes de novo comando, nova chave apenas para o reenvio e preservação do arquivo se o cancelamento falhar.
7. Deixar uma sessão cancelada receber upload tardio em cenário sintético controlado; conferir rotina de limpeza após expiração e liberação de cota. Não deduzir limpeza física pelo desaparecimento da linha.
8. Sair durante criação/transporte e reabrir o caso: conferir cancelamento possível e estado persistido; testar encerramento abrupto separadamente. Confirmados não podem ser cancelados no cleanup.
9. Conferir foco, nomes acessíveis de cancelar/verificar/remover localmente, estado em andamento, animação de saída após confirmação e textos em português/inglês.

## 8. Exclusão persistida

**Endpoint:** `DELETE /api/v1/images/{image_id}`.

**Trabalho:** integrar BFF/serviço/ação; diferenciar remover arquivo local, cancelar sessão e excluir imagem persistida. Respeitar bloqueios de job/sessão ativa e atualizar lista, seleção, prévia e caches após sucesso.

**Testes/aceite:** 204 permanece removido após refresh; 409 preserva imagem e informa impedimento; 404 reconcilia lista. Ocultar linha não equivale a excluir no servidor.

### Implementação da tarefa 8

- [x] Adicionar `DELETE /api/cases/{caseId}/images/{imageId}` autenticado e protegido por origem, sem corpo. Consultar e validar a imagem e seu caso antes de encaminhar o DELETE clínico.
- [x] Preservar 204 vazio e traduzir 404/409/falhas com códigos públicos, sem dados do storage ou mensagens técnicas.
- [x] Exigir confirmação com nome do arquivo e impacto sobre original, prévia e plano; integrar quadro e linhas de arquivos já confirmados, em português/inglês.
- [x] Manter remoção local e cancelamento de sessão nas ações existentes; exclusão persistida usa sua própria rota e confirmação.
- [x] Compartilhar comando por imagem, impedir mutações concorrentes de retry/cancelamento e preservar a imagem em caso de bloqueio.
- [x] Reconciliar ausência por leitura após 404/resposta perdida. Se o resultado continuar ambíguo, a próxima ação apenas verifica; outro DELETE requer ação explícita posterior.
- [x] Após 204/ausência confirmada, cancelar leituras antigas, limpar prévia/jobs/referências, atualizar lista/seleção e retirar somente a linha correspondente da fila.
- [x] Manter recibos de exclusão somente em memória para evitar restauração por leitura antiga; refresh recupera a verdade do backend.
- [ ] Executar os cenários reais de navegador, persistência e limpeza física no teste final combinado.

**Bloqueios:** imagem em `PROCESSING` não oferece exclusão. Sessões `PENDING_UPLOAD` podem estar vencidas; a lista permite solicitar a exclusão, e o backend decide pela validade da sessão e atividade do job, retornando 409 quando necessário. A fila ativa continua oferecendo cancelamento, sem transformar a ação em exclusão. Nenhum prazo é inventado no frontend. Um recibo 204 não permite verificar fisicamente os objetos removidos: isso será conferido no ambiente real.

### Roteiro reservado para o teste final — tarefa 8

1. Excluir uma imagem sintética READY pelo quadro e outra pela área de arquivos recém-enviados. Conferir confirmação, nome, exclusão persistida após refresh e preservação das outras imagens/arquivos.
2. Excluir a imagem selecionada e a última imagem do caso: conferir troca/limpeza do viewer, estado vazio, seleção e foco após o modal; cancelar o modal não deve emitir DELETE.
3. Testar sessão ainda válida, sessão vencida e job QUEUED/PROCESSING, inclusive corrida com retry. Conferir 409 sem remoção e sem retry automático.
4. Excluir em outra aba e repetir a ação: conferir reconciliação 404 pela lista. Se a leitura falhar ou ainda mostrar a imagem, não anunciar exclusão.
5. Interromper a resposta do DELETE após o servidor recebê-lo. Conferir consulta de reconciliação, verificação quando ambíguo e ausência de segundo DELETE automático/por clique duplo.
6. Atrasar consultas de prévia, imagem e job durante a exclusão. Conferir cancelamento, retirada da URL temporária e ausência de restauração/polling da imagem excluída.
7. Excluir REJECTED, FAILED e CANCELLED quando permitido. Conferir original, prévia, plano e registros do job no backend/storage; não deduzir limpeza física pelo desaparecimento da linha.
8. Conferir teclado, foco, mensagens pt-BR/en e bloqueios 401/403 com identidade clínica integrada. Não executar exclusões em dados reais de pacientes.

## 9. Formato de peso

**Trabalho:** conferir formatos aceitos/devolvidos realmente; alinhar criação, leitura BFF e leitura no navegador quando necessário. Preservar limites e duas casas na entrada; ausência de regex no OpenAPI não autoriza texto arbitrário.

**Testes/aceite:** decimal confirmado atravessa criação/reabertura; inválidos continuam rejeitados. Registrar quando nenhuma mudança funcional for necessária.

### Conferência e implementação da tarefa 9

**Evidência disponível:** o snapshot canônico e o novo export do API Gateway mantêm `CreateCaseRequest.weight_kg: number | string | null` e `CaseResponse.weight_kg: string | null`, sem regex para a string. A proposta de criação enviada pelo backend usa `31.4` na entrada e `"31.40"` na resposta; publica peso maior que zero, máximo de 99.999,99 kg e até duas casas decimais. Isso sustenta manter o formato decimal já adotado. Não foi obtida resposta clínica autenticada do ambiente novo; o serializador real permanece como aceite da jornada integrada.

| Camada | Regra aplicada |
| --- | --- |
| Formulário | Peso opcional; aceita vírgula ou ponto decimal, sem separador de milhar. `,5`/`.5` continuam representando 0,5 kg. Mínimo representável com duas casas: 0,01 kg; máximo: 99.999,99 kg. |
| Envio | String decimal com ponto (`31,40` → `"31.40"`); vazio → `null`. Normaliza zeros à esquerda sem converter/arredondar a fração. |
| BFF de criação | Mantém aceitação de número, string decimal canônica, `null` e campo omitido. Limites e precisão validados antes da API clínica; valores recebidos são encaminhados sem conversão de representação. |
| Resposta 201 e detalhe GET | Preserva string decimal ou `null`. BFF e navegador agora usam a mesma regra de positividade, limite e precisão; número em resposta, zero, excesso de precisão e texto inválido são recusados. |
| Exibição | Formatação localizada em kg, com até duas casas. `"31.40"` pode aparecer como `31,4 kg` em pt-BR; a string recebida continua intacta no modelo. |

- [x] Centralizar as regras em `case-weight.schema.ts`, usadas no formulário, na criação BFF e nas duas fronteiras de leitura.
- [x] Corrigir a leitura, que antes aceitava string com peso zero ou acima do limite e podia exibir valores não finitos.
- [x] Retirar a sanitização destrutiva do campo. Colar/digitar `-31.40`, `1e2`, `31.409` ou texto não pode produzir silenciosamente outro peso válido. No refino posterior autorizado, a edição inválida é recusada integralmente, mantendo o valor anterior sem novo aviso; teclado decimal móvel e visual foram preservados.
- [x] Remover o helper decimal sem consumidores e adaptar o teste legado que exigia truncamento; manter a sanitização de inteiros separada.
- [x] Verificar criação/reabertura com HTTP simulado, limites, ausência, rejeição em cada fronteira, erro de domínio e idempotência sem arredondamento.
- [ ] Confirmar serialização real no ambiente publicado e interação do campo no navegador durante a jornada final.

**Limites:** não foram acrescentadas notação científica, três casas decimais, separadores de milhar ou normalização de respostas arbitrárias sem evidência do backend. Nenhuma rota, tipo gerado, URL ou configuração de autenticação foi alterada nesta tarefa. Pesos incompatíveis recebidos do servidor geram erro de resposta; não são arredondados, convertidos para ausência ou mostrados como zero.

### Roteiro reservado para o teste final — tarefa 9

1. Criar casos sintéticos com `31,40`, `31.4`, `0,01`, `,5`, `99999,99` e campo vazio. Inspecionar o payload e a resposta 201; confirmar string decimal/null devolvida pelo servidor, GET após refresh e exibição localizada.
2. Digitar e colar letras, negativos, `1e2`, `31,409`, unidades (`31kg`), espaços, milhar (`1.234,56`) e excesso de dígitos. Conferir recusa integral da edição, mantendo o valor anterior sem aviso novo ou truncamento. Zero e decimais incompletos ficam editáveis, mas continuam impedidos pela validação existente ao enviar. Conferir apagar, selecionar/substituir, desfazer/refazer e corrigir valores inválidos de um formulário que já estivesse aberto.
3. Conferir teclado decimal móvel, edição do separador, apagar o campo, navegação por teclado, rótulo e mensagem acessível; validar pt-BR/en sem alterar o layout.
4. Interromper a resposta de criação: repetir o mesmo comando com peso inalterado e conferir mesmo corpo/chave, sem duplicação. Alterar o peso deve iniciar outra tentativa lógica.
5. Em HTTP controlado, testar número e string válidos na criação; número em resposta, peso zero/acima do limite, texto ou precisão extra devem falhar em BFF/navegador, sem peso inválido no quadro. Conferir 422 de domínio apontando ao campo.
6. Se o serializador real retornar outro formato, preservar uma fixture sintética e alinhar explicitamente o parser/contrato antes de ampliar a aceitação. Não deduzir o formato por um teste simulado.

**Refino de edição aprovado enquanto aguardamos a tarefa 10:** somente o campo de peso passa a limitar a entrada a cinco dígitos inteiros, um separador decimal (vírgula/ponto) e duas casas — máximo de oito caracteres. A restrição é aplicada à edição inteira, sem `maxLength` nativo que poderia truncar uma colagem para outro peso válido. Não há toast ou mensagem nova ao bloquear caracteres; as validações de envio e as regras do BFF permanecem. Espécie e raça continuam como texto livre, sem novas restrições. Valores antigos inválidos mantidos no formulário aberto podem ser apagados progressivamente.

## 10. Conexão remota e dependências

**Trabalho:** configurar `CLINICAL_API_BASE_URL=https://bwtp7pm5pc.execute-api.us-east-1.amazonaws.com` no servidor do BFF, sem `/docs`, com a troca de identidade exigida pelo ambiente publicado. Conferir `/health/ready` e listagem autenticada. Obter origens reais de upload/prévia e configurar CSP quando aplicável; validar CORS do bucket e worker ativo. Manter identidade local restrita a desenvolvimento/teste. A origem foi preservada localmente nas primeiras entregas e trocada para remota/JWT após a confirmação do contrato da organização.

**Aceite:** BFF alcança API e navegador alcança storage, sem reescrever assinatura ou expor token. HTTP 200 no Swagger não encerra esta tarefa.

### Avanço da tarefa 10 — 21/10/2026

- [x] Conferir origem oficial, health checks de autenticação/clínica e prontidão do banco: todos responderam 200.
- [x] Conferir o contrato de autenticação publicado e os caminhos usados pelo cliente existente. `AUTHENTICATION_API_BASE_URL` ativo já usa a origem correta; o caminho `/authentication_api/api/v1/auth` não deve entrar nessa variável.
- [x] Preservar o novo export de autenticação, comparar operações/schemas e atualizar exemplo de ambiente.
- [x] Criar e executar `corepack pnpm --filter web check:clinical-remote`: diagnóstico público sem credenciais, mutações ou dados clínicos.
- [x] Receber o contrato e a confirmação da implementação de `POST /authentication_api/api/v1/auth/organizations/{orgId}/token`. Preservar a fonte suplementar, sem falsificar o OpenAPI. A publicação no Swagger e o comportamento real continuam a conferir.
- [x] Definir `orgId` como o `id` da lista de organizações; selecionar a única ativa e pedir escolha entre várias. Informar ausência de organização sem criar uma automaticamente.
- [x] Implementar troca, cache cifrado HttpOnly e nova troca na expiração, sem misturar os refresh tokens. Validar associação atual, resposta/organização, papel/sessão e 401/403 sem repetir operações clínicas.
- [x] Criar seleção no BFF e interface, caches isolados por organização e expectativa de contexto para recusar divergência entre abas. Limpar cookies clínicos no logout.
- [x] Ativar a origem clínica remota em modo `jwt` no `.env` e exemplo, preservando as demais variáveis/segredos. Reiniciar o processo do frontend para usar a nova configuração.
- [x] Verificar HTTP simulado, criptografia/cookies, rotas do Next, TypeScript, contrato e build.
- [ ] Conferir listagem com sessão real, implantação da troca e JWT aceito pela clínica; exercitar login/MFA/renovação/isolamento no ambiente publicado.
- [ ] Validar destinos reais de storage, CORS, CSP e worker com dados sintéticos na rodada final. Não preencher origens por suposição.

**Situação após a resposta do backend:** implementação e configuração entregues; aceite operacional ainda pendente. O [contrato suplementar](./organization-token-contract.md) informa ausência de corpo, resposta, erros e escolha de organização. O [relatório da tarefa 10](./clinical-remote-integration-status.md) registra decisões, verificações e pendências reais. O frontend usa nova troca do access token clínico na expiração; não presume que o refresh token vinculado à organização pode substituir o refresh geral.

### Roteiro reservado para o teste final — identidade e conexão

1. Reiniciar o frontend; testar login normal/MFA, conta com uma organização ativa (automática), várias (escolha explícita) e nenhuma (orientação, sem acesso a casos).
2. Conferir POST de troca sem corpo no servidor, audiência clínica aceita, lista/caso criado/reaberto na organização escolhida. Nenhum token no JSON público, localStorage/sessionStorage, cabeçalho ao storage ou logs.
3. Esperar expiração, renovar a sessão geral e mudar papel/associação: conferir nova troca quando necessária, 401/403/404/429 tratados e ausência de repetição automática de POST/PUT/DELETE clínicos.
4. Trocar organização pela listagem e testar duas abas divergentes. Conferir descarte de cache/preview/jobs, 409 de contexto antes de mutações, seleção independente de UUID e ausência de mistura de dados.
5. Remover associação/inativar organização no ambiente sintético: conferir lista atual, impedimento de acesso e cookies clínicos limpos. Testar logout/login com outra conta e rotação dos segredos.
6. Enviar arquivos sintéticos, confirmar, acompanhar job, consultar e renovar prévia em HTTPS. Conferir origens exatas, CORS e worker; prontidão do banco não comprova essas etapas.

## 11. Jornada integrada e regressão

- Listar, buscar, filtrar e paginar; criar sem imagem, reabrir e recarregar.
- Selecionar dois arquivos juntos e adicionar outro depois; conferir progresso real, confirmação e ingestão por arquivo.
- Recarregar durante processamento; conferir prévia, expiração/renovação, rejeição, retry, cancelamento e exclusão.
- Exercitar erros por campo, falha de rede, resposta perdida, limite de sessões e bloqueios 409 com dados sintéticos.
- Executar testes pertinentes, typecheck, lint e build; registrar separadamente verificação automatizada e jornada real no navegador.
- Corrigir/conferir a cobertura do lint para TS/TSX: a configuração atual não seleciona esses arquivos, conforme aviso na execução direcionada. O sucesso do script atual não comprova lint desses componentes.

**Aceite:** sem duplicação de casos/sessões, polling infinito ou falso sucesso; resultados/pendências registrados. Isolamento autenticado entre tenants será validado com AUTH-01.

## 12–13. Planejamento e autenticação

**Planejamento:** fechar convenções de coordenadas, transformação original/prévia, escala/aspecto, plano inexistente e concorrência. Depois integrar GET/PUT, calibração por linha/círculo e metadados TPLO, com testes de salvar/reabrir e conflitos.

**AUTH-01:** a troca de token por organização foi implementada com a tarefa 10 após confirmação de audiência `vetorthoplan-api` pelo backend. Aceite real de assinatura/emissor/audiência, permissões, revogação e isolamento entre tenants permanece separado, antes de homologação/produção. O BFF não envia o token geral diretamente à clínica.

**Atualização de 21/10/2026:** o novo OpenAPI declara `HTTPBearer` nas 15 operações clínicas e menciona tokens da `authentication_api`. A disponibilidade do contrato avançou; ainda precisamos conferir emissor/audiência/claims/tenant e adaptar o cliente/resolvedor do BFF. A conexão remota deve ser alinhada com esta tarefa, sem retirar o bloqueio de produção ou enviar tokens ao JavaScript.

**Informação recebida e implementada durante a tarefa 10:** token clínico por troca sem corpo usando o token geral na Authentication API, `orgId` da lista atual e escolha quando houver várias. O contrato suplementar permite a implementação, embora a operação siga ausente do Swagger. Não interpretar testes simulados como confirmação da implantação/configuração JWT real.

## Registro da primeira entrega

- Snapshot canônico/tipos promovidos para 0.9.0. Tipos das demais APIs não foram regenerados.
- Preservados `openapi (1).json` e `clinical-api.0.8.0.snapshot.json` como referência anterior.
- Sexo obrigatório no formulário/BFF; sem opção pré-selecionada. Leitura de registros antigos preservada.
- **116/116 testes web passaram**, incluindo cenários novos de seleção obrigatória e bloqueio antes do upstream.
- `verify:clinical` e typecheck de api-client/web passaram. Segunda geração preservou o hash dos tipos; 99 referências locais resolvidas e fonte canônica idêntica à publicação preservada.
- O script de lint terminou sem erros, mas a configuração existente ignora TS/TSX por falta de configuração correspondente; cobertura registrada como pendência na tarefa 11. A execução direcionada confirmou esse aviso, sem alterar a configuração nesta entrega.
- Ao concluir a primeira entrega, teste visual/manual e criação real ficaram pendentes; upload e leitura dos novos estados ainda dependiam das tarefas 2 e 3, respectivamente.

## Registro da segunda entrega

- Fluxo de criação de sessão agora envia `Idempotency-Key` nas duas chamadas HTTP; nenhuma chave é gerada pelo BFF para substituir a do navegador.
- O teste de recuperação usa navegador/serviço → BFF → transporte HTTP → backend simulado: uma resposta perdida seguida de recuperação e chamadas simultâneas mantém uma única sessão. Reutilizar a chave com metadados diferentes produz conflito.
- **124/124 testes web passaram**; typecheck web e `verify:clinical` passaram. Incluídos testes de chave ausente/inválida, campos que distinguem comandos, expiração, propagação de cancelamento e apresentação de conflito sem retry.
- Build de produção concluiu com `APP_ORIGIN=https://localhost:3000` apenas no processo de verificação, sem alterar `.env`. Isso verifica compilação/empacotamento; não habilita identidade local em produção. A limitação de cobertura do lint registrada na tarefa 11 permanece.
- Teste final integrado permanece para depois das atualizações, conforme combinado. Novos estados de imagem continuam pendentes da tarefa 3.

## Registro da terceira entrega

- Lista, validação no navegador e prévia BFF atualizadas para os campos/estados 0.9.0. Schema upstream também conferido em TypeScript contra `GetImageResponse`.
- Dados físicos e vínculo de job preservados; lista mista validada e roundtrip BFF → navegador testado com espaçamentos assimétricos/orientação DICOM.
- Mensagens em português/inglês adicionadas; fila/quadro distinguem falha, cancelamento e envio pendente. Nenhuma nova operação de mutação foi habilitada.
- **133/133 testes web passaram**, assim como typecheck web, `verify:clinical` e build de produção. O build usou `APP_ORIGIN=https://localhost:3000` somente no processo de verificação, sem alterar `.env`. A limitação de cobertura do lint da tarefa 11 permanece registrada.
- Validação real/visual fica para o teste final combinado; retomada após refresh ainda pendente.

## Registro da quarta entrega

- Retomada reconstruída pelas imagens persistidas, com descoberta por imagem quando necessária. Integração de leitura; nenhuma nova mutação foi habilitada.
- Monitor compartilhado entre quadro e upload, cache de job reaproveitado, consultas deduplicadas e atualização de imagens por término/tentativa.
- Nova rota BFF `/api/cases/{caseId}/images/{imageId}/job` valida posse e vínculos antes de entregar o job ou nulo.
- **144/144 testes web passaram**. Testes novos usam QueryClient/QueryObserver reais com respostas HTTP simuladas, incluindo cancelamento de leitura antiga na reconciliação. Typecheck web, `verify:clinical` e build de produção passaram.
- O build usou `APP_ORIGIN=https://localhost:3000` somente no processo de verificação, sem alterar `.env`. Uma execução intermediária falhou por ausência do artefato gerado `/_document`; a repetição concluiu sem mudanças de código ou configuração. A causa dessa falha transitória não foi confirmada.
- Refresh/navegação reais e validação visual ficam para o teste final combinado. A limitação de cobertura do lint registrada na tarefa 11 permanece.

## Registro da quinta entrega

- Formulário em anos/meses e cálculo visual a partir do nascimento. Origem/referência do backend propagadas em criação e detalhe; a leitura usa o valor salvo.
- Idade conhecida pelo nascimento é calculada definitivamente no backend; o payload não inclui a prévia do navegador. A mesma tentativa não muda de corpo/chave ao atravessar uma data.
- BFF aceita ambos os campos e delega coerência ao backend. Feedback de idade inválida aponta ao grupo de idade e, quando necessário, ao nascimento editável.
- **154/154 testes web passaram**, incluindo dez testes novos de idade/roundtrip/recuperação. Typecheck web, `verify:clinical` e build de produção passaram. O build usou `APP_ORIGIN=https://localhost:3000` somente no processo de verificação, sem alterar `.env` ou configuração do Next.
- Testes reais e visuais permanecem para a jornada final combinada. Convenções especiais de calendário do backend serão conferidas nessa rodada. A limitação do lint registrada na tarefa 11 permanece.

## Registro da sexta entrega

- Rota BFF, serviço de retry, comando compartilhado por job e ações no quadro/fila integrados ao contrato 0.9.0.
- Reenfileiramento preserva job/arquivo; confirmação e consultas reconciliam concorrência e respostas perdidas. Dúvida persistente permanece em verificação manual, sem repetir POST.
- Polling retomado depois de retry confirmado ou leitura nova de job ativo, sem dar prioridade a um cache antigo sobre imagem terminal. Lista/prévia continuam dependendo do estado persistido da imagem.
- **169/169 testes web passaram**, incluindo 15 testes novos de BFF, serviço e comando com QueryClient real. Typecheck web, `verify:clinical` e build de produção passaram. O build usou `APP_ORIGIN=https://localhost:3000` somente no processo de verificação, sem alterar `.env` ou configuração do Next.
- Jornada real/visual fica para a rodada final combinada. A limitação de cobertura do lint da tarefa 11 permanece. Nenhuma operação clínica foi executada no ambiente remoto nesta entrega.

## Registro da sétima entrega

- Cancelamento de sessão integrado ao BFF, serviços, fila e lista persistida de imagens pendentes. Resposta 204 usa corpo vazio e mantém os cabeçalhos compartilhados do BFF.
- Fila extraída para módulo testável; preservados seleção múltipla, progresso real, confirmação e retry. Criação perdida é recuperada com a chave original para cancelamento, sem envio binário.
- Confirmação vencedora mantém arquivo/imagem para acompanhamento. Falhas de cancelamento preservam a seleção; 404 e interrupção local não são anunciados como exclusão.
- **190/190 testes web passaram**, incluindo 21 testes novos de pipeline, BFF, serviços e coordenação. Typecheck web, `verify:clinical` e build de produção passaram. O build usou `APP_ORIGIN=https://localhost:3000` somente no processo de verificação, sem alterar `.env` ou configuração do Next.
- Jornada real/visual, limpeza física do storage e cota permanecem para o teste final combinado. A limitação de cobertura do lint da tarefa 11 permanece. Nenhuma operação clínica foi executada no ambiente remoto.

## Registro da oitava entrega

- Exclusão persistida integrada ao BFF, serviço do navegador, quadro e arquivos confirmados, com modal de confirmação e mensagens pt-BR/en.
- Posse do caso validada antes da mutação. 204/ausência confirmada limpa lista, seleção, prévia, consultas e referências da imagem; 409 mantém o conteúdo. Falhas ambíguas passam por verificação, sem segundo DELETE automático.
- **202/202 testes web passaram**, incluindo 12 novos cenários de exclusão e fila. Verificados vínculos, HTTP bodyless, segurança das mensagens, cliques concorrentes, 404/409, resposta perdida, preservação de outras imagens e interrupção de prévia antiga. Typecheck web, `verify:clinical` e build de produção passaram.
- O build usou `APP_ORIGIN=https://localhost:3000` somente no processo de verificação. Avisos de cache do webpack não impediram a conclusão. A limitação de cobertura do lint da tarefa 11 permanece.
- Nova origem oficial conferida por consulta pública do OpenAPI: payloads iguais à base 0.9.0, com Bearer/JWT acrescentado nas operações clínicas. Snapshot novo e comparação preservados; exemplo/README/plano atualizados. Ambiente local ativo e proveniência do contrato canônico foram mantidos até a integração da identidade clínica.
- Testes reais/visuais, persistência após refresh no servidor e limpeza física permanecem para a rodada final. Nenhuma criação/exclusão clínica ou transferência ao storage foi executada no ambiente remoto.

## Registro da nona entrega

- Conferidos os schemas de peso no contrato canônico e no export do novo API Gateway: entrada number/string/null e resposta string/null permanecem iguais. Preservados os formatos decimais da documentação recebida; não foi inventado suporte a representações adicionais pela ausência de regex.
- Regras compartilhadas no formulário/BFF/leitura. Corrigidos pesos zero/acima do limite na resposta e retirada a alteração silenciosa de valores digitados/colados. Peso vazio continua nulo; vírgula/ponto, frações sem zero inicial e casas decimais válidas continuam suportados.
- **209/209 testes web passaram**, incluindo sete cenários novos com criação/reabertura através dos serviços, BFF e cliente HTTP simulado, limites, dados inválidos, preservação decimal, erro de domínio e idempotência. Typecheck web, `verify:clinical` e build de produção passaram.
- O build usou `APP_ORIGIN=https://localhost:3000` somente no processo de verificação. Avisos de cache do webpack não impediram a conclusão; a limitação de cobertura do lint da tarefa 11 permanece.
- Serialização real no servidor, comportamento de digitação/colagem e apresentação visual continuam pendentes da jornada final autenticada. Nenhum caso foi criado/alterado no ambiente remoto. O roteiro da tarefa 9 registra explicitamente essa diferença entre fixture simulada e resposta real.

## Registro parcial da décima entrega

- Health checks públicos da clínica, banco e autenticação passaram. Novo export de autenticação preservado; operações e schemas permanecem iguais ao canônico e ainda não incluem a troca por organização.
- Diagnóstico repetível adicionado e executado contra a origem oficial. Identifica a lacuna do contrato sem afirmar autenticação clínica/storage funcionais. Exemplo de ambiente atualizado; configuração local ativa preservada.
- **213/213 testes web passaram**, incluindo quatro novos cenários de diagnóstico, respostas inválidas/redirecionamento, indisponibilidade e sanitização do relatório. A parte autenticada e storage não foram exercitados.
- Nenhum token de usuário foi usado ou exposto. Além de leituras públicas, houve apenas uma sonda sem credenciais à operação informada, com UUID sintético; retornou 404. Nenhum caso, arquivo, organização ou sessão foi criado.

## Retomada da décima entrega após resposta do backend

- Contrato da troca confirmado e preservado em documento/tipos suplementares. Snapshot público e tipos gerados não foram adulterados.
- BFF e todas as rotas clínicas passaram a usar acesso emitido para a organização. Contexto POST/PUT, escolha entre várias, cache cifrado por usuário/organização/papel/sessão, verificação de associação atual e nova troca na expiração implementados.
- Logout limpa o contexto clínico. 401/403 não repetem mutações; header de expectativa impede divergência entre abas. QueryClient separado por organização evita restauração de dados do contexto anterior.
- Origem oficial e modo JWT configurados em `.env`/exemplo; restantes valores e segredos preservados. É necessário reiniciar o frontend. Alternativa local permanece restrita a development/test.
- **235/235 testes web passaram**, incluindo 18 novos cenários de identidade, cookies, transporte e rotas Next. Typecheck web/api-client, `verify:clinical` e build de produção passaram. Build com `APP_ORIGIN=https://localhost:3000` apenas no processo; avisos de cache do webpack não impediram a conclusão. A pendência de lint TS/TSX da tarefa 11 permanece.
- Health checks repetidos em `2026-10-21T21:49:30.110Z`: todos em 200. Diagnóstico ainda aponta `ORGANIZATION_TOKEN_UNDOCUMENTED` por ausência no OpenAPI; isso não invalida o suplemento recebido.
- Não houve login real, emissão de token real, leitura/escrita clínica ou transporte de arquivo nesta retomada. Aceite autenticado, visual, storage/CORS/worker e isolamento real ficam para a jornada final.

**Próxima etapa:** tarefa 11, mediante aprovação, para a jornada real e regressão. Tarefas 10/13 mantêm seus aceites operacionais explicitamente pendentes.
