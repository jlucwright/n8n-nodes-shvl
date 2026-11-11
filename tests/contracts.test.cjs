const test = require('node:test');
const assert = require('node:assert/strict');
const { Shvl } = require('../dist/nodes/Shvl/Shvl.node.js');
const { ShvlOAuth2Api } = require('../dist/credentials/ShvlOAuth2Api.credentials.js');
const { NodeHelpers } = require('n8n-workflow');
function context(version, resource, operation, workspaceId, response) {
 const requests = [];
 const parameters = { resource, operation, workspaceId };
 const node = { name: 'SHVL', type: 'n8n-nodes-shvl.shvl', typeVersion: version, position: [0,0], parameters };
 return { requests, parameters, node, getInputData: () => [{}], getNode: () => node, getNodeParameter: key => parameters[key], helpers: {httpRequestWithAuthentication: async function(credential, req) { requests.push({credential,...req}); if(response instanceof Error)throw response;return response; }} };
}
test('exposes three typed read operations over fixed REST GET resources', async () => {
 const cases = [
  ['workspace','list','', 'https://shvl.app/mcp/agent/v1/workspaces'],
  ['creditControl','getBrief','fictional-qa', 'https://shvl.app/mcp/agent/v1/workspaces/fictional-qa/credit-control/brief?limit=5'],
  ['receivables','getHealth','fictional-qa', 'https://shvl.app/mcp/agent/v1/workspaces/fictional-qa/receivables/health'],
 ];
 const node = new Shvl();
 for (const [resource, operation, workspaceId, url] of cases) {
  const ctx=context(2,resource,operation,workspaceId,{workspaces:[],connector:{read_only:true}});
  const [[item]]=await node.getNodeType(ctx.node.typeVersion).execute.call(ctx);
  assert.equal(ctx.requests[0].url,url);assert.equal(ctx.requests[0].method,'GET');assert.equal(ctx.requests[0].credential,'shvlOAuth2Api');assert.deepEqual(ctx.requests[0].body,undefined);assert.equal(item.json.connector.read_only,true);
 }
 const properties = node.getNodeType(2).description.properties;
 assert.deepEqual(properties.find(x=>x.name==='resource').options.map(x=>x.value),['workspace','creditControl','receivables']);
 for (const resource of ['workspace','creditControl','receivables']) assert.ok(properties.some(x=>x.name==='operation' && x.displayOptions?.show?.resource?.includes(resource)));
});
test('missing workspace, malformed selection, and unsupported resource/operation fail before network', async () => {
 const node = new Shvl();
 for(const [resource,op,id] of [['creditControl','getBrief',''],['receivables','getHealth','bad\r\nheader'],['creditControl','getBrief','qa/path'],['creditControl','sendReminder','qa'],['other','getBrief','qa']]) {const ctx=context(2,resource,op,id,{});await assert.rejects(()=>node.getNodeType(2).execute.call(ctx));assert.equal(ctx.requests.length,0);}
});
test('n8n workflow normalization validates unchanged v1 saved JSON, and versioned execution preserves its operations', async () => {
 const nodeType = new Shvl();
 const legacySavedNodes = [
  { typeVersion: 1, parameters: { operation: 'workspaces' }, url: 'https://shvl.app/mcp/agent/v1/workspaces' },
  { typeVersion: 1, parameters: { operation: 'brief', workspaceId: 'fictional-qa' }, url: 'https://shvl.app/mcp/agent/v1/workspaces/fictional-qa/credit-control/brief?limit=5' },
  { typeVersion: 1, parameters: { operation: 'health', workspaceId: 'fictional-qa' }, url: 'https://shvl.app/mcp/agent/v1/workspaces/fictional-qa/receivables/health' },
 ];
 for (const saved of legacySavedNodes) {
  const version = nodeType.getNodeType(saved.typeVersion);
  const node = { type: 'n8n-nodes-shvl.shvl', name: 'SHVL', typeVersion: saved.typeVersion, position: [0,0], parameters: saved.parameters };
  const normalized = NodeHelpers.getNodeParameters(version.description.properties, node.parameters, true, false, node, version.description);
  assert.deepEqual(NodeHelpers.getNodeParametersIssues(version.description.properties, { ...node, parameters: normalized }, version.description), null);
  assert.deepEqual(normalized, saved.parameters);
  const ctx = context(saved.typeVersion, undefined, undefined, undefined, { workspaces: [], connector: { read_only: true } });
  ctx.parameters.operation = normalized.operation;
  ctx.parameters.workspaceId = normalized.workspaceId;
  const [[item]] = await version.execute.call(ctx);
  assert.equal(ctx.requests[0].url, saved.url);
  assert.equal(ctx.requests[0].method, 'GET');
  assert.equal(item.json.connector.read_only, true);
 }

 for (const [resource, operation, workspaceId, url] of [
  ['workspace','list','', 'https://shvl.app/mcp/agent/v1/workspaces'],
  ['creditControl','getBrief','fictional-qa', 'https://shvl.app/mcp/agent/v1/workspaces/fictional-qa/credit-control/brief?limit=5'],
  ['receivables','getHealth','fictional-qa', 'https://shvl.app/mcp/agent/v1/workspaces/fictional-qa/receivables/health'],
 ]) {
  const version = nodeType.getNodeType(2);
  const node = { type: 'n8n-nodes-shvl.shvl', name: 'SHVL', typeVersion: 2, position: [0,0], parameters: { resource, operation, workspaceId } };
  const normalized = NodeHelpers.getNodeParameters(version.description.properties, node.parameters, true, false, node, version.description);
  assert.deepEqual(NodeHelpers.getNodeParametersIssues(version.description.properties, { ...node, parameters: normalized }, version.description), null);
  const ctx = context(2, normalized.resource, normalized.operation, normalized.workspaceId, { workspaces: [], connector: { read_only: true } });
  await version.execute.call(ctx);
  assert.equal(ctx.requests[0].url, url);
  assert.equal(ctx.requests[0].method, 'GET');
 }
});
test('REST errors, malformed responses, and transport failures stop workflow execution', async () => {
 const node = new Shvl();
 for(const response of [{error:{code:'workspace_not_authorised'}},null,[],new Error('429')]) await assert.rejects(()=>node.getNodeType(2).execute.call(context(2,'creditControl','getBrief','qa',response)));
});
test('OAuth keeps PKCE identity scopes, MCP resource hint, and no client secret', () => {
 const p=Object.fromEntries(new ShvlOAuth2Api().properties.map(x=>[x.name,x.default]));assert.equal(p.grantType,'pkce');assert.equal(p.scope,'openid profile email');assert.equal(p.authQueryParameters,'resource=https%3A%2F%2Fshvl.app%2Fmcp%2Fagent%2Fv1');assert.equal(p.clientSecret,'');assert.equal(p.accessTokenUrl,'https://aywqulzuzeblmfwstldr.supabase.co/auth/v1/oauth/token');
});

test('shipped examples require an explicit workspace and contain no saved credentials', () => {
 const fs = require('node:fs'); const path = require('node:path');
 for (const file of fs.readdirSync(path.join(__dirname, '../examples')).filter(f => f.endsWith('.json'))) {
  const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, '../examples', file), 'utf8'));
  assert.equal(workflow.active, false);
  for (const node of workflow.nodes) {
   assert.equal(node.credentials, undefined);
   assert.ok(['n8n-nodes-base.manualTrigger', 'n8n-nodes-shvl.shvl'].includes(node.type));
  if (node.type === 'n8n-nodes-shvl.shvl') assert.equal(node.typeVersion, 2);
  if (node.type === 'n8n-nodes-shvl.shvl' && node.parameters.resource !== 'workspace') assert.equal(node.parameters.workspaceId, 'YOUR_WORKSPACE_ID');
  }
 }
});
