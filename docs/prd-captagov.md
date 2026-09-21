# PRD - CAPTAGOV

> **Status:** rascunho para alinhamento de produto  
> **Versão:** 0.1  
> **Atualizado em:** 8 de setembro de 2026<br>
> **Referências:** Pitch Deck CAPTAGOV / Programa Centelha 2026 e estado atual do repositório.

## 1. Resumo

A Captagov é uma plataforma que ajuda municípios a descobrir, analisar e priorizar oportunidades de recursos públicos. O produto reduz o trabalho manual de acompanhar editais dispersos e transforma essas oportunidades em uma fila de ação explicável, alinhada às necessidades do município.

O foco inicial são prefeituras mineiras de pequeno e médio porte, com possibilidade de expansão posterior para consórcios intermunicipais, associações de municípios, consultorias públicas e outros estados.

O MVP deve começar com uma fonte de dados, TransferGov, e provar que uma base estruturada, a classificação temática e recomendações simples reduzem o retrabalho e aumentam a relevância das oportunidades avaliadas pelos usuários-piloto.

## 2. Problema

As equipes municipais encontram editais e chamadas públicas em múltiplos portais, frequentemente em linguagem técnica e jurídica. Em municípios com equipes reduzidas, esse trabalho depende de conhecimento individual, é reativo e compete com outras demandas administrativas. Como consequência, oportunidades relevantes podem não ser vistas, não ser avaliadas a tempo ou não receber a prioridade adequada.

**Problema a resolver:** como permitir que uma equipe municipal pequena identifique e priorize, com antecedência e confiança, as oportunidades públicas mais aderentes às suas necessidades?

## 3. Objetivo do produto

Oferecer uma central única para acompanhar oportunidades públicas, apresentando para cada edital:

- dados essenciais estruturados e link para a fonte oficial;
- classificação temática inicial;
- prazo e alertas de acompanhamento;
- indicação de aderência ao perfil e às demandas do município;
- justificativa verificável para a recomendação.

O produto apoia a decisão humana. Ele não substitui a análise técnica, jurídica ou a deliberação administrativa do município.

## 4. Usuários e perfis

| Perfil | Necessidade principal | Ações esperadas no MVP |
| --- | --- | --- |
| Gestor ou coordenador de captação | Saber onde a equipe deve agir primeiro | Consultar recomendações, priorizar oportunidades e acompanhar indicadores |
| Técnico de planejamento, convênios ou secretaria | Encontrar e avaliar editais com rapidez | Pesquisar, filtrar, abrir o detalhe, validar aderência e acompanhar prazos |
| Administrador municipal | Configurar o contexto da organização | Manter perfil do município, áreas prioritárias e usuários autorizados |
| Operação CAPTAGOV | Manter qualidade dos dados e do serviço | Monitorar a coleta, corrigir dados estruturados e tratar falhas de fonte |

## 5. Hipóteses a validar

1. Municípios pequenos e médios percebem valor em centralizar editais públicos em uma única base pesquisável.
2. Uma classificação temática inicial e uma recomendação justificada reduzem o tempo de triagem sem comprometer a confiança do usuário.
3. A cobertura inicial da TransferGov é suficiente para iniciar pilotos e aprender antes de ampliar fontes.
4. Alertas de prazo e uma fila priorizada fazem com que oportunidades relevantes sejam analisadas mais cedo.
5. A recomendação é mais útil quando considera o perfil municipal e uma demanda cadastrada, e não apenas palavras-chave.

## 6. Escopo do MVP

### Incluído

1. **Acesso e organização**
   - Cadastro, login, recuperação de senha, verificação de e-mail e login social quando configurado.
   - Autenticação em duas etapas para contas que tenham esse recurso ativado.
   - Organização municipal associada a seus usuários.
   - Perfil municipal inicial: município, porte, áreas prioritárias e demandas ou projetos em linguagem livre.

2. **Coleta e base de oportunidades**
   - Coleta inicial da TransferGov.
   - Registro estruturado, no mínimo, de título, órgão ou concedente, descrição ou objeto, tema, prazo, link da fonte e data de atualização.
   - Identificação da fonte e rastreabilidade até a página ou documento oficial.
   - Busca, filtros e ordenação por tema, situação e prazo.

3. **Triagem e recomendação inicial**
   - Classificação temática básica, inicialmente em áreas como saúde, educação e turismo, com taxonomia evolutiva.
   - Comparação entre a oportunidade, o perfil e as demandas do município.
   - Score de aderência com fatores e justificativa legíveis.
   - Estado de validação humana para que a equipe confirme, descarte ou acompanhe uma oportunidade.

