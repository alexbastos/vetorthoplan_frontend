# VetOrthoPlan: casos e planejamento

Este contexto descreve o caso clínico e os elementos de imagem usados no planejamento ortopédico veterinário.

## Linguagem

**Caso clínico**:
Registro do paciente e do planejamento que reúne arquivos clínicos e o trabalho do profissional.
_Evitar_: exame, arquivo

**Arquivo clínico**:
Arquivo original importado e associado a um caso clínico. Pode ser uma radiografia ou um anexo de apoio, como PDF ou vídeo.
_Evitar_: imagem, quando o arquivo não for uma radiografia

**Radiografia**:
Arquivo clínico de imagem que pode ser exibido no quadro e receber calibração própria. Uma radiografia não herda a calibração de outra imagem do mesmo caso.
_Evitar_: caso calibrado

**Evidência de escala DICOM**:
Metadados de espaçamento e tipo de calibração presentes no arquivo DICOM. Sua presença, por si só, não significa que o profissional validou a escala para este planejamento.
_Evitar_: calibração validada

**Calibração da imagem**:
Escala confirmada para uma radiografia específica pelo profissional, com origem e autoria registradas. Na calibração manual, inclui a marcação e a medida real da referência conhecida.
_Evitar_: escala do caso
