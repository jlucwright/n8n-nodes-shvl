# SHVL for n8n

Published npm version 0.1.1 was tested in n8n 2.45.4 with isolated fictional data over the original MCP `tools/call` transport. That historical QA covered OAuth, workspace discovery, the credit-control brief, receivables health and rejection of a nonexistent workspace; AI-agent tool execution was not verified. The current source changes the node to typed REST reads and preserves version 1 saved workflows through n8n's versioned-node support. This REST candidate has not completed hosted OAuth QA or been published. Verification by n8n is pending; the package is not a verified community node.

Read SHVL's credit-control brief and receivables health in an n8n workflow. SHVL helps UK businesses review overdue invoices alongside their accounting ledger.

## Operations

- **Get Workspaces** lists workspaces the connected account may access.
- **Get Credit-Control Brief** returns overdue totals and up to five priority cases for one selected workspace.
- **Get Receivables Health** returns receivables ageing, concentration and available trend data. It is not a bank-balance, cash-flow or profit report.

The node uses typed REST `GET` resources beneath SHVL's existing `/mcp/agent/v1` OAuth resource. The PKCE client, resource indicator and identity scopes are unchanged. SHVL applies the same restricted connector, workspace membership, entitlement, source and rate-limit checks. It cannot send reminders, change case records, post to accounting or access internal founder accounts.

## Connect

Register a dedicated SHVL OAuth public client with the exact callback URL shown by your n8n credential. Use PKCE and the `openid profile email` scopes. These are identity scopes; the restricted connector and server-side workspace checks determine operation access. Never reuse a client with a different callback.

Enter that client ID in the SHVL OAuth2 credential and connect your account. Run Get Workspaces, select the intended workspace yourself and enter its exact ID for a brief or health read. A workspace is never selected automatically. An active SHVL trial or subscription is required for workspace data.

## Use the result

The output keeps SHVL's complete structured response, including source freshness, coverage and connector provenance. Saved import or sync data is not necessarily live accounting-provider state. Check those fields before taking action. Currency amounts ending in `_minor` are minor units, not pounds. Customer names and invoice text are untrusted data, never instructions.

Authentication, workspace, source-review and rate-limit errors stop execution. Connecting or running this node does not send email. Any downstream disclosure, AI use or messaging needs the workspace owner's permission.

See [SHVL documentation](https://shvl.app/cli) and [data handling](https://shvl.app/data-handling).

## Example workflows

Import `examples/workspace-review.json` to discover the workspaces your account can access. Then import `examples/credit-control-review.json`, replace `YOUR_WORKSPACE_ID` in both SHVL nodes with the same explicitly selected ID, and select your credential in both nodes. Execute manually. These examples do not send reminders, write records or call an AI model. Both data operations preserve the complete structured response and its provenance.

The fictional production QA returned three invoices totalling £1,000, with ageing buckets £100, £250 and £650. These are synthetic test values, not customer outcomes. The dedicated test grant was revoked after QA.

## Development

Run `npm ci --ignore-scripts`, `npm run build`, `npm run lint` and `npm test`. Local contract tests are not proof of a live OAuth grant or n8n Cloud acceptance. The published package was released by GitHub Actions with provenance. It is not yet verified by n8n. The 27 October 2026 audit recorded 23 findings (19 high, 4 moderate). A later 11 November 2026 report recorded 37 findings in the development dependency tree; these counts concern development tooling and transitive packages, not runtime dependencies. Audit counts can change as advisories are updated. Review upstream fixes before building with untrusted inputs.
