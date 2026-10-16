# PRD - Orthovet

> **Status:** rascunho para alinhamento de produto, clínico e técnico<br>
> **Versão:** 0.1<br>
> **Atualizado em:** 21 de setembro de 2026<br>
> **Fonte primária:** apresentação "Orthovet - Digital Orthopedic Planning" (11 páginas).<br>
> **Nota de interpretação:** este documento transforma a apresentação em requisitos de produto. Afirmações de benefício clínico ou comercial da apresentação são hipóteses a validar, e não evidência clínica já demonstrada.

## 1. Resumo executivo

A **Orthovet** é uma plataforma SaaS de planejamento ortopédico veterinário. Ela centraliza a importação de radiografias, a calibração de escala, medições anatômicas, a simulação virtual de implantes e a geração de relatórios para apoiar o planejamento pré-operatório.

O produto busca substituir fluxos analógicos baseados em acetatos, réguas, transferidores e catálogos impressos por um fluxo digital rastreável, visual e acessível em telas 2D/3D. O sistema deve **apoiar** o julgamento do médico-veterinário; não diagnostica, não prescreve e não substitui a responsabilidade clínica, a avaliação do paciente ou a decisão intraoperatória.

## 2. Problema e oportunidade

O planejamento ortopédico veterinário tradicional depende de ferramentas físicas e dados dispersos. Esse processo dificulta repetir medições, comparar opções de implantes, documentar o racional cirúrgico e comunicar o plano ao tutor. As principais dores identificadas na apresentação são:

- medições manuais e sobreposição de acetatos sujeitas a erro, desgaste e baixa reprodutibilidade;
- catálogos de implantes impressos que podem estar desatualizados;
- planejamento de correções angulares e de redução de fraturas feito sem uma simulação centralizada;
- incerteza sobre o tamanho e a disponibilidade do implante antes da cirurgia;
- dificuldade de explicar visualmente o procedimento, o plano e o orçamento ao tutor.

**Oportunidade:** entregar um ambiente digital que reduza o esforço de planejamento e melhore sua consistência documental, sem exigir hardware especializado ou realidade aumentada.

## 3. Visão, proposta de valor e princípios

**Visão:** tornar o planejamento ortopédico digital uma etapa confiável, cotidiana e acessível da prática veterinária.

**Proposta de valor:** a partir de uma imagem radiográfica calibrada, o cirurgião cria um plano mensurável, simula implantes e comunica o resultado esperado com clareza antes da primeira incisão.

**Princípios de produto**

1. **Precisão com rastreabilidade:** toda medida, calibração, implante e alteração de plano deve registrar origem, autor, unidade e data.
2. **Apoio, não automação clínica:** cálculos e sugestões precisam ser verificáveis, editáveis e claramente distintos de decisão clínica.
3. **Fluxo rápido e pragmático:** a experiência deve funcionar em navegador, com ferramentas 2D como base e sem dependência de AR, óculos ou equipamento caro.
4. **Biblioteca confiável:** itens de implantes devem ser versionados, ter fabricante/origem e não podem ser apresentados como disponíveis em estoque sem integração ou confirmação explícita.
5. **Comunicação respeitosa:** relatórios para tutores devem ser compreensíveis, revisáveis pelo veterinário e evitar garantias de resultado.

## 4. Objetivos e não objetivos

### Objetivos

- Digitalizar a preparação de cirurgias ortopédicas veterinárias a partir de radiografias.
- Permitir calibração reproduzível e medições 2D de distância, ângulos e eixos.
- Tornar a seleção e a simulação de implantes mais rápidas e documentadas.
- Gerar um relatório clínico visual que facilite a revisão do plano e a comunicação com o tutor.
- Oferecer um modelo SaaS escalável para profissionais autônomos, clínicas e redes hospitalares.

### Não objetivos do MVP

- Diagnóstico automatizado por IA, recomendação terapêutica autônoma ou garantia de resultado cirúrgico.
- Navegação cirúrgica em tempo real, robótica, realidade aumentada ou impressão 3D.
- Substituir PACS, prontuário, ERP ou sistema de estoque da clínica.
- Confirmar compatibilidade, esterilidade, preço ou disponibilidade de implantes sem uma fonte integrada e validada.
- Cobrir todas as espécies, técnicas e fabricantes antes da validação das jornadas prioritárias.

## 5. Usuários e papéis

