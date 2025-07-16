import { AuthenticationError } from "../errors/authError.js";
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

interface AuthProvider {
  getAccessToken: () => Promise<string>;
}

/**
 * Interface for authentication configuration
 * Only requires an access token for authentication
 */
export interface AuthConfig {
  /**
   * Access token obtained through OAuth 2.0 authentication
   */
  accessToken: string;
  
  /**
   * (Optional) Token expiration time in milliseconds since epoch
   * If not provided, token will be treated as valid
   */
  expiresIn?: number;
}

/**
 * Validates the authentication configuration
 * @param config Authentication configuration
 * @throws {AuthenticationError} If access token is missing
 */
function validateAuthConfig(config: Partial<AuthConfig>): void {
  if (!config.accessToken) {
    throw new AuthenticationError(
      'MISSING_ACCESS_TOKEN',
      'Access Token Required',
      'An access token is required for authentication. Please provide a valid access token.'
    );
  }
}

/**
 * Gets an authenticated token for Microsoft Graph API
 * @param config Authentication configuration
 * @returns Promise<string> Access token
 */
export async function authenticate(config: AuthConfig): Promise<string> {
  try {
    validateAuthConfig(config);
    
    // Check if token is expired
    if (config.expiresIn && Date.now() >= config.expiresIn - 300000) {
      throw new AuthenticationError(
        'TOKEN_EXPIRED',
        'Access Token Expired',
        'The provided access token has expired. Please obtain a new token and try again.'
      );
    }
    
    return config.accessToken;
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    throw new AuthenticationError(
      'AUTHENTICATION_FAILED',
      'Authentication Failed',
      `Failed to authenticate with Microsoft Graph: ${errorMessage}`,
      { originalError: errorMessage }
    );
  }
}

/**
 * Extracts the user ID from a JWT token
 * @param token The JWT access token
 * @returns The user ID (oid or sub claim) or an empty string if not found
 */
export function getUserIdFromToken(token: string): string {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
    return decoded.oid || decoded.sub || '';
  } catch (error) {
    console.error('Error decoding token:', error);
    return '';
  }
}

/**
 * Creates and returns a Microsoft Graph client instance
 * @param accessToken The access token for authentication
 * @returns An initialized Microsoft Graph client
 */
export function getGraphClient(accessToken: string) {
  // For v3.x of @microsoft/microsoft-graph-client, we need to use the authProvider as a function
  return Client.init({
    authProvider: (done: (error: Error | null, accessToken?: string) => void) => {
      // Call the done callback with the access token
      done(null, accessToken);
    }
  });
}

export default {
  authenticate,
  getUserIdFromToken,
  getGraphClient
};
