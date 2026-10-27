import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ShvlOAuth2Api implements ICredentialType {
	name = 'shvlOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'SHVL OAuth2 API';
	icon = { light: 'file:shvl.svg', dark: 'file:shvl.svg' } as const;
	documentationUrl = 'https://shvl.app/cli';
	properties: INodeProperties[] = [
		{ displayName: 'Grant Type', name: 'grantType', type: 'hidden', default: 'pkce' },
		{ displayName: 'Authorization URL', name: 'authUrl', type: 'hidden', default: 'https://aywqulzuzeblmfwstldr.supabase.co/auth/v1/oauth/authorize' },
		{ displayName: 'Access Token URL', name: 'accessTokenUrl', type: 'hidden', default: 'https://aywqulzuzeblmfwstldr.supabase.co/auth/v1/oauth/token' },
		{ displayName: 'Client Secret', name: 'clientSecret', type: 'hidden', typeOptions: { password: true }, default: '' },
		{ displayName: 'Scope', name: 'scope', type: 'hidden', default: 'openid profile email' },
		{ displayName: 'Auth URI Query Parameters', name: 'authQueryParameters', type: 'hidden', default: 'resource=https%3A%2F%2Fshvl.app%2Fmcp%2Fagent%2Fv1' },
		{ displayName: 'Authentication', name: 'authentication', type: 'hidden', default: 'body' },
	];
}