4. **Experiência do usuário**
   - Lista de editais e página de detalhe.
   - Resumo executivo de cada oportunidade, sempre acompanhado de link e referência à fonte.
   - Alertas de novas oportunidades compatíveis e de prazos próximos.
   - Dashboard inicial com oportunidades monitoradas, recomendações e pendências de prazo.

5. **Aprendizado com pilotos**
   - Registro das ações do usuário sobre a recomendação: visualizada, validada, descartada ou acompanhada.
   - Instrumentação para medir relevância percebida, tempo de triagem e uso recorrente.

### Fora do escopo do MVP

- Cobertura completa de ministérios, fundações, portais estaduais e chamadas privadas.
- Submissão de propostas, assinatura, protocolo ou execução de convênios dentro da plataforma.
- Geração automática de proposta final ou parecer jurídico.
- Pontuação usada para decisão automática sem revisão humana.
- Integrações profundas com sistemas internos de prefeituras.
- Planos comerciais, cobrança e suporte multi-organização avançado além do necessário para os pilotos.

## 7. Fluxo principal

1. Um administrador cria a organização e configura o perfil e as prioridades do município.
2. A CAPTAGOV coleta e estrutura oportunidades da TransferGov.
3. O motor classifica as oportunidades e calcula aderência às prioridades e demandas cadastradas.
4. O usuário abre a fila recomendada, entende o score e sua justificativa, e acessa a fonte oficial.
5. O usuário valida, descarta ou acompanha a oportunidade; o produto registra a decisão e alerta sobre prazos.
6. O dashboard consolida as oportunidades monitoradas, recomendações e pendências para apoiar a gestão da captação.

## 8. Requisitos funcionais

| ID | Requisito | Prioridade |
| --- | --- | --- |
| RF-01 | O usuário deve autenticar-se e acessar somente os dados da sua organização. | Must |
| RF-02 | Um administrador deve conseguir registrar e editar o perfil e as áreas prioritárias do município. | Must |
| RF-03 | O sistema deve coletar oportunidades da TransferGov e manter sua origem e data de atualização. | Must |
| RF-04 | O usuário deve listar, pesquisar, filtrar e ordenar oportunidades. | Must |
| RF-05 | O detalhe de uma oportunidade deve exibir dados estruturados, resumo, prazo e acesso à fonte oficial. | Must |
| RF-06 | O sistema deve classificar oportunidades em temas iniciais. | Must |
| RF-07 | O sistema deve recomendar oportunidades e explicar os principais fatores do score. | Must |
| RF-08 | O usuário deve marcar uma oportunidade como validada, descartada ou acompanhada. | Must |
| RF-09 | O sistema deve alertar o usuário sobre novas recomendações e prazos configuráveis. | Should |
| RF-10 | O dashboard deve mostrar indicadores de acompanhamento e ações pendentes. | Should |
| RF-11 | Um operador autorizado deve conseguir acompanhar falhas de coleta e corrigir dados estruturados. | Should |
| RF-12 | O sistema deve apresentar checklist documental e análise de riscos. | Could - pós-MVP |

## 9. Requisitos de confiança, segurança e qualidade

- **Rastreabilidade:** recomendações, resumos e campos extraídos devem apontar para a oportunidade ou documento de origem.
- **Explicabilidade:** nenhum score pode ser exibido sem fatores compreensíveis que sustentem a indicação.
- **Validação humana:** o produto deve deixar claro que a decisão final é da equipe municipal e registrar sua validação.
- **Isolamento de dados:** dados de uma organização não podem ser acessados por usuários de outra organização.
- **Segurança:** credenciais não devem ser persistidas pelo código client-side, e tokens de sessão não devem ser acessíveis ao JavaScript do navegador. O fluxo atual usa um BFF, cookies `HttpOnly` com tokens cifrados e autenticados, rotação do refresh token e validação de origem nas mutações autenticadas. Desafios temporários permanecem apenas na memória durante o login. Senhas novas seguem uma política única no navegador e no BFF; a recuperação não revela a existência da conta, limita solicitações, descarta o token após o uso e encerra as sessões depois da redefinição. O usuário pode consultar e revogar sessões de outros dispositivos, e o logout limpa o estado local e sincroniza as abas depois da tentativa de revogação remota.
- **Qualidade da coleta:** registros incompletos, duplicados, indisponíveis ou desatualizados devem ser identificáveis para a operação.
- **Acessibilidade:** as interfaces web devem permitir navegação por teclado, contraste adequado e conteúdo compreensível para usuários da administração pública.