| Perfil | Necessidade central | Principais ações |
| --- | --- | --- |
| Cirurgião ortopedista veterinário | Planejar com precisão e revisar o caso rapidamente | Importar imagem, calibrar, medir, simular, salvar e aprovar relatório |
| Veterinário generalista | Acessar planejamento essencial de fraturas e encaminhar casos | Criar caso, carregar imagens, realizar medições básicas e compartilhar com especialista |
| Técnico/radiologista da clínica | Preparar imagens corretas para análise | Enviar DICOM/imagens, conferir identificação e marcador de calibração |
| Gestor de clínica/hospital | Padronizar operação, licenças e custos | Administrar organização, usuários, catálogo habilitado e relatórios |
| Tutor do animal | Entender, em linguagem adequada, o plano proposto | Receber relatório autorizado e tirar dúvidas com a equipe clínica |
| Operação Orthovet | Manter serviço e qualidade da biblioteca | Administrar catálogo, versões, suporte e auditoria operacional |

## 6. Escopo e planos comerciais

O produto será entregue como SaaS com isolamento de dados por organização. A segmentação abaixo reflete a apresentação e deverá ser validada com clientes-piloto.

| Plano | Público | Capacidades previstas |
| --- | --- | --- |
| Básico | Veterinários autônomos | Planejamento essencial de fraturas, importação/calibração DICOM e JPG, ferramentas de medição 2D |
| Premium | Cirurgiões ortopedistas e clínicas especializadas | Biblioteca nacional/internacional de implantes, módulos de cirurgias angulares, simulação virtual completa |
| Corporativo | Redes e hospitais | Múltiplas licenças, relatórios white-label, integrações por API e suporte prioritário |

Preços, limites de armazenamento, quantidade de usuários e política de suporte são decisões comerciais pendentes.

## 7. Escopo do MVP

### Incluído

1. **Organização, acesso e casos**
   - Autenticação, organização, usuários e papéis mínimos (administrador e profissional clínico).
   - Cadastro de paciente e caso, com identificação, espécie, raça, peso opcional, membro/região, diagnóstico informado pelo profissional e status do planejamento.
   - Isolamento de dados entre organizações e trilha de auditoria de ações clínicas relevantes.

2. **Importação e visualização de imagem**
   - Importação de DICOM, JPG e PNG de fonte local ou PACS, quando a integração estiver configurada.
   - Visualizador 2D com zoom, pan, rotação, brilho/contraste quando tecnicamente aplicável e indicação clara de imagem ativa.
   - Validação de arquivo, armazenamento seguro, associação ao caso e preservação do original.

3. **Calibração e medições**
   - Calibração manual assistida por marcador de referência radiográfica conhecido (por exemplo, esfera calibrada).
   - Exibição de unidade, fator de escala, método e estado da calibração.
   - Medidas de distância, ângulo e eixos; anotações e possibilidade de corrigir/remover marcações.
   - Bloqueio de exportação de medidas em milímetros quando não houver calibração válida.

4. **Planejamento e simulação**
   - Biblioteca inicial e versionada de implantes autorizados.
   - Busca e filtro por fabricante, família, tipo, dimensões e técnica suportada.
   - Sobreposição, escala, rotação e posicionamento por drag and drop de placas, parafusos e itens suportados sobre a radiografia.
   - Salvamento de versões do plano e comparação visual entre imagem original e planejada.

5. **Relatórios e compartilhamento**
   - Geração de relatório revisável pelo profissional, com imagens pré e pós-planejamento, medidas, implantes planejados, observações e identificação do responsável.
   - Exportação em PDF e compartilhamento somente por usuário autorizado ou link protegido com expiração configurável.
   - Versão simplificada para tutor, emitida apenas após aprovação do profissional.

### Adiado para após o MVP

- Reconhecimento automático de marcadores, segmentação anatômica e sugestões baseadas em IA.
- Visualização 3D clínica completa, tomografia e reconstrução 3D.
- Módulos completos para todas as técnicas angulares; iniciar pelos procedimentos priorizados (TPLO, CCWO e CBLO) após validação clínica.
- Integração bidirecional com PACS, estoque, compras, prontuário, cobrança e APIs de parceiros.
- White-label, múltiplas unidades avançadas, SSO e controles corporativos avançados.
- Gestão de disponibilidade de implantes em tempo real.

## 8. Jornadas essenciais

### 8.1 Planejar um caso

1. O profissional cria ou abre um caso e confirma os dados do paciente e da região anatômica.
2. Importa a radiografia; o sistema preserva o arquivo original e registra a origem.
3. O profissional calibra a imagem usando referência conhecida e confere a escala.
4. Realiza medições, traça eixos e registra anotações.
5. Pesquisa implantes, simula posições e ajusta o plano.
6. Salva uma versão, revisa o resultado e marca o plano como aprovado quando aplicável.
7. Gera um relatório clínico e, se desejar, uma versão aprovada para comunicação com o tutor.

### 8.2 Revisar e ajustar antes da cirurgia

1. O cirurgião abre a última versão aprovada, visualiza imagem, calibração, medidas e implantes.
2. Caso ajuste o plano, cria nova versão; o histórico anterior permanece acessível.
3. O sistema registra quem alterou, quando e quais elementos do plano foram modificados.

