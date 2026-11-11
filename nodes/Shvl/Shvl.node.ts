import { NodeConnectionTypes, NodeOperationError, VersionedNodeType, type IDataObject, type IExecuteFunctions, type INode, type INodeExecutionData, type INodeType, type INodeTypeBaseDescription, type INodeTypeDescription, type IVersionedNodeType } from 'n8n-workflow';

const API = 'https://shvl.app/mcp/agent/v1';
type Resource = 'workspace' | 'creditControl' | 'receivables';
type Operation = 'list' | 'getBrief' | 'getHealth';

type ReadContext = IExecuteFunctions;

const legacyProperties: INodeTypeDescription['properties'] = [
 { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'workspaces', options: [
  { name: 'Get Credit-Control Brief', value: 'brief', action: 'Get credit control brief', description: 'Read overdue totals and priority cases from the latest saved sync' },
  { name: 'Get Receivables Health', value: 'health', action: 'Get receivables health', description: 'Read receivables ageing, not bank balance or profit' },
  { name: 'Get Workspaces', value: 'workspaces', action: 'Get workspaces', description: 'List workspaces available to the connected account' },
 ] },
 { displayName: 'Workspace ID', name: 'workspaceId', type: 'string', default: '', required: true, displayOptions: { hide: { operation: ['workspaces'] } }, description: 'Exact workspace ID from Workspaces. Never inferred from the first result.' },
];

const currentProperties: INodeTypeDescription['properties'] = [
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
];

const baseDescription: INodeTypeBaseDescription = {
 displayName: 'SHVL', name: 'shvl', icon: { light: 'file:shvl.svg', dark: 'file:shvl.svg' }, group: ['transform'],
 description: 'Read SHVL credit-control information without sending reminders', defaultVersion: 2,
};

function workspaceUrl(workspaceId: string, node: INode) {
 if (!workspaceId || workspaceId.length > 120 || workspaceId.includes('/') || workspaceId.includes('\\') || /[\r\n]/.test(workspaceId)) {
  throw new NodeOperationError(node, 'Select an exact SHVL workspace ID');
 }
 return encodeURIComponent(workspaceId);
}

async function requestRead(context: ReadContext, itemIndex: number, path: string): Promise<INodeExecutionData> {
 const response = await context.helpers.httpRequestWithAuthentication.call(context, 'shvlOAuth2Api', {
  method: 'GET', url: `${API}${path}`, headers: { Accept: 'application/json' }, json: true,
 });
 if (response?.error || !response || typeof response !== 'object' || Array.isArray(response)) {
  throw new NodeOperationError(context.getNode(), 'SHVL refused the read. Check workspace access, subscription and connection, then retry.', { itemIndex });
 }
 return { json: response as IDataObject, pairedItem: { item: itemIndex } };
}

async function executeLegacy(this: ReadContext): Promise<INodeExecutionData[][]> {
 const output: INodeExecutionData[] = [];
 for (let i = 0; i < this.getInputData().length; i++) {
  const operation = String(this.getNodeParameter('operation', i));
  if (operation === 'workspaces') output.push(await requestRead(this, i, '/workspaces'));
  else if (operation === 'brief') output.push(await requestRead(this, i, `/workspaces/${workspaceUrl(String(this.getNodeParameter('workspaceId', i)).trim(), this.getNode())}/credit-control/brief?limit=5`));
  else if (operation === 'health') output.push(await requestRead(this, i, `/workspaces/${workspaceUrl(String(this.getNodeParameter('workspaceId', i)).trim(), this.getNode())}/receivables/health`));
  else throw new NodeOperationError(this.getNode(), 'Unsupported SHVL operation', { itemIndex: i });
 }
 return [output];
}

async function executeCurrent(this: ReadContext): Promise<INodeExecutionData[][]> {
 const output: INodeExecutionData[] = [];
 for (let i = 0; i < this.getInputData().length; i++) {
  const resource = this.getNodeParameter('resource', i) as Resource;
  const operation = String(this.getNodeParameter('operation', i)) as Operation;
  if (resource === 'workspace' && operation === 'list') output.push(await requestRead(this, i, '/workspaces'));
  else {
   const workspace = workspaceUrl(String(this.getNodeParameter('workspaceId', i)).trim(), this.getNode());
   if (resource === 'creditControl' && operation === 'getBrief') output.push(await requestRead(this, i, `/workspaces/${workspace}/credit-control/brief?limit=5`));
   else if (resource === 'receivables' && operation === 'getHealth') output.push(await requestRead(this, i, `/workspaces/${workspace}/receivables/health`));
   else throw new NodeOperationError(this.getNode(), 'Unsupported SHVL resource or operation', { itemIndex: i });
  }
 }
 return [output];
}

class ShvlV1 implements INodeType {
 description: INodeTypeDescription = {
  displayName: 'SHVL', name: 'shvl', icon: { light: 'file:shvl.svg', dark: 'file:shvl.svg' }, group: ['transform'], version: 1,
  subtitle: '={{$parameter["operation"]}}', description: 'Read SHVL credit-control information without sending reminders', defaults: { name: 'SHVL' },
  usableAsTool: true, inputs: [NodeConnectionTypes.Main], outputs: [NodeConnectionTypes.Main],
  credentials: [{ name: 'shvlOAuth2Api', required: true }], properties: legacyProperties,
 };
 execute = executeLegacy;
}

class ShvlV2 implements INodeType {
 description: INodeTypeDescription = {
  displayName: 'SHVL', name: 'shvl', icon: { light: 'file:shvl.svg', dark: 'file:shvl.svg' }, group: ['transform'], version: 2,
  subtitle: '={{$parameter["operation"]}}', description: 'Read SHVL credit-control information without sending reminders', defaults: { name: 'SHVL' },
  usableAsTool: true, inputs: [NodeConnectionTypes.Main], outputs: [NodeConnectionTypes.Main],
  credentials: [{ name: 'shvlOAuth2Api', required: true }], properties: currentProperties,
 };
 execute = executeCurrent;
}

export class Shvl extends VersionedNodeType {
 constructor() {
  const nodeVersions: IVersionedNodeType['nodeVersions'] = { 1: new ShvlV1(), 2: new ShvlV2() };
  super(nodeVersions, baseDescription);
 }
}
