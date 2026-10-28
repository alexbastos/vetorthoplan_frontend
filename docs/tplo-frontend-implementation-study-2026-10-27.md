# Roadmap de planejamento TPLO

Estado consolidado em 28/10/2026. Baseado no guia de implementação fornecido
pelo backend, confrontado com o contrato e o código do projeto. O guia orienta
o produto; schemas, autorização e resultados persistidos continuam sendo a
autoridade da API. O aceite clínico não é inferido pela existência de endpoints.

## Base entregue

- GET do plano completo e calibração por linha/círculo, usando a matriz original.
- Revisão otimista, rascunhos por imagem/organização, proteção de navegação e
  exclusão, reconciliação por GET após resposta perdida.
- Leitura/preservação dos campos atuais do documento, incluindo correção TPLO,
  implantes, dados radiográficos, medições adicionais e auditoria.
- Comandos limitados por campo, um recibo compartilhado por imagem e consultas
  tipadas/BFF para protocolo clínico e tabela de rotação.
- Acesso permanente a Ferramentas. Com escala confirmada, abre o painel; sem
  calibração, inicia seu fluxo. Há somente a seção Medidas e seu texto de apoio.
- Qualidade e elegibilidade são processos internos do backend. Não reintroduzir
  painel manual de qualidade nem aprovação local dos critérios.

O guia original foi inspecionado em 27/10; SHA-256:
`badb80b82a8f32a698b3dd5f98b49bdb921f5d60e80abe89b8ad6c6293e933c4`.
Seus wireframes não substituem o sistema visual atual do produto.

## Sequência de implementação

| Etapa | Próxima entrega | Condição de aceite |
| --- | --- | --- |
| Medidas | Distância entre dois pontos; depois ângulo/círculo. | Calibração confirmada; desenho na matriz original; unidade/resultado persistido pelo servidor; zoom/pan/espelhamento não alteram a medida. |
| Landmarks | Referências anatômicas e método TPLO. | Nomes e obrigatoriedade vêm do protocolo; valores locais e resultados oficiais permanecem distintos. |
| Osteotomia/simulação | Fragmento, referência, lâmina e rotação. | Transformação reproduz o resultado do backend; ausência de configuração ou correspondência exata não vira recomendação inventada. |
| Revisão/auditoria | DRAFT → READY_FOR_REVIEW → APPROVED/REJECTED. | Permissões e recusas respeitadas; decisão, identidade e auditoria são do servidor. |
| Finalização/relatórios | Finalizar revisão aprovada; ler snapshot e links PNG/PDF. | Somente leitura conforme regra confirmada, recuperação de POST incerto sem replay e renovação de links expirados por consulta. |
| Implantes | Catálogo e posicionamento após as etapas iniciais. | Unidade, coordenadas, lateralidade, origem/licença, versão e checksum definidos. Leitura do schema não significa UI entregue. |

Dividir medidas e simulação em entregas pequenas e validar cada uma. Não ativar
autosave nem substituir o salvamento explícito da calibração sem uma decisão
de produto específica.

## Invariantes de implementação

- Um documento e uma sequência de gravações por imagem. Calibração, objetos,
  landmarks e outros campos compartilham revisão; escritores independentes
  podem apagar ou sobrescrever dados de outra etapa.
- Cada comando altera somente campos permitidos sobre o documento atual.
  PUT substitui o documento completo: preservar todos os outros campos.
  Campos desconhecidos devem falhar sem escrita, em vez de serem descartados.
- O BFF não recebe um canvas arbitrário. O comando de calibração continua
  limitado a baseRevision/calibration e 4 KiB; o comando interno de qualidade
  tem limite próprio de 12 KiB. Novas operações exigem schema e limite próprios.
- 409 conserva a intenção original; não reescrever a revisão nem reaplicar
  automaticamente. Resultado incerto permite apenas GET de conferência.
- Identidade, resultado derivado, elegibilidade e revisão clínica não são
  valores confiáveis fornecidos pelo navegador.
- Configuração de protocolo/tabela ausente deve ser representada. Não fixar
  tolerâncias, nomes configuráveis ou recomendações clínicas no frontend.
- Não enviar movimento de ponteiro como uma sucessão de PUTs. Se autosave for
  aprovado, agrupar por gesto/pausa e manter um comando em curso por imagem.
- Excluir uma imagem/caso impede que callbacks antigos recriem seus dados.

Não unificar os estados: cálculo da medida, aceitação, qualidade radiográfica,
elegibilidade, revisão clínica, finalização e status do caso têm significados
distintos. Não acrescentar FINALIZED ao status do caso sem suporte contratual.

## Alinhamentos antes das respectivas etapas

- Finalização: distinguir ausência, imagem inexistente e revisão não aprovada;
  confirmar idempotência do POST para a mesma revisão, reabertura/nova versão
  e quais comandos ficam bloqueados após finalizar.
- Simulação: obter convenção e ordem da matriz afim, referenciais de
  coordenadas e exemplos com resultados para conferência visual.
- Protocolo: obter nomes de landmarks/medidas, campos obrigatórios e exemplos
  de configuração, ausência e reprovação; confirmar tolerâncias e homologação.
- Auditoria: confirmar papéis autorizados, transições após aprovação/rejeição
  e comportamento quando calibração ou pontos de um plano revisado mudam.
- DICOM: alinhar precedência dos espaçamentos, escala por eixo e compensação
  no backend. Manter a restrição de anisotropia do [contrato da calibração](./calibration-contract-2026-10-23.md).

## Validação

Testar cada comando pelo navegador, rota BFF e HTTP simulado: identidade,
limites, revisão zero, preservação de campos, concorrência, conflito, perda de
resposta e isolamento. Conferir coordenadas em imagens retangulares, zoom,
pan, espelhamento, toque, teclado e redimensionamento.

Aceite real permanece nos roteiros de [calibração](./calibration-acceptance-2026-10-26.md)
e [integração clínica](./clinical-api-0.9.0-manual-test-checklist.md).