## 9. Requisitos funcionais

| ID | Requisito | Prioridade |
| --- | --- | --- |
| RF-01 | Permitir autenticação e acesso apenas aos dados da própria organização. | Must |
| RF-02 | Permitir criar, editar, arquivar e consultar casos clínicos. | Must |
| RF-03 | Importar DICOM, JPG e PNG, validar o arquivo e preservar o original. | Must |
| RF-04 | Exibir radiografia em visualizador 2D com zoom, pan e rotação. | Must |
| RF-05 | Calibrar imagem com referência conhecida e mostrar unidade, fator e status da calibração. | Must |
| RF-06 | Criar, editar e excluir medidas lineares, angulares e de eixos. | Must |
| RF-07 | Impedir apresentação de distância física como valor confiável sem calibração válida. | Must |
| RF-08 | Pesquisar e visualizar biblioteca de implantes versionada. | Must |
| RF-09 | Posicionar, escalar e rotacionar implantes virtuais sobre uma radiografia e salvar o resultado. | Must |
| RF-10 | Salvar versões do planejamento, com autor, data e histórico de alterações. | Must |
| RF-11 | Gerar relatório clínico com dados do caso, imagens, medidas, implantes e observações. | Must |
| RF-12 | Exigir revisão/autor do profissional antes de compartilhar relatório destinado ao tutor. | Must |
| RF-13 | Permitir filtros por técnica, fabricante e dimensões na biblioteca. | Should |
| RF-14 | Integrar importação a PACS quando a clínica possuir configuração compatível. | Should |
| RF-15 | Disponibilizar módulos específicos de planejamento angular (TPLO, CCWO, CBLO). | Should |
| RF-16 | Permitir múltiplos usuários, licenças e relatórios white-label por organização. | Could - corporativo |
| RF-17 | Integrar catálogo/estoque por APIs com indicação de data e origem da disponibilidade. | Could - pós-MVP |

## 10. Critérios de aceitação do fluxo crítico

Um planejamento é considerado concluído no MVP quando:

1. existe caso associado a uma organização e imagem original preservada;
2. a imagem possui status de calibração explícito; quando calibrada, o relatório informa a referência, unidade e fator utilizados;
3. todas as marcações usadas no plano são visíveis, editáveis e vinculadas à versão do planejamento;
4. cada implante planejado informa identificação da biblioteca e respectiva versão;
5. o relatório reproduz as informações da versão selecionada e identifica o profissional responsável;
6. qualquer alteração posterior cria uma nova versão e mantém as anteriores consultáveis;
7. não há mensagem que apresente o plano como diagnóstico, garantia de desfecho ou substituto da avaliação clínica.

## 11. Requisitos não funcionais, segurança e segurança clínica

### Qualidade e usabilidade

- Interface responsiva para desktop e tablet; o fluxo de precisão deve priorizar mouse/teclado e tela ampla.
- Medidas, escalas e rotações devem ser reproduzíveis ao reabrir a mesma versão.
- Operações destrutivas (remover marcação, imagem ou plano) devem pedir confirmação e preservar histórico quando aplicável.
- Interface acessível: navegação por teclado, contraste adequado, rótulos explícitos e feedback de erro compreensível.

### Privacidade, segurança e auditoria

- Aplicar princípios de LGPD: finalidade, minimização, controle de acesso, retenção definida e registro de consentimento/base legal conforme operação.
- Proteger dados de pacientes, tutores e profissionais em trânsito e em repouso; credenciais e links de compartilhamento não podem ser expostos no cliente.
- Registrar importação, calibração, alteração de medidas, aprovação, exportação e compartilhamento com usuário e data.
- Permitir revogar links compartilhados e encerrar acessos de usuários desligados da organização.

### Segurança clínica

- Exibir aviso de uso: planejamento é ferramenta de apoio e exige validação pelo médico-veterinário responsável.
- Não inferir medida real sem referência de calibração válida; sinalizar imagem sem referência ou com calibração alterada.
- Versionar biblioteca de implantes e nunca substituir silenciosamente os dados usados em um plano histórico.
- Separar claramente dados do catálogo de uma confirmação de estoque/preço; esta última exige integração identificada e atualizada.
- Validar cálculos e ferramentas de medição com casos de referência definidos e revisão de especialistas antes de uso clínico piloto.

## 12. Dados e entidades principais

