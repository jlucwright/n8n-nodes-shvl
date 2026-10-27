const test = require('node:test');
const assert = require('node:assert/strict');
const { Shvl } = require('../dist/nodes/Shvl/Shvl.node.js');
const { ShvlOAuth2Api } = require('../dist/credentials/ShvlOAuth2Api.credentials.js');
function context(operation, workspaceId, response) {
 const requests = [];
 return { requests, getInputData: () => [{}], getNode: () => ({ name: 'SHVL', type: 'shvl', typeVersion: 1, position: [0,0], parameters: {} }), getNodeParameter: key => ({operation,workspaceId})[key], helpers: {httpRequestWithAuthentication: async function(credential, req) { requests.push({credential,...req}); if(response instanceof Error)throw response;return response; }} };
}
const ok = data => ({jsonrpc:'2.0',id:1,result:{structuredContent:data}});
test('only the three fixed read tools and fixed endpoint are exposed', async () => {
 for (const [operation,name] of Object.entries({workspaces:'list_shvl_workspaces',brief:'get_credit_control_brief',health:'get_receivables_health'})) {
  const ctx=context(operation,'fictional-qa',ok({source:{last_synced_at:null},workspaces:[]}));
  const [[item]]=await new Shvl().execute.call(ctx);
  assert.equal(ctx.requests[0].url,'https://shvl.app/mcp/agent/v1');assert.equal(ctx.requests[0].method,'POST');assert.equal(ctx.requests[0].body.params.name,name);
  assert.equal(ctx.requests[0].headers['X-SHVL-Workspace-ID'], operation==='workspaces'?undefined:'fictional-qa');assert.equal(ctx.requests[0].body.params.arguments.workspace_id,operation==='workspaces'?undefined:'fictional-qa');assert.equal(item.json.source.last_synced_at,null);
 }
});
test('missing workspace and arbitrary operation fail before network', async () => {
 for(const [op,id] of [['brief',''],['health','bad\r\nheader'],['send_reminder','qa']]) {const ctx=context(op,id,ok({}));await assert.rejects(()=>new Shvl().execute.call(ctx));assert.equal(ctx.requests.length,0);}
});
test('MCP denied/error and malformed response stop workflow rather than returning empty success', async () => {
 for(const response of [{jsonrpc:'2.0',id:1,error:{code:-1}}, {jsonrpc:'2.0',id:1,result:{isError:true}},ok([]),{jsonrpc:'2.0',id:2,result:{structuredContent:{}}},new Error('429')]) await assert.rejects(()=>new Shvl().execute.call(context('brief','qa',response)));
});
test('OAuth uses PKCE identity scopes and no client secret', () => {
 const p=Object.fromEntries(new ShvlOAuth2Api().properties.map(x=>[x.name,x.default]));assert.equal(p.grantType,'pkce');assert.equal(p.scope,'openid profile email');assert.equal(p.clientSecret,'');assert.equal(p.accessTokenUrl,'https://aywqulzuzeblmfwstldr.supabase.co/auth/v1/oauth/token');
});
