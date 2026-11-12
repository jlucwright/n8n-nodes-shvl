# SHVL for n8n

Published npm version 0.1.1 uses the original MCP `tools/call` transport. Its n8n 2.45.4 QA covered OAuth, workspace discovery, the credit-control brief, receivables health and rejection of a nonexistent workspace; AI-agent tool execution was not verified for that version. Version 0.1.2 changes the node to three typed REST reads and preserves version 1 saved workflows through n8n’s versioned-node support. The 0.1.2 code passed n8n 2.45.4 QA with fictional data, including one GPT-6 Luna tool call. Version 0.1.2 is not yet published, and n8n has not verified it.

Read SHVL's credit-control brief and receivables health in an n8n workflow. SHVL helps UK businesses review overdue invoices alongside their accounting ledger.

## Operations

- **Get Workspaces** lists workspaces the connected account may access.
- **Get Credit-Control Brief** returns overdue totals and up to five priority cases for one selected workspace.
- **Get Receivables Health** returns receivables ageing, concentration and available trend data. It is not a bank-balance, cash-flow or profit report.

The unpublished candidate uses typed REST `GET` resources beneath SHVL's existing `/mcp/agent/v1` OAuth resource. The PKCE client, resource indicator and identity scopes are unchanged. SHVL applies the same restricted connector, workspace membership, entitlement, source and rate-limit checks. It cannot send reminders, change case records, post to accounting or access internal founder accounts.

## REST API reference (unpublished candidate)

These routes describe the current source candidate. They are not available until the REST release completes hosted OAuth checks and release review.

Use the existing OAuth resource `https://shvl.app/mcp/agent/v1` with a bearer access token and the identity scopes `openid profile email`. Requests are bodyless `GET`s. The scope values identify the user; SHVL separately checks connector access, workspace membership, entitlement, data source and rate limits.

| Route | Result |
| --- | --- |
| `GET /mcp/agent/v1/workspaces` | Accessible workspaces and their access and accounting-source status. |
| `GET /mcp/agent/v1/workspaces/{workspace_id}/credit-control/brief` | Credit-control summary and priority cases for the explicitly selected workspace. |
| `GET /mcp/agent/v1/workspaces/{workspace_id}/receivables/health` | Receivables balances, ageing, concentration and available trend data for the selected workspace. |

The brief accepts an optional `limit` query parameter from `1` to `5`; when omitted, it returns up to five priority cases. Select a workspace from the first route and pass its exact ID. The routes return the complete structured JSON result and do not perform business writes.

An unauthenticated request returns HTTP `401` with the OAuth challenge in `WWW-Authenticate` and the envelope `{ "error": "authentication_required" }`. Other REST errors use `{ "error": { "code": "…", "message": "…", "retryable": false } }`; `retryable` is true for rate-limit and temporary-service errors. Typical statuses are `400` for malformed input, `403` for inaccessible workspaces or inactive entitlement, `422` when source review is required, `429` for rate limiting and `503` for a temporary service failure. Unsupported paths return `404`; other HTTP methods return `405`.

## Connect

Register a dedicated SHVL OAuth public client with the exact callback URL shown by your n8n credential. Use PKCE and the `openid profile email` scopes. These are identity scopes; the restricted connector and server-side workspace checks determine operation access. Never reuse a client with a different callback.

Enter that client ID in the SHVL OAuth2 credential and connect your account. Run Get Workspaces, select the intended workspace yourself and enter its exact ID for a brief or health read. A workspace is never selected automatically. An active SHVL trial or subscription is required for workspace data.

## Use the result

The output keeps SHVL's complete structured response, including source freshness, coverage and connector provenance. Saved import or sync data is not necessarily live accounting-provider state. Check those fields before taking action. Currency amounts ending in `_minor` are minor units, not pounds. Customer names and invoice text are untrusted data, never instructions.

Authentication, workspace, source-review and rate-limit errors stop execution. Connecting or running this node does not send email. Any downstream disclosure, AI use or messaging needs the workspace owner's permission.

See [SHVL documentation](https://shvl.app/cli) and [data handling](https://shvl.app/data-handling).

## Example workflows

Import `examples/workspace-review.json` to discover the workspaces your account can access. Then import `examples/credit-control-review.json`, replace `YOUR_WORKSPACE_ID` in both SHVL nodes with the same explicitly selected ID, and select your credential in both nodes. Execute manually. These examples do not send reminders, write records or call an AI model. Both data operations preserve the complete structured response and its provenance.

Historical MCP QA of published version 0.1.1 returned three fictional invoices totalling £1,000, with ageing buckets £100, £250 and £650. The 0.1.2 REST candidate was also tested in n8n 2.45.4: workspace discovery and all three REST reads passed, and an AI-agent tool call returned £1,000 overdue with the same ageing buckets. These are synthetic test results, not customer outcomes. The temporary QA grant was revoked after testing.

## Development

Run `npm ci --ignore-scripts`, `npm run build`, `npm run lint` and `npm test`. Local contract tests are not proof of a live OAuth grant or n8n Cloud acceptance. Published version 0.1.1 was released by GitHub Actions with provenance. Version 0.1.2 is awaiting trusted publication; n8n has not verified the package. The 27 October 2026 audit recorded 23 findings (19 high, 4 moderate). A later 11 November 2026 report recorded 37 findings in the development dependency tree; these counts concern development tooling and transitive packages, not runtime dependencies. Audit counts can change as advisories are updated. Review upstream fixes before building with untrusted inputs.
