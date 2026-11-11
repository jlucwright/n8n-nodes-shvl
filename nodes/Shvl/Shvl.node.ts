import { NodeConnectionTypes, NodeOperationError, type IDataObject, type IExecuteFunctions, type INodeExecutionData, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

const API = 'https://shvl.app/mcp/agent/v1';
type Resource = 'workspace' | 'creditControl' | 'receivables';
type Operation = 'list' | 'getBrief' | 'getHealth';
const LEGACY_OPERATIONS = {
 workspaces: { resource: 'workspace', operation: 'list' },
 brief: { resource: 'creditControl', operation: 'getBrief' },
 health: { resource: 'receivables', operation: 'getHealth' },
} as const;

export class Shvl implements INodeType {
 description: INodeTypeDescription = {
  displayName: 'SHVL', name: 'shvl', icon: { light: 'file:shvl.svg', dark: 'file:shvl.svg' }, group: ['transform'], version: 1,
  subtitle: '={{$parameter["operation"]}}', description: 'Read SHVL credit-control information without sending reminders', defaults: { name: 'SHVL' },
  usableAsTool: true, inputs: [NodeConnectionTypes.Main], outputs: [NodeConnectionTypes.Main],
  credentials: [{ name: 'shvlOAuth2Api', required: true }],
  properties: [
   { displayName: 'Resource', name: 'resource', type: 'options', noDataExpression: true, default: 'workspace', options: [
    { name: 'Workspace', value: 'workspace' },
    { name: 'Credit Control', value: 'creditControl' },
    { name: 'Receivable', value: 'receivables' },
   ] },
   { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'list', displayOptions: { show: { resource: ['workspace'] } }, options: [
    { name: 'List', value: 'list', action: 'List workspaces', description: 'List workspaces available to the connected account' },
   ] },
   { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'getBrief', displayOptions: { show: { resource: ['creditControl'] } }, options: [
    { name: 'Get Brief', value: 'getBrief', action: 'Get credit control brief', description: 'Read overdue totals and priority cases from the latest saved sync' },
   ] },
   { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'getHealth', displayOptions: { show: { resource: ['receivables'] } }, options: [
    { name: 'Get Health', value: 'getHealth', action: 'Get receivables health', description: 'Read ageing and receivables coverage, not bank balance or profit' },
   ] },
   { displayName: 'Workspace ID', name: 'workspaceId', type: 'string', default: '', required: true, displayOptions: { hide: { resource: ['workspace'] } }, description: 'Exact workspace ID from Workspaces. Never inferred from the first result.' },
  ],
 };

 async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const output: INodeExecutionData[] = [];
  for (let i = 0; i < this.getInputData().length; i++) {
   const selectedResource = this.getNodeParameter('resource', i) as Resource;
   const selectedOperation = String(this.getNodeParameter('operation', i));
   const compatibility = LEGACY_OPERATIONS[selectedOperation as keyof typeof LEGACY_OPERATIONS];
   const resource = compatibility?.resource || selectedResource;
   const operation = compatibility?.operation || selectedOperation as Operation;
   const workspaceId = resource === 'workspace' ? '' : String(this.getNodeParameter('workspaceId', i)).trim();
   let url: string;
   if (resource === 'workspace' && operation === 'list') url = `${API}/workspaces`;
   else {
    if (!workspaceId || workspaceId.length > 120 || workspaceId.includes('/') || workspaceId.includes('\\') || /[\r\n]/.test(workspaceId)) throw new NodeOperationError(this.getNode(), 'Select an exact SHVL workspace ID', { itemIndex: i });
    const workspace = encodeURIComponent(workspaceId);
    if (resource === 'creditControl' && operation === 'getBrief') url = `${API}/workspaces/${workspace}/credit-control/brief?limit=5`;
    else if (resource === 'receivables' && operation === 'getHealth') url = `${API}/workspaces/${workspace}/receivables/health`;
    else throw new NodeOperationError(this.getNode(), 'Unsupported SHVL resource or operation', { itemIndex: i });
   }
   const response = await this.helpers.httpRequestWithAuthentication.call(this, 'shvlOAuth2Api', {
    method: 'GET', url, headers: { Accept: 'application/json' }, json: true,
   });
   if (response?.error || !response || typeof response !== 'object' || Array.isArray(response)) throw new NodeOperationError(this.getNode(), 'SHVL refused the read. Check workspace access, subscription and connection, then retry.', { itemIndex: i });
   output.push({ json: response as IDataObject, pairedItem: { item: i } });
  }
  return [output];
 }
}
