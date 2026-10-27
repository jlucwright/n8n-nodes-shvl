import { NodeConnectionTypes, NodeOperationError, type IDataObject, type IExecuteFunctions, type INodeExecutionData, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

const ENDPOINT = 'https://shvl.app/mcp/agent/v1';
const TOOLS = { workspaces: 'list_shvl_workspaces', brief: 'get_credit_control_brief', health: 'get_receivables_health' } as const;

export class Shvl implements INodeType {
 description: INodeTypeDescription = {
  displayName: 'SHVL', name: 'shvl', icon: { light: 'file:shvl.svg', dark: 'file:shvl.svg' }, group: ['transform'], version: 1,
  subtitle: '={{$parameter["operation"]}}', description: 'Read SHVL credit-control information without sending reminders', defaults: { name: 'SHVL' },
  usableAsTool: true, inputs: [NodeConnectionTypes.Main], outputs: [NodeConnectionTypes.Main],
  credentials: [{ name: 'shvlOAuth2Api', required: true }],
  properties: [
   { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'workspaces', options: [
    { name: 'Get Credit-Control Brief', value: 'brief', action: 'Get credit control brief', description: 'Read overdue totals and priority cases from the latest saved sync' },
    { name: 'Get Receivables Health', value: 'health', action: 'Get receivables health', description: 'Read ageing and receivables coverage, not bank balance or profit' },
    { name: 'Get Workspaces', value: 'workspaces', action: 'Get workspaces', description: 'List workspaces available to the connected account' },
   ] },
   { displayName: 'Workspace ID', name: 'workspaceId', type: 'string', default: '', required: true, displayOptions: { hide: { operation: ['workspaces'] } }, description: 'Exact workspace ID from Get Workspaces. Never inferred from the first result.' },
  ],
 };

 async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const output: INodeExecutionData[] = [];
  for (let i = 0; i < this.getInputData().length; i++) {
   const operation = this.getNodeParameter('operation', i) as keyof typeof TOOLS;
   if (!Object.prototype.hasOwnProperty.call(TOOLS, operation)) throw new NodeOperationError(this.getNode(), 'Unsupported SHVL operation', { itemIndex: i });
   const workspaceId = operation === 'workspaces' ? '' : String(this.getNodeParameter('workspaceId', i)).trim();
   if (operation !== 'workspaces' && (!workspaceId || workspaceId.length > 120 || /[\r\n]/.test(workspaceId))) throw new NodeOperationError(this.getNode(), 'Select an exact SHVL workspace ID', { itemIndex: i });
   const response = await this.helpers.httpRequestWithAuthentication.call(this, 'shvlOAuth2Api', {
    method: 'POST', url: ENDPOINT, headers: { Accept: 'application/json', ...(workspaceId ? { 'X-SHVL-Workspace-ID': workspaceId } : {}) },
    body: { jsonrpc: '2.0', id: i + 1, method: 'tools/call', params: { name: TOOLS[operation], arguments: operation === 'workspaces' ? {} : { workspace_id: workspaceId, ...(operation === 'brief' ? { limit: 5 } : {}) } } }, json: true,
   });
   if (response?.error || response?.result?.isError) throw new NodeOperationError(this.getNode(), 'SHVL refused the read. Check workspace access, subscription and connection, then retry.', { itemIndex: i });
   const data = response?.result?.structuredContent;
   if (response?.jsonrpc !== '2.0' || response?.id !== i + 1 || !data || typeof data !== 'object' || Array.isArray(data)) throw new NodeOperationError(this.getNode(), 'SHVL returned an unexpected response', { itemIndex: i });
   output.push({ json: data as IDataObject, pairedItem: { item: i } });
  }
  return [output];
 }
}
