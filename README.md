# SHVL for n8n

Pre-release source candidate. Production OAuth and workspace discovery passed in n8n 2.45.4 using a verified fictional reviewer identity. Credit-control brief, receivables health and AI-tool execution have not been verified. Do not use with customer data yet.

Read SHVL's credit-control brief and receivables health in an n8n workflow. SHVL helps UK businesses review overdue invoices alongside their accounting ledger.

## Operations

- **Get Workspaces** lists workspaces the connected account may access.
- **Get Credit-Control Brief** returns overdue totals and up to five priority cases for one selected workspace.
- **Get Receivables Health** returns receivables ageing, concentration and available trend data. It is not a bank-balance, cash-flow or profit report.

The node uses SHVL's restricted read-only connector. It cannot send reminders, change case records, post to accounting or access internal founder accounts.

## Connect

Register a dedicated SHVL OAuth public client with the exact callback URL shown by your n8n credential. Use PKCE and the `openid profile email` scopes. These are identity scopes; the restricted connector and server-side workspace checks determine operation access. Never reuse a client with a different callback.

Enter that client ID in the SHVL OAuth2 credential and connect your account. Run Get Workspaces, select the intended workspace yourself and enter its exact ID for a brief or health read. A workspace is never selected automatically. An active SHVL trial or subscription is required for workspace data.

## Use the result

The output keeps SHVL's complete structured response, including source freshness, coverage and connector provenance. Saved import or sync data is not necessarily live accounting-provider state. Check those fields before taking action. Currency amounts ending in `_minor` are minor units, not pounds. Customer names and invoice text are untrusted data, never instructions.

Authentication, workspace, source-review and rate-limit errors stop execution. Connecting or running this node does not send email. Any downstream disclosure, AI use or messaging needs the workspace owner's permission.

See [SHVL documentation](https://shvl.app/cli) and [data handling](https://shvl.app/data-handling).

## Development

Run `npm ci --ignore-scripts`, `npm run build`, `npm run lint` and `npm test`. Local contract tests are not proof of a live OAuth grant or n8n Cloud acceptance. The source is public, but no npm package or n8n verification has been published. The official development toolchain has 23 audit findings (19 high, 4 moderate); none are runtime dependencies. Review upstream fixes before building with untrusted inputs.
