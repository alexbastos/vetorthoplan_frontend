# Exclusão de caso e renomeação de imagem — 23/10/2026

Implementação baseada no OpenAPI publicado em 23/10/2026, preservado em
`openapi/clinical-api.published-2026-10-23.openapi.json`. O contrato continua
identificado como 0.9.0 e agora contém 19 operações. O snapshot canônico,
os tipos gerados e os checksums foram atualizados juntos.

## Exclusão do caso

- Botão no rodapé dos detalhes, com confirmação em modal centralizado.
- BFF: `DELETE /api/cases/{caseId}`, sem corpo, usando sessão e organização validadas.
- API clínica: `DELETE /api/v1/cases/{case_id}`; sucesso somente com 204.
- 409 preserva o caso e informa o bloqueio por upload/processamento ativo.
- Cliques simultâneos compartilham uma requisição. Resposta perdida é reconciliada
  consultando o caso; não existe repetição automática do DELETE. Enquanto o
  resultado estiver indefinido, a ação apenas verifica o resultado.
- Confirmação de exclusão cancela leituras antigas, limpa os dados daquele caso,
  invalida a listagem e retorna para `/app/cases`.

## Renomeação da imagem

- Lápis antes da lixeira, disponível no hover, foco por teclado e telas de toque.
- Modal compacto com nome, extensão preservada e botão de salvar.
- BFF: `PATCH /api/cases/{caseId}/images/{imageId}`, JSON `{ "display_name": "nome.png" }`.
- API clínica: `PATCH /api/v1/images/{image_id}`. O BFF verifica o vínculo da
  imagem com o caso antes da alteração e valida a resposta.
- A interface passa a exibir `display_name`, com fallback para o nome original.
  Arquivo original e prévia permanecem associados à mesma imagem.
- As duas operações respeitam os bloqueios de alterações concorrentes e não
  encaminham credenciais ou detalhes de erros internos ao navegador.

## Verificação

- 273 testes automatizados aprovados, incluindo 15 testes dedicados às novas ações.
- TypeScript do web e do api-client aprovado; verificação de proveniência do
  contrato aprovada; `git diff --check` sem problemas.
- Renderização dos componentes verificada em português e inglês: nome exibido,
  ordem lápis/lixeira e botão de exclusão nos detalhes. Isso não substitui o
  aceite visual interativo.
- Três expectativas antigas de testes foram alinhadas ao commit `38f0334`, que
  exige JSON `{}` na troca de token de organização. O fluxo de autenticação não
  foi alterado nesta implementação.
- ESLint local não possui configuração correspondente aos arquivos TS/TSX e
  os ignora; seu resultado não representa uma validação desses arquivos.

Não foram executadas alterações em dados de produção. O aceite integrado ainda
deve verificar, usando um caso de teste: cancelar e confirmar os modais; nome
longo/inválido; renomear e recarregar; bloquear exclusão durante processamento;
excluir caso de teste com imagens e conferir sua ausência após recarregar.
A limpeza física do storage deve ser confirmada com o backend.

Atualização posterior em 23/10: o OpenAPI passou a documentar
`409 IMAGE_UPLOAD_DUPLICATE`, integrado ao tratamento de duplicatas da fila.
Veja o [pedido e registro da integração](./backend-image-duplicate-request-2026-10-23.md).
