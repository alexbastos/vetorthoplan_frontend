# Contrato da calibração — tarefa 1 — 23/10/2026

Status: levantamento técnico concluído para a integração manual. A restrição
para anisotropia DICOM está definida abaixo. Aceite autenticado no ambiente
publicado continua separado da verificação de código/contrato.

## Fontes e alcance da verificação

- OpenAPI público consultado em `2026-10-23T18:39:03.791Z`: idêntico ao canônico,
  versão 0.9.0, SHA-256
  `b40fe463c29b4d2d41332c5565e9fc02a0c9f6e9f7e81b9c416894a21f0f004e`.
- Após atualizar somente as referências remotas do repositório irmão, foi
  identificada a branch `calibration`, commit
  `279139d4c1ea795bd26578e3595f5e38b14b4712`. Nenhum checkout, pull ou edição
  dos arquivos do backend foi realizado.
- Sete schemas de calibração/plano e as operações GET/PUT do export desse commit
  são iguais aos do Swagger publicado. Isso comprova compatibilidade dessas
  definições, não a revisão efetivamente implantada: a publicação não informa
  seu commit. Outros schemas do export não foram promovidos como substitutos
  do OpenAPI público.
- Fontes primárias no commit: `docs/PLANO_GEOMETRICO_API.md`,
  `src/vetorthoplan/domain/planning/measurements.py`,
  `application/use_cases/image_plans.py`, `api/schemas.py`, `api/routes/plans.py`,
  `bootstrap.py` e `infrastructure/image_content.py` sob `src/vetorthoplan/`.
- Dez exemplos foram executados contra o módulo geométrico real desse commit,
  em memória, usando apenas a biblioteca padrão Python. Resultados e hashes
  estão em [fixtures](./testing/calibration-contract-fixtures-2026-10-23.json).
  Não houve leitura/escrita de imagens reais, requisição autenticada, acesso ao
  storage ou gravação clínica em produção.

## Coordenadas e relação entre imagem e prévia

As coordenadas são contínuas, normalizadas e inclusivas em `[0, 1]`:

| Posição | Valor |
| --- | --- |
| Esquerda / direita | `x = 0` / `x = 1` |
| Superior / inferior | `y = 0` / `y = 1` |
| Centro | `{ "x": 0.5, "y": 0.5 }` |

O backend usa a matriz original já orientada para exibição:

```text
x_original = x_normalizado × largura_original
y_original = y_normalizado × altura_original
distância_px = hypot(Δx_normalizado × largura_original,
                    Δy_normalizado × altura_original)
```

São dimensões integrais, não `largura − 1` / `altura − 1`. Por exemplo, uma
referência de borda a borda em uma imagem de largura 2000 corresponde a 2000 px.

A inspeção raster aplica EXIF antes de extrair as dimensões de PNG/JPEG. A
prévia é PNG, com até 1600 px no maior eixo, sem recorte e com proporção
preservada, sujeita ao arredondamento inteiro do thumbnail. No DICOM, a imagem
é formada por linhas/colunas; a prévia não aplica reorientação para os eixos
do paciente a partir de `ImageOrientationPatient`.

Para um gesto no retângulo efetivamente ocupado pela imagem, já considerando
zoom e pan:

```text
x_normalizado = (cursorX − retângulo.left) / retângulo.width
y_normalizado = (cursorY − retângulo.top) / retângulo.height
```

Usar o retângulo da imagem, não o palco incluindo áreas pretas. Os pontos
persistidos não dependem da resolução da prévia, do zoom nem do tamanho da
janela. Calcular distâncias a partir dos pixels da prévia produziria escala
incorreta. Cada eixo precisa ser convertido com sua dimensão correspondente.

## Referência manual e resultado oficial

| Método | Geometria enviada | Referência real |
| --- | --- | --- |
| `REFERENCE_LINE` | `start`, `end` | `known_length_mm` |
| `REFERENCE_CIRCLE` | `center`, `edge` | `known_diameter_mm` |

O valor real precisa ser positivo, finito e de no máximo 10000 mm. O código
de schema do backend também rejeita extremidades coincidentes; essa regra
semântica não aparece como restrição entre propriedades no OpenAPI.

No círculo, `edge` é um ponto da borda: a distância centro–borda é o raio. O
backend multiplica essa distância por dois e compara com o diâmetro informado.
Não enviar diâmetro como raio, nem usar a mesma diferença normalizada nos dois
eixos para construir um círculo em uma imagem retangular.

O contrato limita `center` e `edge` à matriz e exige pontos distintos. Não exige
que a circunferência inteira fique dentro da imagem. Na revisão de 26/10/2026,
essa regra foi reconferida no schema do backend fixado acima. O editor remoto
deve preservar os dois pontos ao mover a referência e aceitar círculos
parcialmente visíveis, sem deslocar o centro para forçar um círculo inscrito.

Ao salvar, o backend descarta `calibration.result` fornecido pelo cliente e
recalcula `reference_length_px`, `mm_per_pixel` e `calibration_id` usando as
dimensões originais. Esses campos são resultado, não entrada da calibração.
Sem dimensões originais, a derivação não produz um resultado de calibração;
uma gravação que retorne referência sem resultado válido não libera Medidas.

O fingerprint depende da referência e das dimensões. Alterar o valor conhecido
ou as dimensões muda o ID. Ele não contém o ID da imagem: imagens diferentes
com a mesma geometria e dimensões podem compartilhar o fingerprint. Cache,
permissões e elegibilidade continuam vinculados à imagem/caso/organização.

