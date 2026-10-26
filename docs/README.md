# Documentação

## Integração clínica atual

- [Plano de integração da calibração](./calibration-integration-plan-2026-10-23.md): etapas e estado da entrega; [contrato e evidências da tarefa 1](./calibration-contract-2026-10-23.md).
- [Exclusão de caso e renomeação de imagem em 23/10/2026](./case-delete-image-rename-integration-2026-10-23.md): integração das novas operações, estados de falha e verificações realizadas.
- [Auditoria do BFF contra o Swagger em 22/10/2026](./bff-swagger-contract-audit-2026-10-22.md): cobertura verificada, snapshots atuais, erros reproduzidos e premissas ainda abertas.
- [Reteste de produção após reinício em 22/10/2026](./bff-production-retest-2026-10-22.md): matriz HTTP e evidência do cliente antigo ainda servido pelo ambiente.
- [Plano de execução para a API clínica 0.9.0](./clinical-api-0.9.0-execution-plan.md): status por tarefa, decisões de implementação e trabalho ainda pendente.
- [Checklist manual da API clínica 0.9.0](./clinical-api-0.9.0-manual-test-checklist.md): roteiro de aceite para a jornada integrada, JWT e storage.
- [Estado da integração remota](./clinical-remote-integration-status.md): verificações públicas, integração JWT entregue e aceite real ainda pendente.
- [Revisão do gateway clínico](./clinical-api-gateway-review-2026-10-21.md): diferenças entre a publicação atual e o snapshot canônico consultadas em 21/10/2026.
- [Contrato suplementar do token de organização](./organization-token-contract.md): confirmação do backend, decisões do BFF e critérios de aceite real.

## Registros de implementação e contrato

- [Bloqueio de arquivos duplicados](./backend-image-duplicate-request-2026-10-23.md): pedido original, contrato publicado, integração do frontend e aceite operacional pendente.
- [Revisão da API clínica 0.9.0](./backend-api-0.9.0-review.md): comparação registrada em 20/10/2026; o plano 0.9.0 contém o status de implementação atual.
- [Pedidos originais ao backend](./backend-adjustments-request.md): registro dos pedidos enviados antes da publicação 0.9.0; atendimento e pendências estão nos documentos atuais acima.
- [Plano anterior de integração de casos e BFF](./cases-bff-execution-plan.md): registro da integração baseada em 0.8.0; use o plano 0.9.0 para status atual.
- [Contrato OpenAPI da Authentication API](./openapi/authentication-api.openapi.json): fonte canônica versionada para gerar os tipos do cliente.
- [Contrato OpenAPI da API clínica](./openapi/clinical-api.openapi.json): fonte canônica 0.9.0 para gerar os tipos; consulte a [proveniência](./openapi/clinical-api.snapshot.json). Os demais snapshots e exports publicados permanecem em `docs/openapi/` como registros versionados.
- [PRD da Orthovet](./prd-vetorthoplan.md): visão de produto, escopo do MVP, requisitos, segurança clínica e roadmap de validação.

## Produto, arquitetura e segurança

- [Feature de casos](../apps/web/src/features/cases/README.md): fluxos clínicos integrados, estados e decisões de dados da feature.
- [Feature de autenticação](../apps/web/src/features/auth/README.md): responsabilidades do navegador e do BFF para login, MFA, senhas, recuperação, renovação de sessão e logout.
- [Feature de configurações](../apps/web/src/features/settings/README.md): contratos de perfil e avatar, validação das sessões ativas e revogação de dispositivos.
- [OAuth 2.0 com PKCE](./oauth-pkce.md): arquitetura, fronteiras de responsabilidade, configuração e invariantes de segurança.
- [Auditoria da superfície HTTP](./security-http-surface-audit.md): inventário de rotas, origens, recursos CSP, controles atuais e pendências para headers, CSRF e limites.
- [Inventário do sistema de design](./design-system-inventory.md): componentes, padrões e estado da interface.
- [Contrato de movimento de autenticação](./auth-motion-contract.md): comportamento de movimento e transições da experiência de autenticação.
- [Matriz manual de OAuth/PKCE](./testing/oauth-pkce-manual-test-matrix.md): cenários funcionais, negativos, acessíveis e operacionais para validação.

Decisões técnicas e documentação de arquitetura do projeto serão registradas neste diretório.
