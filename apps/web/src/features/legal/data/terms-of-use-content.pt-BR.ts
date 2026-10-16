import type { LegalDocumentContent } from "./legal-document-content"

// Updated Portuguese draft supplied in September 2026.
const termsOfUseContentPtBR = {
  "language": "pt-BR",
  "title": "TERMOS DE USO DA PLATAFORMA CAPTA",
  "lastUpdated": "Última atualização: setembro de 2026",
  "blocks": [
    {
      "type": "paragraph",
      "text": "Estes Termos de Uso (“Termos”) regulam o acesso e a utilização da plataforma Capta (“Capta”, “Plataforma”), disponibilizada por [RAZÃO SOCIAL DA EMPRESA], sociedade empresária inscrita no CNPJ sob o nº [CNPJ], com sede em [ENDEREÇO COMPLETO] (“Capta”, “nós”)."
    },
    {
      "type": "paragraph",
      "text": "O tratamento de dados pessoais realizado no âmbito da Plataforma é descrito na Política de Privacidade da Capta, documento autônomo disponível no site e nos aplicativos da Capta e incorporado a estes Termos por referência, e nas Condições de Tratamento de Dados Pessoais constantes do Anexo I, que regem a relação entre o Usuário (controlador) e a Capta (operadora)."
    },
    {
      "type": "callout",
      "text": "LEIA COM ATENÇÃO. Ao criar uma conta, clicar em “aceito”, assinar contrato, termo de adesão ou proposta comercial, ou acessar e utilizar a Plataforma, o Usuário declara ter lido, compreendido e aceitado integralmente estes Termos, a Política de Privacidade e o Anexo I. A pessoa física que realiza o aceite em nome de um órgão, entidade ou pessoa jurídica declara possuir poderes e/ou autorização para tanto. Caso não concorde com qualquer disposição, o Usuário não deverá utilizar a Plataforma."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "1. Definições"
    },
    {
      "type": "paragraph",
      "text": "Para os fins destes Termos, os termos abaixo, no singular ou no plural, têm os seguintes significados:"
    },
    {
      "type": "definitions",
      "items": [
        {
          "term": "Plataforma:",
          "description": "o sistema Capta, disponibilizado no modelo de software como serviço (SaaS), incluindo todos os módulos, funcionalidades, interfaces, painéis, integrações, documentação e recursos de inteligência artificial, entre eles a assistente Troni."
        },
        {
          "term": "Usuário ou Contratante:",
          "description": "o órgão ou entidade da Administração Pública (municipal, estadual ou federal), ou pessoa jurídica de direito privado autorizada, que contrata e utiliza a Plataforma."
        },
        {
          "term": "Usuários Autorizados:",
          "description": "pessoas físicas vinculadas ao Contratante (servidores, agentes públicos, colaboradores ou prestadores) por ele autorizadas a acessar a Plataforma em seu nome e sob sua responsabilidade."
        },
        {
          "term": "Administrador da Conta:",
          "description": "Usuário Autorizado designado pelo Contratante com poderes para gerir permissões, módulos, configurações e dados da conta."
        },
        {
          "term": "Dados do Cliente:",
          "description": "todos os dados, informações, documentos, projetos, cadastros, arquivos e conteúdos inseridos, gerados ou processados na Plataforma por conta do Contratante, incluindo eventuais dados pessoais de servidores, beneficiários de programas e demais titulares."
        },
        {
          "term": "Editais e Convênios:",
          "description": "oportunidades de captação de recursos públicos — editais, chamamentos, convênios, contratos de repasse, emendas parlamentares e demais instrumentos de transferência de recursos — publicados por entes e órgãos concedentes."
        },
        {
          "term": "Fontes Oficiais:",
          "description": "os portais, diários oficiais, sistemas e plataformas mantidos por órgãos públicos concedentes (municipais, estaduais, federais) a partir dos quais a Capta coleta, consolida e organiza informações sobre Editais e Convênios."
        },
        {
          "term": "Funcionalidades de IA / Troni:",
          "description": "os recursos da Plataforma que empregam inteligência artificial — entre eles a assistente Troni — para apoiar a identificação, triagem, análise e organização de Editais e Convênios, e a produção de resumos, alertas e sugestões relacionados."
        },
        {
          "term": "Conteúdo Gerado:",
          "description": "qualquer texto, resumo, classificação, sugestão ou resposta produzido pelas Funcionalidades de IA a partir de dados, comandos ou instruções do Usuário e de informações extraídas de Fontes Oficiais."
        },
        {
          "term": "Plano:",
          "description": "a modalidade comercial contratada pelo Usuário, com os módulos, limites, prazo e valores descritos na proposta comercial, no contrato administrativo, no termo de adesão ou instrumento equivalente."
        },
        {
          "term": "Documentação:",
          "description": "manuais, guias, central de ajuda e demais materiais de orientação disponibilizados pela Capta."
        },
        {
          "term": "Política de Privacidade:",
          "description": "o documento que descreve como a Capta trata dados pessoais, em sua versão vigente."
        }
      ]
    },
    {
      "type": "heading",
      "level": 2,
      "text": "2. Aceitação, Vinculação e Ordem de Prevalência"
    },
    {
      "type": "heading",
      "level": 3,
      "text": "2.1 Aceite eletrônico"
    },
    {
      "type": "paragraph",
      "text": "O aceite destes Termos poderá ser realizado por meio eletrônico e possui plena validade jurídica, nos termos da legislação brasileira. A Capta registrará data, hora, versão aceita e identificação do aceitante como evidência da contratação, sem prejuízo da formalização exigida pela legislação de licitações e contratos administrativos, quando aplicável."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "2.2 Documentos que compõem a contratação e ordem de prevalência"
    },
    {
      "type": "paragraph",
      "text": "A relação entre as Partes é regida, em conjunto, pelos seguintes documentos, que em caso de conflito prevalecem nesta ordem:"
    },
    {
      "type": "list",
      "items": [
        "o edital de licitação, dispensa ou inexigibilidade e o contrato administrativo, termo de adesão ou instrumento equivalente firmado entre as Partes, quando houver;",
        "o Anexo I — Condições de Tratamento de Dados Pessoais, exclusivamente quanto à matéria de proteção de dados;",
        "estes Termos de Uso;",
        "a proposta comercial;",
        "a Política de Privacidade; e",
        "a Documentação."
      ]
    },
    {
      "type": "heading",
      "level": 3,
      "text": "2.3 Termos adicionais"
    },
    {
      "type": "paragraph",
      "text": "Determinados módulos ou integrações poderão estar sujeitos a termos ou políticas adicionais de fontes ou serviços de terceiros, que o Usuário deverá observar. Tais termos prevalecem sobre estes exclusivamente quanto aos serviços por eles regulados."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "3. Descrição da Plataforma"
    },
    {
      "type": "paragraph",
      "text": "A Capta é uma plataforma de tecnologia voltada à identificação e à gestão da captação de recursos públicos por municípios e demais entes, que reúne, conforme o Plano contratado, os seguintes módulos:"
    },
    {
      "type": "list",
      "items": [
        "Radar de Oportunidades: busca, triagem e recomendação de Editais e Convênios a partir de Fontes Oficiais, conforme o perfil e os critérios configurados pelo Usuário.",
        "Gestão de Captação (Kanban): organização do fluxo de trabalho de cada oportunidade em etapas (por exemplo: recomendado, em preparação, selecionado para submissão, submetido), com controle de prazos, documentos e responsáveis.",
        "Troni: assistente de inteligência artificial que apoia a análise de editais, o esclarecimento de dúvidas sobre requisitos e a organização de informações, nos termos da Seção 6.",
        "Painéis e Relatórios: indicadores e acompanhamento da captação de recursos do Contratante."
      ]
    },
    {
      "type": "heading",
      "level": 3,
      "text": "3.1 Evolução da Plataforma"
    },
    {
      "type": "paragraph",
      "text": "As funcionalidades efetivamente disponíveis dependem do Plano contratado e podem ser aprimoradas, atualizadas, substituídas ou complementadas pela Capta ao longo do tempo, preservadas as funcionalidades essenciais contratadas. A descontinuação de funcionalidade essencial será comunicada com antecedência mínima de 30 (trinta) dias."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "3.2 Funcionalidades em teste (beta)"
    },
    {
      "type": "paragraph",
      "text": "A Capta poderá disponibilizar funcionalidades identificadas como beta, prévia, experimental ou equivalente, oferecidas para avaliação, sem garantia de continuidade, desempenho ou disponibilidade, podendo ser alteradas ou retiradas a qualquer tempo, sem que isso caracterize inadimplemento."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "3.3 Fontes Oficiais e serviços de terceiros"
    },
    {
      "type": "paragraph",
      "text": "A Plataforma consolida informações públicas obtidas de Fontes Oficiais e pode integrar-se a serviços de terceiros. A Capta não controla, não edita o conteúdo original e não garante a disponibilidade, a exatidão ou a atualização em tempo real dessas fontes, aplicando-se ainda o disposto na Seção 7."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "4. Natureza da Relação e Elegibilidade"
    },
    {
      "type": "heading",
      "level": 3,
      "text": "4.1 Contratação pela Administração Pública"
    },
    {
      "type": "paragraph",
      "text": "Quando o Usuário for órgão ou entidade da Administração Pública, a contratação da Plataforma é acessória e complementar ao contrato administrativo, termo de adesão, ata de registro de preços ou instrumento equivalente celebrado entre as Partes, regendo-se pela Lei nº 14.133/2021 e demais normas aplicáveis à contratação pública, sem prejuízo da aplicação subsidiária destes Termos naquilo que não conflitar com o instrumento contratual. Não se aplica a esta relação o Código de Defesa do Consumidor."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "4.2 Elegibilidade e representação"
    },
    {
      "type": "paragraph",
      "text": "Ao contratar, o Usuário declara e garante que: (i) o signatário possui poderes, mandato ou autorização para vincular o órgão, entidade ou pessoa jurídica contratante; (ii) as informações fornecidas no cadastro são verdadeiras, completas e atualizadas; e (iii) não há impedimento legal, judicial ou administrativo à contratação."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "4.3 Conta, Administrador e Usuários Autorizados"
    },
    {
      "type": "paragraph",
      "text": "Cada Contratante possui uma única conta na Plataforma. Cabe ao Administrador da Conta indicar os Usuários Autorizados e definir o que cada um pode acessar ou modificar. O Contratante responde por tudo o que for feito na Plataforma em nome desses usuários — mesmo depois que algum deles deixar de estar vinculado ao órgão, enquanto o respectivo acesso não for formalmente revogado. Credenciais são pessoais e não podem ser compartilhadas entre diferentes pessoas."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "4.4 Credenciais de acesso"
    },
    {
      "type": "paragraph",
      "text": "Cabe ao Contratante zelar pela guarda e pelo sigilo das credenciais atribuídas aos seus Usuários Autorizados, assumindo as consequências de qualquer atividade realizada por meio delas. Caso identifique ou suspeite de acesso não autorizado, perda ou vazamento de credenciais, o Contratante deve avisar a Capta sem demora, pelos canais oficiais de suporte."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "4.5 Requisitos técnicos"
    },
    {
      "type": "paragraph",
      "text": "Cabe ao Contratante providenciar e manter, por sua conta, os equipamentos, navegadores atualizados e a conexão de internet necessários ao uso da Plataforma. Problemas de acesso originados nessa infraestrutura — e não na Plataforma em si — não são de responsabilidade da Capta."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "5. Planos, Contratação e Cobrança"
    },
    {
      "type": "paragraph",
      "text": "Os módulos, limites, prazo de vigência e valores aplicáveis constam do contrato administrativo, termo de adesão, proposta comercial ou instrumento equivalente firmado entre as Partes, prevalecendo tais condições sobre qualquer página comercial ou tabela de preços de caráter genérico."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "5.1 Reajuste"
    },
    {
      "type": "paragraph",
      "text": "Os valores poderão ser reajustados na periodicidade, pelo índice e na forma previstos no instrumento contratual, observada a legislação aplicável aos contratos com a Administração Pública."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "5.2 Pagamento e atraso"
    },
    {
      "type": "paragraph",
      "text": "O pagamento observará a forma, o vencimento e os eventuais encargos moratórios previstos no instrumento contratual e na legislação aplicável. A suspensão do acesso por inadimplemento, quando cabível, observará os prazos e o procedimento formal de comunicação previstos no contrato administrativo e na legislação de regência."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "5.3 Contestação de fatura"
    },
    {
      "type": "paragraph",
      "text": "Eventual divergência em fatura ou documento de cobrança deverá ser comunicada à Capta no prazo previsto no instrumento contratual ou, na ausência de previsão, em até 10 (dez) dias contados de sua disponibilização, com a indicação dos valores questionados."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "6. Funcionalidades de Inteligência Artificial (Troni)"
    },
    {
      "type": "callout",
      "text": "AVISO IMPORTANTE — NATUREZA DE APOIO. A Troni e as demais funcionalidades de inteligência artificial da Capta existem para ajudar a encontrar, organizar e entender Editais e Convênios — nada além disso. Elas não emitem parecer jurídico, técnico ou contábil, não garantem que o Contratante será elegível, será habilitado ou terá sua proposta aprovada, e em nenhuma hipótese dispensam a leitura do edital oficial ou a análise da equipe responsável pelo órgão."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "6.1 Natureza probabilística"
    },
    {
      "type": "paragraph",
      "text": "Ferramentas de inteligência artificial funcionam por estimativa, não por certeza — o que significa que podem errar, omitir informação ou até produzir conteúdo incorreto. O Contratante está ciente dessa limitação e assume o compromisso de revisar, com atenção humana, qualquer Conteúdo Gerado antes de basear nele uma decisão, uma submissão ou qualquer manifestação oficial."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "6.2 Prevalência da fonte oficial"
    },
    {
      "type": "paragraph",
      "text": "Se houver qualquer diferença entre o que a Plataforma exibe (incluindo Conteúdo Gerado pela Troni) e o texto publicado pela Fonte Oficial correspondente, o que vale é sempre o texto oficial. Antes de tomar qualquer decisão sobre prazo, requisito ou condição de um Edital ou Convênio, o Contratante deve confirmá-los diretamente junto ao órgão concedente."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "6.3 Titularidade e uso do Conteúdo Gerado"
    },
    {
      "type": "paragraph",
      "text": "O que a Troni produz a partir dos Dados do Cliente pertence ao Contratante, a quem cabe conferir sua exatidão antes de usá-lo fora da Plataforma."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "6.4 Fornecedores de IA"
    },
    {
      "type": "paragraph",
      "text": "Parte do processamento de IA pode envolver fornecedores especializados, contratados pela Capta como suboperadores. Esses fornecedores estão sujeitos a obrigações de confidencialidade e de proteção de dados, e não podem usar os Dados do Cliente para treinar modelos de uso geral — nos termos da Política de Privacidade e do Anexo I."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "7. Origem e Confiabilidade dos Dados de Editais e Convênios"
    },
    {
      "type": "paragraph",
      "text": "Os dados sobre Editais e Convênios exibidos na Plataforma são coletados e consolidados a partir de Fontes Oficiais de terceiros, por meios automatizados ou manuais. A Capta emprega esforços razoáveis para manter tais informações atualizadas e organizadas, mas não garante:"
    },
    {
      "type": "list",
      "items": [
        "a completude de todas as oportunidades existentes em determinado período;",
        "a atualização em tempo real de prazos, valores, requisitos ou status de cada Edital ou Convênio;",
        "a disponibilidade contínua das Fontes Oficiais consultadas; ou",
        "a ausência de erros de transcrição, classificação ou categorização."
      ]
    },
    {
      "type": "paragraph",
      "text": "Recomenda-se ao Usuário verificar diretamente na Fonte Oficial as informações relevantes antes de tomar qualquer decisão ou dar início a qualquer providência com prazo legal ou contratual associado."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "8. Proteção de Dados Pessoais"
    },
    {
      "type": "heading",
      "level": 3,
      "text": "8.1 Papéis e documentos aplicáveis"
    },
    {
      "type": "paragraph",
      "text": "O tratamento de dados pessoais no âmbito da Plataforma observa a Lei nº 13.709/2018 (LGPD) e a regulamentação aplicável. Em regra, o Usuário atua como controlador dos dados pessoais de servidores, beneficiários de programas e demais titulares que inserir na Plataforma, e a Capta como operadora, tratando esses dados conforme as instruções documentadas do Usuário. A Capta atua como controladora independente quanto aos dados necessários à sua própria operação (cadastro, segurança, prevenção a fraude, faturamento e cumprimento de obrigações legais). As condições detalhadas constam do Anexo I e da Política de Privacidade."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "8.2 O que a Capta se compromete a fazer, como operadora"
    },
    {
      "type": "paragraph",
      "text": "A Capta trata os Dados do Cliente apenas para as finalidades da prestação do serviço contratado, e não os vende a terceiros em nenhuma circunstância. Dados pessoais identificáveis não são usados para treinar modelos de inteligência artificial de uso geral, alheios à Plataforma. A Capta mantém medidas de segurança técnicas e organizacionais proporcionais ao risco do tratamento, avisa o Contratante sobre incidentes de segurança relevantes assim que possível — em regra, dentro de 24 (vinte e quatro) horas da confirmação —, e colabora ativamente quando o Contratante ou a ANPD precisarem de apoio para atender titulares de dados."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "8.3 O que cabe ao Usuário, como controlador"
    },
    {
      "type": "paragraph",
      "text": "É o Contratante quem decide para que finalidade os dados serão usados e sob qual base legal, e é dele a responsabilidade de informar os titulares e obter consentimento quando a lei exigir. Cabe também ao Contratante inserir apenas dados necessários e corretos, configurar adequadamente as permissões de acesso e os prazos de retenção dentro da Plataforma, e responder às solicitações dos titulares cujos dados controla — contando, para isso, com a cooperação da Capta."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "8.4 Transparência ativa e Lei de Acesso à Informação"
    },
    {
      "type": "paragraph",
      "text": "O Usuário reconhece que, por se tratar de ente ou órgão público, encontra-se sujeito às obrigações de transparência ativa e passiva da Lei nº 12.527/2011 (Lei de Acesso à Informação), bem como ao controle de órgãos de controle interno e externo. Nenhuma disposição destes Termos, da Política de Privacidade ou do Anexo I poderá ser interpretada como restrição ao cumprimento dessas obrigações, observados os limites de proteção de dados pessoais e de informações sigilosas previstos em lei."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "9. Dados do Cliente, Backups e Responsabilidade Compartilhada"
    },
    {
      "type": "heading",
      "level": 3,
      "text": "9.1 Titularidade e licença"
    },
    {
      "type": "paragraph",
      "text": "Os Dados do Cliente são e continuam sendo do Contratante. Ao usar a Plataforma, o Contratante autoriza a Capta a hospedar, processar, copiar e exibir esses dados, mas só na medida em que isso for necessário para prestar o serviço e cumprir obrigações legais — essa autorização não é exclusiva, não gera custo adicional e não vai além dessa finalidade."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "9.2 Backups"
    },
    {
      "type": "paragraph",
      "text": "Como parte de sua rotina operacional, a Capta mantém cópias de segurança dos bancos de dados essenciais. Isso não substitui eventual obrigação do próprio Contratante de guardar seus documentos, nem garante que um dado apagado por um Usuário Autorizado poderá ser recuperado. Por isso, vale ao Contratante exportar seus dados periodicamente, por conta própria."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "9.3 Responsabilidade compartilhada"
    },
    {
      "type": "paragraph",
      "text": "A segurança da informação é uma responsabilidade dividida entre as Partes. Cabe à Capta cuidar da infraestrutura, da aplicação e dos processos sob seu controle direto. Cabe ao Contratante cuidar dos próprios dispositivos, da rede que utiliza, das credenciais de seus usuários, das permissões que concede e da veracidade do que insere na Plataforma."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "9.4 Exportação e eliminação após o encerramento"
    },
    {
      "type": "paragraph",
      "text": "Depois que a contratação terminar, o Contratante tem até 30 (trinta) dias corridos para pedir a exportação dos seus dados, que será entregue em formato comum e tecnicamente viável na Plataforma (CSV, XLSX, JSON ou PDF, por exemplo). Passados 60 (sessenta) dias do encerramento, a Capta pode excluir ou anonimizar o que restar nos ambientes ativos — a menos que exista uma exigência legal, uma ordem de autoridade ou um motivo de controle que imponha guardar por mais tempo. É o Contratante quem deve ficar atento aos prazos de guarda que sua própria atividade exige, e pedir a exportação a tempo."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "10. Obrigações do Usuário e Usos Proibidos"
    },
    {
      "type": "paragraph",
      "text": "Ao usar a Plataforma, o Contratante deve seguir a legislação aplicável e estes Termos, inserir apenas informações verdadeiras e lícitas — respondendo pelo que registrar —, manter seus dados cadastrais em dia, avisar a Capta assim que tomar conhecimento de algum uso indevido, incidente de segurança ou violação destes Termos, e confirmar diretamente nas Fontes Oficiais as informações críticas antes de agir com base nelas."
    },
    {
      "type": "paragraph",
      "text": "Já não é permitido, ao Contratante nem a seus Usuários Autorizados:"
    },
    {
      "type": "list",
      "items": [
        "usar a Plataforma para fins ilícitos, fraudulentos ou que violem direitos de terceiros;",
        "copiar, modificar, descompilar ou fazer engenharia reversa da Plataforma, revendê-la, sublicenciá-la ou explorá-la comercialmente fora do que foi contratado;",
        "extrair dados de forma automatizada ou sistemática (robôs, scrapers, crawlers) fora das funcionalidades de exportação oferecidas pela própria Plataforma;",
        "rodar testes de segurança, varreduras de vulnerabilidade ou testes de carga sem autorização prévia e por escrito da Capta;",
        "burlar controles de acesso, limites de uso ou mecanismos de segurança, ou tentar acessar dados de outro cliente da Capta;",
        "introduzir código malicioso, spam ou qualquer conteúdo capaz de sobrecarregar ou comprometer a Plataforma; e",
        "usar a Plataforma como base para construir um produto concorrente, ou para comparativos de desempenho voltados à divulgação, sem autorização."
      ]
    },
    {
      "type": "heading",
      "level": 2,
      "text": "11. Propriedade Intelectual e Feedback"
    },
    {
      "type": "paragraph",
      "text": "O código, a arquitetura, as funcionalidades, os modelos, a marca, a identidade visual, a Documentação e os demais conteúdos da Plataforma pertencem à Capta ou a seus licenciantes — a contratação não transfere nada disso ao Contratante. O que o Contratante recebe é uma licença de uso limitada, não exclusiva, intransferível e revogável, válida enquanto durar a contratação. Do outro lado, os Dados do Cliente continuam sendo do Contratante em qualquer hipótese."
    },
    {
      "type": "paragraph",
      "text": "Assim como a Capta não cede sua propriedade intelectual, também não pode usar brasões, símbolos oficiais ou a identidade visual do Contratante além do estritamente necessário para prestar o serviço, salvo autorização específica em contrário."
    },
    {
      "type": "paragraph",
      "text": "Se o Contratante enviar sugestões ou feedback sobre a Plataforma, a Capta pode usá-los livremente para melhorá-la, sem que isso gere pagamento ou qualquer direito do Contratante sobre o produto. Dados de uso, quando agregados e anonimizados a ponto de não identificar ninguém, também podem ser aproveitados pela Capta para fins de segurança, estatística e evolução do serviço."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "12. Confidencialidade"
    },
    {
      "type": "paragraph",
      "text": "Ao longo da contratação, Capta e Contratante inevitavelmente têm acesso a informações internas um do outro. Nenhuma das Partes pode usar essas informações para outro fim que não a execução deste contrato, nem revelá-las a quem não precise conhecê-las, devendo cuidar delas com o mesmo zelo — no mínimo razoável — que dedica às suas próprias informações sensíveis. Essa obrigação não alcança informações que já eram públicas, que a Parte já conhecia por outra via legítima, ou cuja divulgação seja determinada por lei, decisão judicial ou órgão de controle — casos em que, sendo possível, a Parte avisará a outra antes de divulgar. O dever de sigilo permanece por 5 (cinco) anos após o fim da contratação, tornando-se permanente no que se refere a dados pessoais e a segredos de negócio, sem prejuízo do dever de transparência pública tratado na Seção 8.4."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "13. Disponibilidade, Suporte e Manutenção"
    },
    {
      "type": "heading",
      "level": 3,
      "text": "13.1 Disponibilidade"
    },
    {
      "type": "paragraph",
      "text": "A Capta trabalha para manter a Plataforma no ar continuamente, mas interrupções acontecem — por manutenção, atualização, correção de falhas ou por motivos fora do controle razoável da empresa. Um nível de serviço (SLA) com garantias específicas só existe se estiver expressamente previsto em contrato próprio."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "13.2 Manutenção programada"
    },
    {
      "type": "paragraph",
      "text": "Sempre que possível, manutenções são agendadas fora do horário comercial e avisadas com antecedência. Já manutenções emergenciais, necessárias para a segurança ou a estabilidade da Plataforma, podem acontecer sem aviso prévio."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "13.3 Suporte"
    },
    {
      "type": "paragraph",
      "text": "O suporte é prestado conforme os canais, horários e níveis definidos no Plano contratado e na Documentação, e cobre apenas o uso da Plataforma — não inclui orientação jurídica, técnica ou de qualquer natureza sobre o conteúdo de um Edital ou Convênio específico."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "14. Garantias e Limitação de Responsabilidade"
    },
    {
      "type": "heading",
      "level": 3,
      "text": "14.1 Ausência de garantias específicas"
    },
    {
      "type": "paragraph",
      "text": "A Plataforma é entregue como está, no estado em que se encontra. Isso não afeta as funcionalidades essenciais que foram efetivamente contratadas, mas significa que a Capta não promete operação perfeita e ininterrupta, não garante que o Conteúdo Gerado ou os dados vindos de Fontes Oficiais estarão sempre exatos, e muito menos que usar a Plataforma resultará em elegibilidade, habilitação ou aprovação de qualquer proposta do Contratante."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "14.2 Limitação de responsabilidade"
    },
    {
      "type": "paragraph",
      "text": "Havendo dano decorrente destes Termos ou do uso da Plataforma, e até onde a lei permitir, o valor que a Capta poderá ser chamada a pagar está limitado ao que o Contratante efetivamente pagou nos 12 (doze) meses anteriores ao fato gerador — não entram nessa conta lucros cessantes, perda de receita, dados que poderiam ter sido exportados e não foram, ou danos indiretos. Essa limitação não se aplica em caso de dolo."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "14.3 Exclusões"
    },
    {
      "type": "list",
      "items": [
        "decisões de participação, habilitação, elaboração de proposta ou submissão em Editais e Convênios tomadas pelo Usuário, ainda que com apoio das Funcionalidades de IA;",
        "conteúdos inseridos pelo Usuário ou por seus Usuários Autorizados;",
        "informações publicadas por Fontes Oficiais ou por serviços de terceiros integrados à Plataforma;",
        "uso da Plataforma em desacordo com estes Termos ou com a Documentação; e",
        "falhas de infraestrutura, dispositivos ou credenciais do Usuário."
      ]
    },
    {
      "type": "heading",
      "level": 2,
      "text": "15. Indenização"
    },
    {
      "type": "paragraph",
      "text": "O Usuário obriga-se a indenizar a Capta por perdas e danos comprovadamente decorrentes de: (i) dados ou conteúdos inseridos, transmitidos ou divulgados pelo Usuário em desacordo com a lei; (ii) uso da Plataforma em violação a estes Termos; ou (iii) violação de direitos de terceiros diretamente causada por ato do Usuário ou de seus Usuários Autorizados. A Capta, por sua vez, responde pelos danos que causar em razão de descumprimento de suas próprias obrigações, nos limites da Seção 14."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "16. Vigência, Suspensão e Encerramento"
    },
    {
      "type": "heading",
      "level": 3,
      "text": "16.1 Vigência"
    },
    {
      "type": "paragraph",
      "text": "Estes Termos vigoram enquanto perdurar a utilização da Plataforma, acompanhando a vigência do contrato administrativo, termo de adesão ou instrumento equivalente."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "16.2 Suspensão e encerramento pela Capta"
    },
    {
      "type": "paragraph",
      "text": "A Capta poderá suspender, total ou parcialmente, o acesso do Usuário em caso de violação destes Termos, uso ilícito ou fraudulento, ou risco à segurança da Plataforma, de dados ou de terceiros, mediante comunicação prévia quando cabível, dispensada nas hipóteses de urgência, fraude ou exigência legal. O encerramento da contratação seguirá as hipóteses e o procedimento previstos no instrumento contratual e na legislação aplicável às contratações públicas."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "16.3 Efeitos do encerramento"
    },
    {
      "type": "paragraph",
      "text": "Encerrada a contratação: (i) cessam as licenças e autorizações concedidas; (ii) o acesso à Plataforma é bloqueado; (iii) a exportação e a eliminação dos Dados do Cliente observarão a Seção 9.4, ressalvadas as retenções exigidas por lei ou por órgão de controle; e (iv) a Capta poderá manter dados mínimos de faturamento, logs de segurança e registros necessários ao cumprimento de obrigações legais, pelos prazos aplicáveis."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "16.4 Sobrevivência"
    },
    {
      "type": "paragraph",
      "text": "Sobrevivem ao término da contratação, pelos prazos legais ou neles previstos, as disposições sobre propriedade intelectual, confidencialidade, proteção de dados, limitação de responsabilidade, indenização, lei aplicável e foro."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "17. Comunicações"
    },
    {
      "type": "paragraph",
      "text": "As comunicações entre as Partes serão realizadas por meio eletrônico: pela Capta, por avisos na Plataforma ou por e-mail ao endereço do Administrador da Conta; pelo Usuário, pelos canais oficiais de suporte ou pelo e-mail [e-mail jurídico da Capta]. Considera-se recebida a comunicação enviada ao e-mail cadastrado, cabendo ao Usuário mantê-lo atualizado e monitorado."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "18. Alterações destes Termos"
    },
    {
      "type": "paragraph",
      "text": "A Capta poderá atualizar estes Termos para refletir evoluções da Plataforma, da legislação ou de suas práticas. Alterações relevantes serão comunicadas com antecedência mínima de 15 (quinze) dias pelos canais da Plataforma; alterações exigidas por lei ou por autoridade poderão ter vigência imediata. Alterações que impactem cláusulas essenciais do contrato administrativo somente produzirão efeitos mediante o correspondente instrumento de aditamento, quando exigido pela legislação de licitações e contratos."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "19. Disposições Gerais"
    },
    {
      "type": "paragraph",
      "text": "Cessão. O Usuário não poderá ceder ou transferir estes Termos, no todo ou em parte, sem anuência prévia e escrita da Capta. A Capta poderá ceder estes Termos a sociedade do mesmo grupo econômico ou a sucessora em caso de reorganização societária, mediante comunicação."
    },
    {
      "type": "paragraph",
      "text": "Independência das Partes. Estes Termos não criam vínculo societário, associativo, trabalhista, de representação ou de agência entre as Partes."
    },
    {
      "type": "paragraph",
      "text": "Anticorrupção. As Partes declaram conhecer e cumprir a Lei nº 12.846/2013 (Lei Anticorrupção), a Lei nº 14.133/2021 e demais normas aplicáveis às contratações com a Administração Pública, comprometendo-se a não oferecer, prometer ou dar, direta ou indiretamente, vantagem indevida a agente público em razão desta contratação."
    },
    {
      "type": "paragraph",
      "text": "Tolerância e nulidade parcial. A tolerância quanto ao descumprimento de qualquer disposição não implica renúncia ou novação. A nulidade de qualquer cláusula não prejudica as demais, que permanecem válidas."
    },
    {
      "type": "paragraph",
      "text": "Acordo integral. Estes Termos, com os documentos indicados na Seção 2.2, constituem o acordo integral entre as Partes quanto ao seu objeto, sem prejuízo do instrumento contratual específico, que prevalece nos termos daquela Seção."
    },
    {
      "type": "paragraph",
      "text": "Idioma. Estes Termos são redigidos em português. Eventuais traduções têm caráter meramente informativo, prevalecendo a versão em português."
    },
    {
      "type": "paragraph",
      "text": "Lei aplicável e foro. Estes Termos são regidos pelas leis da República Federativa do Brasil."
    },
    {
      "type": "paragraph",
      "text": "Fica eleito o foro [definir: da sede do Contratante / da comarca prevista no edital ou contrato administrativo / da sede da Capta em ENDEREÇO] para dirimir controvérsias decorrentes destes Termos, ressalvada disposição diversa constante do contrato administrativo, do edital de licitação ou de norma de competência legal específica."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "Anexo I — Condições de Tratamento de Dados Pessoais"
    },
    {
      "type": "paragraph",
      "text": "Este Anexo integra os Termos de Uso e estabelece as condições sob as quais a Capta, na qualidade de operadora, trata dados pessoais por conta do Usuário, na qualidade de controlador, nos termos dos arts. 37 a 45 da LGPD. Termos iniciados em maiúscula têm o significado dos Termos de Uso."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "A. Objeto, natureza e finalidade do tratamento"
    },
    {
      "type": "paragraph",
      "text": "Neste Anexo, a Capta trata os Dados do Cliente unicamente para prestar o serviço contratado, pelo tempo que durar a contratação, seguindo o que o Contratante configurar na Plataforma ou solicitar formalmente pelos canais oficiais — são essas as “instruções documentadas” referidas na LGPD. Isso abrange, principalmente, três tipos de dado: dados cadastrais e de contato de servidores e Usuários Autorizados; dados de eventuais beneficiários vinculados a projetos, programas ou convênios geridos na Plataforma; e registros de uso e de comunicação dentro do sistema."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "B. O que a Capta faz, como operadora"
    },
    {
      "type": "paragraph",
      "text": "A Capta segue as instruções do Contratante e a legislação aplicável — e, se perceber que alguma instrução contraria a LGPD, avisa antes de executá-la. Restringe o acesso aos dados às pessoas que realmente precisam deles, todas sujeitas a dever de confidencialidade, e mantém as medidas de segurança descritas no item E. Só contrata suboperadores nas condições do item D, e presta apoio ao Contratante — com recursos técnicos e organizacionais razoáveis — sempre que ele precisar atender um titular de dados ou uma exigência da ANPD. Incidentes de segurança são comunicados na forma do item F. Ao final da contratação, os dados são eliminados ou devolvidos conforme a Seção 9.4 dos Termos, salvo quando a lei exigir retê-los por mais tempo."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "C. O que cabe ao Usuário, como controlador"
    },
    {
      "type": "paragraph",
      "text": "É o Contratante quem decide, com exclusividade, as finalidades e as bases legais do tratamento, e quem responde pela licitude dos dados que insere e pelas informações e consentimentos devidos aos titulares, quando a lei os exigir. As instruções que passa à Capta precisam ser lícitas, claras e compatíveis com o que a Plataforma efetivamente oferece. Cabe também ao Contratante administrar as permissões e credenciais de seus Usuários Autorizados, e responder — com a cooperação da Capta — às solicitações de titulares e às comunicações devidas à ANPD."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "D. Suboperadores"
    },
    {
      "type": "paragraph",
      "text": "Para prestar o serviço, a Capta depende de terceiros — provedores de nuvem e hospedagem, segurança da informação, suporte e atendimento, e inteligência artificial. O Contratante autoriza, de forma geral, que esses suboperadores sejam contratados nessas categorias. Em contrapartida, a Capta exige deles obrigações de proteção de dados equivalentes às deste Anexo, continua respondendo perante o Contratante pelo que eles fizerem, mantém uma lista atualizada de suboperadores disponível sob solicitação, e avisa com antecedência sempre que uma mudança relevante ocorrer nessa lista."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "E. Medidas de segurança"
    },
    {
      "type": "paragraph",
      "text": "Proporcionalmente ao risco de cada tratamento, a Capta mantém controles de acesso por função e necessidade, autenticação reforçada para quem administra o sistema, criptografia de dados em trânsito e, quando cabível, em repouso, registro de eventos relevantes, gestão contínua de vulnerabilidades e atualizações, e rotinas de backup dos bancos de dados essenciais — conforme a arquitetura permitir."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "F. Incidentes de segurança"
    },
    {
      "type": "paragraph",
      "text": "Se um incidente de segurança relevante afetar Dados do Cliente, a primeira providência da Capta é conter, investigar e remediar. Em seguida, avisa o Contratante sem demora — em regra, dentro de 24 (vinte e quatro) horas da confirmação —, com o que já se sabe sobre a natureza do incidente, os dados e titulares afetados, e as medidas tomadas. A partir daí, é o Contratante, como controlador, quem avalia e decide sobre as comunicações legalmente devidas à ANPD e aos titulares, contando com a cooperação da Capta nesse processo."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "G. Transferência internacional"
    },
    {
      "type": "paragraph",
      "text": "Se algum suboperador estiver no exterior e isso implicar transferência internacional de dados, a Capta usa um mecanismo válido perante a LGPD e a regulamentação da ANPD — cláusulas contratuais padrão, decisão de adequação ou outro instrumento equivalente — de modo a manter o mesmo nível de proteção previsto aqui."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "H. Auditoria e comprovação"
    },
    {
      "type": "paragraph",
      "text": "Se o Contratante pedir, sob confidencialidade, a Capta compartilha informações, relatórios e políticas que comprovem o cumprimento deste Anexo. Quando isso não bastar para atender uma exigência legal ou de um órgão de controle, o Contratante pode ir além e contratar um auditor independente — sujeito a confidencialidade — para uma auditoria presencial, desde que avise com antecedência razoável, respeite o horário comercial, não atrapalhe a operação e não tenha acesso a dados de outros clientes."
    },
    {
      "type": "heading",
      "level": 3,
      "text": "I. Responsabilidade"
    },
    {
      "type": "paragraph",
      "text": "Se uma das Partes descumprir suas obrigações sob a LGPD ou sob este Anexo e isso causar dano, ela responde por esse dano, nos termos dos arts. 42 a 45 da LGPD. No caso da Capta, essa responsabilidade obedece ao teto fixado na Seção 14 dos Termos — exceto quando o dano decorrer de dolo ou de a Capta ter, deliberadamente, ignorado as instruções do Contratante."
    },
    {
      "type": "paragraph",
      "text": "[RAZÃO SOCIAL DA EMPRESA] · CNPJ [•] · [e-mail jurídico]"
    }
  ]
} satisfies LegalDocumentContent

export { termsOfUseContentPtBR }