## Plano inicial, revisão e erros

Uma imagem válida, autorizada e `READY`, ainda sem plano, retorna **200** com
`revision: 0`, `updated_at: null` e documento sem calibração/objetos. Os campos
opcionais do plano podem aparecer como nulos por causa do modelo de resposta.
404 não significa plano vazio.

Primeiro PUT: `base_revision: 0`. A criação gera revisão 1; a atualização usa a
revisão lida e gera a seguinte. O PUT substitui o documento completo: preservar
campos de TPLO, validação e objetos existentes ao alterar somente a calibração.

| Resposta | Código verificado no backend | Comportamento na futura integração |
| --- | --- | --- |
| 404 | `IMAGE_NOT_FOUND` | Não inventar plano inicial; não revelar outro tenant. |
| 409 | `IMAGE_NOT_READY` | Não permitir edição/gravação. |
| 409 | `PLAN_REVISION_CONFLICT` | Preservar rascunho, consultar revisão atual e conciliar; sem PUT automático. |
| 422 | `REQUEST_VALIDATION_ERROR` | Corrigir geometria/campos inválidos. |
| 422 | `CLINICAL_VALIDATION_INVALID` | Pode afetar documento já aprovado; não remover sua revisão clínica silenciosamente. |

`PLAN_REVISION_CONFLICT` inclui `details.current_revision`. Comparação de
revisão também protege criação concorrente; a persistência usa restrição por
tenant/imagem e atualização condicionada à revisão. Resultado de rede incerto
exige leitura e reconciliação antes de nova gravação.

## Exemplos calculados a partir do código real

Em uma matriz de **2000 × 1000 px**:

| Referência | Distância no original | Valor conhecido | Resultado |
| --- | --- | --- | --- |
| Linha `(0.125, 0.25) → (0.625, 0.25)` | 1000 px | 50 mm | 0.05 mm/px |
| Linha `(0.25, 0.125) → (0.25, 0.625)` | 500 px | 50 mm | 0.1 mm/px |
| Círculo: centro `(0.5, 0.5)`, borda `(0.5625, 0.5)` | diâmetro 250 px | 20 mm | 0.08 mm/px |
| Círculo: centro `(0.5, 0.5)`, borda `(0.5, 0.625)` | diâmetro 250 px | 20 mm | 0.08 mm/px |

Exemplo de primeira gravação por linha, somente para uma imagem sem plano:

```json
{
  "base_revision": 0,
  "document": {
    "schema_version": 1,
    "calibration": {
      "kind": "REFERENCE_LINE",
      "start": { "x": 0.125, "y": 0.25 },
      "end": { "x": 0.625, "y": 0.25 },
      "known_length_mm": 50
    },
    "objects": []
  }
}
```

A fixture `horizontal` preserva o resultado completo calculado, incluindo o
fingerprint. Para atualizar um plano existente, partir do documento recebido
pelo GET e de sua revisão; não reaplicar esse exemplo reduzido.

## DICOM com pixels não quadrados

O backend atual **não corrige anisotropia**: sua derivação recebe largura e
altura, mas não `PixelSpacing`, `ImagerPixelSpacing` ou orientação. Aplica uma
única escala manual ao plano. Isso difere do modelo legado do frontend, que
usa `pixelAspectRatio` e escala por linha/coluna.

Decisão técnica para a primeira integração: não habilitar calibração/medidas
em matrizes com anisotropia conhecida até haver contrato compatível para os
dois eixos. Não aplicar uma compensação apenas no navegador, pois o backend
persistiria outro cálculo. Espaçamentos nulos permanecem desconhecidos; não
inventar `[1, 1]`, substituir escala manual por DICOM ou corrigir orientação
automaticamente. A política clínica para dados ausentes/divergentes e o suporte
físico anisotrópico devem ser alinhados antes de ampliar esse escopo.

## Consequências para as tarefas seguintes

- Confirmado pelo usuário: entrada no terceiro ícone lateral, a régua.
- Não ativar diretamente `CaseWorkspaceImage` nem sua persistência legada.
- Criar conversão compatível com as bordas contínuas; o mapper atual limita a
  `widthPx - 1` / `heightPx - 1` e não deve definir os pontos enviados à API.
- O círculo legado guarda centro/raio em pixels. O estado remoto deve conservar
  `center` e `edge`, inclusive o ponto de borda original ao reabrir sem edição;
  reconstruir outra direção pode alterar o fingerprint sem mudar o raio.
- Mostrar referência salva mesmo fora do modo de edição. Hoje `readOnly`
  também oculta o marcador, o que precisa ser separado na tarefa de interface.
- Considerar salva/elegível somente calibração persistida, resultado válido,
  imagem correta e ausência de rascunho alterado. Não interpretar isso como
  aprovação clínica automática.

## Reproduzir a verificação

```powershell
python docs/testing/capture-calibration-contract.py --output docs/testing/calibration-contract-fixtures-2026-10-23.json
cd apps/web
node --test test/calibration-contract.test.mjs
```

O primeiro comando exige o objeto Git fixado na cópia irmã do backend e executa
seu módulo puro, sem alterar a branch ou importar o aplicativo. O segundo usa
somente fixtures versionadas e o OpenAPI local. Foram aprovados 10 cenários de
derivação e oito testes de contrato. A suíte completa do web também passou:
**285/285 testes**. A verificação dos checksums do OpenAPI passou, assim como
`git diff --check`. Testes GET/PUT autenticados, persistência real e aceite
visual pertencem às próximas etapas.
