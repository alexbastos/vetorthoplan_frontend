# Documentação

- [PRD da CAPTAGOV](./prd-captagov.md): visão de produto, escopo do MVP, requisitos e roadmap de validação.
- [Contrato OpenAPI da Authentication API](./openapi/authentication-api.openapi.json): fonte versionada usada para gerar os tipos do cliente.
- [Contrato OpenAPI do VetOrthoPlan Backend](./openapi/vetorthoplan-backend.openapi.json): contrato `0.6.0` de casos, upload e processamento inicial de imagens.
- [Handoff visual do VetOrthoPlan](./vetorthoplan/README.md): pranchas atualizadas para criação, casos, upload e IMG-02.
- [Feature de autenticação](../apps/web/src/features/auth/README.md): responsabilidades do navegador e do BFF para login, MFA, senhas, recuperação, renovação de sessão e logout.
- [Feature de configurações](../apps/web/src/features/settings/README.md): contratos de perfil e avatar, validação das sessões ativas e revogação de dispositivos.
- [OAuth 2.0 com PKCE](./oauth-pkce.md): arquitetura, fronteiras de responsabilidade, configuração e invariantes de segurança.
- [Auditoria da superfície HTTP](./security-http-surface-audit.md): inventário de rotas, origens, recursos CSP, controles atuais e pendências para headers, CSRF e limites.
- [Matriz manual de OAuth/PKCE](./testing/oauth-pkce-manual-test-matrix.md): cenários funcionais, negativos, acessíveis e operacionais para a validação posterior.

Decisões técnicas e documentação de arquitetura do projeto serão registradas neste diretório.
