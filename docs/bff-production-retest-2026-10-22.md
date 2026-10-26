# Reteste de produção após reinício — 22/10/2026

**Resultado:** serviços disponíveis, POSTs vazios com JSON explícito passam pela validação de formato, mas o frontend publicado ainda entrega o cliente antigo. A implantação das últimas correções não foi confirmada; há evidência direta de JavaScript anterior à correção de headers.

As consultas foram feitas entre **19:18 e 19:22 (America/Sao_Paulo)**, sem cookies ou credenciais. Horários UTC exatos e respostas sanitizadas estão nas evidências abaixo.

## Resultados HTTP

| Verificação | Resultado observado | Interpretação |
| --- | --- | --- |
| `GET /api/version` | 404 HTML; sem `X-App-Version` | A identificação `0.9.0-web.1` do commit `cbdcbfd` não está disponível nessa origem. |
| `GET /health/live` | 200, `status: ok` | Serviço clínico responde. |
| `GET /health/ready` | 200, `status: ready`, `database: ok` | Readiness clínico passou. |
| `GET /health/authentication_api` | 200, `status: ok` | Serviço de autenticação responde. |
| Contratos públicos | Clínica 0.9.0, 17 operações; autenticação 1.0.0, 65 operações | Ambos acessíveis; emissão de token por organização publicada na autenticação. |
| Casos clínicos e organizações upstream sem Bearer | 401 em ambos | As leituras verificadas exigem autenticação. |
| POST vazio em sessão, contexto e perfil com `application/json` | 401 nos três | Esperado sem sessão: o formato já não causa 415. |
| Mesmos POSTs com `application/json; charset=utf-8` | 401 nos três | Parâmetro charset também aceito. |
| Mesmos POSTs sem `Content-Type` | 415, `REQUEST_NOT_ALLOWED` nos três | Controle que reproduz o problema do cliente antigo no caminho de produção. |
| Contexto com corpo `{}` e JSON explícito | 400, `REQUEST_NOT_ALLOWED` | O contrato de zero bytes de corpo continua sendo aplicado. |
| Contexto com JSON explícito e origem não autorizada | 403, `REQUEST_NOT_ALLOWED` | Validação de origem continua sendo aplicada. |

Foram realizadas 19 sondas nessa matriz. Nenhuma utilizou a sessão do usuário. Respostas 401 e 403 nos cenários negativos acima são resultados esperados, não falhas de disponibilidade.

## Evidência do cliente antigo

A página pública `/login`, consultada sem sessão, referencia o bundle:

```text
/_next/static/chunks/9843-a63b31e5be6d5c3d.js
```

Esse arquivo, baixado da própria origem publicada, contém a chamada de sessão e o transporte antigo:

```javascript
session: () => o("/api/auth/session")
// Transporte minificado servido em produção:
headers: void 0 === t ? void 0 : { "content-type": "application/json" }
```

Logo, `session()` sem argumento continua produzindo uma requisição sem `Content-Type` nesse artefato. O código corrigido em `ae261c1` usa o cabeçalho incondicional no [cliente de autenticação](../apps/web/src/features/auth/services/auth-bff-client.ts), mantendo o corpo ausente. O build de identificação `cbdcbfd` também deveria expor `/api/version` e `X-App-Version`.

O dado confirma código antigo no caminho entregue ao navegador; não identifica sozinho se a origem é imagem/container antigo, artefatos estáticos de outro build ou cache intermediário. Não é possível obter o SHA exato do deploy a partir dessas sondas.

## Próximo passo operacional

1. Gerar/publicar um novo build ou imagem da branch `bff-integration`, incluindo **`cbdcbfd`**. Esse commit já inclui as correções `3be5321` e `ae261c1`.
2. Confirmar que o servidor Next/standalone e os arquivos estáticos pertencem ao mesmo build. Verificar cache de proxy/CDN, se houver. Reiniciar uma imagem antiga não incorpora commits novos.
3. Conferir `GET /api/version`: deve retornar 200 com `{"version":"0.9.0-web.1"}` e `X-App-Version: 0.9.0-web.1`.
4. Recarregar o navegador e verificar que os POSTs de sessão/contexto/perfil enviam JSON explicitamente e corpo vazio.
5. Testar a conta autenticada. Se houver `CLINICAL_ORGANIZATION_UNAVAILABLE`, rastrear consulta de organizações e troca de token; as sondas sem credenciais não verificam essas duas etapas para o usuário.

O domínio do Gateway na URL não demonstra acesso direto à API clínica: uma URL relativa `/api/...` usa a origem da página. Nesta origem, os retornos das rotas de sessão/contexto/perfil são compatíveis com os handlers do BFF; o destino final depende do roteamento por path no Gateway.

## Evidências preservadas

- [Matriz de respostas HTTP sanitizadas](./openapi/bff-production-retest-2026-10-22.json).
- [Páginas, scripts referenciados e trechos públicos do cliente](./openapi/bff-deployed-client-retest-2026-10-22.json).

Nenhuma chamada autenticada, criação de conta, troca real de token de organização, operação clínica de escrita ou upload foi executado. O reteste não alterou código de runtime nem publicou uma nova versão.
