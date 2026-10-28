# Documentação

Este diretório mantém contratos, decisões de produto e roteiros de validação
que continuam necessários. Relatórios de execução e comparações substituídas
ficam no histórico do Git; não manter uma nova cópia a cada rodada de trabalho.

## Produto e arquitetura

- [PRD](./prd-vetorthoplan.md): escopo, requisitos e validação clínica.
- [Vocabulário do domínio](../CONTEXT.md): casos, arquivos, radiografias e calibração.
- [Sistema de design](./design-system-inventory.md) e [movimento de autenticação](./auth-motion-contract.md).
- [OAuth/PKCE](./oauth-pkce.md) e [segurança HTTP](./security-http-surface-audit.md).
- [Contrato do token de organização](./organization-token-contract.md).

## Integração e trabalho pendente

- [Estado da integração](./clinical-remote-integration-status.md): entregue, pendências operacionais e débitos a revalidar.
- [Roadmap TPLO](./tplo-frontend-implementation-study-2026-10-27.md): próximos comandos, medidas, simulação, revisão e relatórios.
- [Contrato da calibração](./calibration-contract-2026-10-23.md): coordenadas, escala, revisão e restrição DICOM.
- [Aceite da calibração](./calibration-acceptance-2026-10-26.md): roteiro visual e autenticado atualizado.
- [Checklist clínico](./clinical-api-0.9.0-manual-test-checklist.md): jornada integrada, upload, duplicidade, exclusão e isolamento.
- [Checklist OAuth](./testing/oauth-pkce-manual-test-matrix.md).

Detalhes de implementação ficam junto das features:
[casos](../apps/web/src/features/cases/README.md),
[autenticação](../apps/web/src/features/auth/README.md),
[configurações](../apps/web/src/features/settings/README.md) e
[cliente da API](../packages/api-client/README.md).

## Contratos e evidências que devem permanecer

| Arquivo em `openapi/` | Uso |
| --- | --- |
| `authentication-api.openapi.json` | Geração dos tipos de autenticação. |
| `authentication-api.snapshot.json` | Origem, versão e hash desse contrato. |
| `authentication-api.audit-2026-10-22.openapi.json` | Evidência da rota de token de organização, ainda ausente do canônico de autenticação. |
| `clinical-api.openapi.json` | Geração dos tipos clínicos e testes de contrato. |
| `clinical-api.snapshot.json` | Proveniência, hashes e contagens validados por `verify:clinical`. |
| `clinical-api.published-2026-10-28.openapi.json` | Fonte original exigida pelo verificador; é intencionalmente igual ao canônico atual. |
| `clinical-api.duplicate-2026-10-23.openapi.json` | Contrato original dos cálculos geométricos de calibração; usado nos testes e na reprodução da evidência. |

A fixture `testing/calibration-contract-fixtures-2026-10-23.json` contém
resultados do backend fixado por commit. O script
`testing/capture-calibration-contract.py` reproduz essa captura. Não substituir
seus hashes por um contrato novo: os testes precisam conservar a origem real
dos resultados.

## Testes e manutenção

`apps/web/test/` contém testes automatizados em uso e duas fixtures compartilhadas.
`pnpm --filter web test` descobre todos os `test/*.test.mjs`; os arquivos API,
BFF e workspace verificam camadas diferentes do mesmo fluxo.

Antes de remover um arquivo, conferir imports, leituras de fixtures, scripts e
links Markdown. Remover um teste apenas quando sua responsabilidade deixou de
existir ou sua cobertura foi substituída. Para novos trabalhos, atualizar o
documento de referência correspondente em vez de criar relatórios datados de
cada execução. Resultados automatizados não aprovam, por si só, o aceite real.
