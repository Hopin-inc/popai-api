import msal, { ConfidentialClientApplication } from '@azure/msal-node';
import path from 'path';
import dotenv from 'dotenv';

// Load env file
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Configuration object to be passed to MSAL instance on creation.
 * For a full list of MSAL Node configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/configuration.md
 */
const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    authority: process.env.MICROSOFT_AAD_ENDPOINT + '/' + process.env.MICROSOFT_TENANT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  },
};

/**
 * With client credentials flows permissions need to be granted in the portal by a tenant administrator.
 * The scope is always in the format '<resource>/.default'. For more, visit:
 * https://learn.microsoft.com/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow
 */
export const tokenRequest = {
  scopes: [process.env.MICROSOFT_GRAPH_API_ENDPOINT + '/.default'],
};

/**
 * Initialize a confidential client application. For more info, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/initialize-confidential-client-application.md
 */
const cca = new ConfidentialClientApplication(msalConfig);

/**
 * Acquires token with client credentials.
 * @param {object} tokenRequest
 */
export async function getToken(tokenRequest) {
  return await cca.acquireTokenByClientCredential(tokenRequest);
}

export const refreshTokenRequest = {
  refreshToken: '', // your previous refresh token here
  scopes: [process.env.MICROSOFT_GRAPH_API_ENDPOINT + '/.default'],
  forceCache: true,
};

/**
 * Acquires token with client credentials.
 * @param {object} refreshTokenRequest
 */
export async function getRefreshToken(refreshTokenRequest) {
  return await cca.acquireTokenByRefreshToken(refreshTokenRequest);
}