| Entidade | Dados essenciais |
| --- | --- |
| Organização | nome, plano, configurações, unidades, status |
| Usuário | papel, organização, credenciais, auditoria de acesso |
| Paciente | identificação, espécie, raça, sexo, peso opcional, dados do tutor mínimos necessários |
| Caso | paciente, região, diagnóstico informado, responsável, status, imagens e planos |
| Imagem | arquivo original, formato, origem, metadados permitidos, checksum, data de importação |
| Calibração | método, referência, valor conhecido, unidade, fator, autor, data e status |
| Medição/anotação | tipo, pontos/traçado, valor calculado, unidade, autor e versão do plano |
| Implante de catálogo | fabricante, família, dimensões, representação visual, versão e status |
| Item planejado | implante de catálogo/versionamento, posição, escala, rotação, observações |
| Versão do plano | imagem base, calibração, medidas, implantes, autor, data, aprovação e motivo de alteração |
| Relatório | versão do plano, audiência (clínica/tutor), responsável, data e estado de compartilhamento |

## 13. Métricas e hipóteses de sucesso

As metas numéricas devem ser definidas após medir uma linha de base com clínicas-piloto. Serão acompanhados:

| Dimensão | Métrica |
| --- | --- |
| Adoção | organizações ativas, profissionais ativos e casos planejados por organização |
| Ativação | percentual de novos usuários que importam, calibram e salvam o primeiro plano |
| Eficiência | tempo entre importação e primeira versão salva; tempo de preparação relatado pelo piloto |
| Qualidade de fluxo | percentual de planos com calibração válida, versão aprovada e relatório gerado |
| Biblioteca | frequência de uso por item, buscas sem resultado e implantes planejados por caso |
| Comunicação | relatórios compartilhados/aprovados e feedback de compreensão do tutor, quando coletado com consentimento |
| Confiabilidade | falhas de importação, erros de renderização, divergências de medição em casos de referência e incidentes de acesso |

**Hipóteses a validar:** o planejamento digital reduz retrabalho e tempo intraoperatório percebido, melhora a previsibilidade da escolha de implante e facilita a aprovação do orçamento. Nenhuma dessas hipóteses deve ser divulgada como resultado clínico comprovado antes de evidência adequada.

## 14. Roadmap de validação sugerido

| Fase | Entrega | Evidência para avançar |
| --- | --- | --- |
| 0. Descoberta clínica | Entrevistas, casos de referência e definição de técnicas iniciais | Fluxo e terminologia validados por cirurgiões parceiros |
| 1. Fundação | Organização, casos, importação e visualizador 2D | Arquivos reais importados com segurança e visualização correta |
| 2. Precisão | Calibração, medições e histórico de plano | Medições reproduzíveis nos casos de referência e revisão clínica aprovada |
| 3. Planejamento | Biblioteca inicial, simulação e relatório clínico | Profissionais-piloto concluem o fluxo de ponta a ponta |
| 4. Especialização | Módulos TPLO/CCWO/CBLO e integração PACS inicial | Uso recorrente e satisfação dos pilotos por técnica |
| 5. Escala | Recursos corporativos, APIs, white-label e integrações de estoque | Segurança, operação e modelo comercial validados |

## 15. Riscos, dependências e decisões em aberto

| Tema | Risco/dependência | Decisão necessária |
| --- | --- | --- |
| Validação clínica | Medidas ou cálculos imprecisos podem induzir erro de planejamento | Definir responsável clínico, protocolo de validação e casos de referência |
| Imagens | DICOM e JPEG podem ter metadados, qualidade e escalas heterogêneos | Especificar formatos, limites, metadados preservados e regra de calibração |
| Biblioteca | Catálogo incompleto ou desatualizado reduz confiança | Definir fabricantes iniciais, fonte, licença de uso e processo de versionamento |
| Estoque | Simulação pode ser confundida com disponibilidade real | Decidir se haverá integração e como informar atualização/origem do dado |
| Privacidade | Casos podem conter dados pessoais e clínicos sensíveis | Definir DPO/responsável, retenção, consentimento, regiões de hospedagem e resposta a incidentes |
| Relatórios | Comunicação ao tutor pode sugerir certeza indevida | Aprovar modelos de linguagem, disclaimer e fluxo obrigatório de revisão |
| Comercial | Escopo dos planos ainda é conceitual | Validar ICP, precificação, limites e canais de venda com pilotos |

## 16. Próximo corte de produto recomendado

Validar primeiro o fluxo vertical **"radiografia calibrada para relatório clínico"**:

1. criar caso e importar DICOM/JPG/PNG;
2. visualizar e calibrar manualmente por referência conhecida;
3. medir distância, ângulo e eixo com histórico;
4. inserir uma biblioteca pequena, curada e versionada de implantes;
5. posicionar um implante e salvar uma versão do plano;
6. gerar relatório clínico revisável e auditável;
7. testar com um grupo pequeno de cirurgiões veterinários e comparar com o fluxo analógico atual.

Esse corte prova a utilidade central e a segurança do fluxo antes de investir em IA, 3D, automações de estoque, grande cobertura de fabricantes ou recursos corporativos.