## 10. Métricas de sucesso

As metas numéricas devem ser definidas após a medição de linha de base com os municípios-piloto. Para o MVP, serão acompanhados:

| Dimensão | Métrica |
| --- | --- |
| Cobertura | Quantidade de oportunidades publicadas e atualizadas a partir da TransferGov |
| Qualidade | Proporção de oportunidades com campos obrigatórios e fonte verificável |
| Relevância | Percentual de recomendações validadas ou acompanhadas pelos pilotos |
| Eficiência | Tempo entre a publicação ou coleta e a primeira análise do usuário; tempo de triagem por oportunidade |
| Adoção | Usuários ativos, organizações ativas e frequência de retorno à fila de oportunidades |
| Resultado | Oportunidades priorizadas dentro do prazo e relatos de redução de retrabalho |
| Confiança | Percentual de recomendações que o usuário considera claras e justificadas |

## 11. Roadmap de validação

| Período | Entrega | Evidência esperada |
| --- | --- | --- |
| Meses 1 a 3 | Coleta inicial da TransferGov e dados básicos de editais | Fonte funcionando e oportunidades disponíveis para consulta interna |
| Meses 3 a 5 | Base estruturada pesquisável | Título, órgão, prazo, área e link consistentes em uma amostra auditada |
| Meses 5 a 8 | Classificação temática inicial | Coerência da classificação validada pelos usuários-piloto |
| Meses 8 a 12 | Resumo, recomendações, alertas e dashboard inicial | Relevância percebida e redução de retrabalho demonstradas nos pilotos |

O roadmap indica ordem de validação, não um compromisso de lançamento automático ao fim de cada período. Cada etapa depende da qualidade dos dados e do retorno dos pilotos.

## 12. Estado atual do projeto

O repositório já possui a fundação de um monorepo TypeScript, com uma aplicação web Next.js, um cliente de API gerado a partir do contrato de autenticação e um BFF de sessão. Os fluxos de cadastro, login, login social, segundo fator durante o login, verificação de e-mail, recuperação e troca de senha, perfil, avatar, renovação de sessão, logout e gerenciamento de dispositivos conectados estão implementados na camada web.

A área autenticada já estabelece a navegação e a linguagem da interface para Home, Dashboard, Editais, Troni, Alertas, Relatórios, Configurações e Ajuda. Hoje, apenas Home e Dashboard têm composição inicial; o dashboard declara explicitamente que aguarda a conexão de fontes e oportunidades. O serviço de domínio para editais, recomendações, alertas e IA ainda não existe no repositório; `apps/api` permanece reservado para sua futura incorporação.

**Implicação:** o próximo incremento de produto deve priorizar o contrato e o serviço de oportunidades antes de expandir as telas. Assim, Editais, Alertas, Dashboard e Troni poderão consumir uma fonte de verdade comum.

## 13. Decisões em aberto

1. Qual integração, mecanismo de coleta e periodicidade serão usados para a TransferGov?
2. Quais campos são obrigatórios para que uma oportunidade possa ser recomendada?
3. Qual é a primeira taxonomia temática e quem pode alterá-la?
4. Como será representado o perfil do município: apenas áreas prioritárias ou também orçamento, território, porte, competências e projetos?
5. Qual modelo de score será usado no piloto e quais fatores devem ser sempre mostrados na justificativa?
6. Quem revisa classificações ou dados de baixa confiança e em qual prazo?
7. Quais municípios ou parceiros participarão do piloto e qual será a linha de base de eficiência?
8. Quais canais de alerta serão habilitados inicialmente: somente dentro da plataforma, e-mail ou ambos?
9. O que exatamente será o **Troni**: interface conversacional, conjunto de agentes de análise, ou ambos?
10. Quais requisitos de LGPD, retenção de dados, auditoria e contratação pública devem ser incorporados antes da expansão comercial?

## 14. Próximo corte de produto recomendado

Transformar o módulo **Editais** no primeiro fluxo vertical completo:

1. definir o contrato de oportunidade e sua fonte;
2. implementar uma importação inicial, mesmo controlada, da TransferGov;
3. persistir e listar oportunidades com filtros e detalhe rastreável;
4. cadastrar um perfil municipal mínimo;
5. exibir uma classificação temática inicial e permitir validação humana;
6. instrumentar uso e coletar feedback de um grupo piloto.

Esse corte valida o problema central antes de investir em IA generativa, múltiplas fontes, relatórios completos ou automações mais complexas.
