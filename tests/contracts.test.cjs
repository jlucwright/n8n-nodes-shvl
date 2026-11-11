const test = require('node:test');
const assert = require('node:assert/strict');
const { Shvl } = require('../dist/nodes/Shvl/Shvl.node.js');
const { ShvlOAuth2Api } = require('../dist/credentials/ShvlOAuth2Api.credentials.js');
function context(resource, operation, workspaceId, response) {
 const requests = [];
 return { requests, getInputData: () => [{}], getNode: () => ({ name: 'SHVL', type: 'shvl', typeVersion: 1, position: [0,0], parameters: {} }), getNodeParameter: key => ({resource,operation,workspaceId})[key], helpers: {httpRequestWithAuthentication: async function(credential, req) { requests.push({credential,...req}); if(response instanceof Error)throw response;return response; }} };
}
test('exposes three typed read operations over fixed REST GET resources', async () => {
 const cases = [
  ['workspace','list','', 'https://shvl.app/mcp/agent/v1/workspaces'],
  ['creditControl','getBrief','fictional-qa', 'https://shvl.app/mcp/agent/v1/workspaces/fictional-qa/credit-control/brief?limit=5'],
  ['receivables','getHealth','fictional-qa', 'https://shvl.app/mcp/agent/v1/workspaces/fictional-qa/receivables/health'],
 ];
 for (const [resource, operation, workspaceId, url] of cases) {
  const ctx=context(resource,operation,workspaceId,{workspaces:[],connector:{read_only:true}});
  const [[item]]=await new Shvl().execute.call(ctx);
  assert.equal(ctx.requests[0].url,url);assert.equal(ctx.requests[0].method,'GET');assert.equal(ctx.requests[0].credential,'shvlOAuth2Api');assert.deepEqual(ctx.requests[0].body,undefined);assert.equal(item.json.connector.read_only,true);
 }
 const properties = new Shvl().description.properties;
 assert.deepEqual(properties.find(x=>x.name==='resource').options.map(x=>x.value),['workspace','creditControl','receivables']);
 for (const resource of ['workspace','creditControl','receivables']) assert.ok(properties.some(x=>x.name==='operation' && x.displayOptions?.show?.resource?.includes(resource)));
});
test('missing workspace, malformed selection, and unsupported resource/operation fail before network', async () => {
 for(const [resource,op,id] of [['creditControl','getBrief',''],['receivables','getHealth','bad\r\nheader'],['creditControl','getBrief','qa/path'],['creditControl','sendReminder','qa'],['other','getBrief','qa']]) {const ctx=context(resource,op,id,{});await assert.rejects(()=>new Shvl().execute.call(ctx));assert.equal(ctx.requests.length,0);}
});
test('existing saved operation values remain mapped to their same read-only GETs', async () => {
 for (const [operation, url] of [
  ['workspaces','https://shvl.app/mcp/agent/v1/workspaces'],
  ['brief','https://shvl.app/mcp/agent/v1/workspaces/fictional-qa/credit-control/brief?limit=5'],
  ['health','https://shvl.app/mcp/agent/v1/workspaces/fictional-qa/receivables/health'],
 ]) {
  const resource = operation === 'workspaces' ? 'workspace' : 'receivables';
  const ctx = context(resource, operation, operation === 'workspaces' ? '' : 'fictional-qa', {});
  await new Shvl().execute.call(ctx);
  assert.equal(ctx.requests[0].url,url);assert.equal(ctx.requests[0].method,'GET');
 }
});
test('REST errors, malformed responses, and transport failures stop workflow execution', async () => {
 for(const response of [{error:{code:'workspace_not_authorised'}},null,[],new Error('429')]) await assert.rejects(()=>new Shvl().execute.call(context('creditControl','getBrief','qa',response)));
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
   if (node.type === 'n8n-nodes-shvl.shvl' && node.parameters.resource !== 'workspace') assert.equal(node.parameters.workspaceId, 'YOUR_WORKSPACE_ID');
  }
 }
});
