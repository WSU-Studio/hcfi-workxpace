import AzureADProvider from 'next-auth/providers/azure-ad';

type AzureAdProviderConfig = ReturnType<typeof AzureADProvider>;

/**
 * Build a configured Azure AD (Microsoft Entra ID) provider, or `null` when
 * the required environment variables are not set.
 *
 * Returning `null` instead of throwing keeps local development friction-free:
 * a developer without Entra credentials can still log in with the Credentials
 * provider, while production deployments fail fast at boot if the env vars
 * are missing (validated separately by the deployment pipeline).
 *
 * Required environment variables:
 *   - AZURE_APPLICATION_ID  (Application/Client ID from App Registration)
 *   - AZURE_TENANT_ID       (Directory/Tenant ID — single-tenant restricts
 *                            sign-in to one Entra tenant)
 *   - AZURE_CLIENT_SECRET   (Confidential client secret, NEVER expose)
 *
 * Provider ID is left at its default (`azure-ad`) on purpose: the redirect
 * URI registered with HCFI is `/api/auth/callback/azure-ad`. Renaming the
 * provider here would silently break the callback round-trip.
 */
export function createAzureAdProvider(): AzureAdProviderConfig | null {
  const clientId = process.env.AZURE_APPLICATION_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const tenantId = process.env.AZURE_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) return null;

  return AzureADProvider({
    clientId,
    clientSecret,
    tenantId,
    authorization: {
      params: {
        scope: 'openid profile email offline_access User.Read',
      },
    },
  });
}

/**
 * True when SSO is configured for this runtime. Drives conditional UI such
 * as showing/hiding the "Sign in with Microsoft" button on the login page.
 *
 * Exposed via a public env mirror because the login page is a client
 * component and cannot read server-only env vars at render time.
 */
export const isAzureAdSsoEnabled = (): boolean => {
  return Boolean(
    process.env.AZURE_APPLICATION_ID &&
      process.env.AZURE_CLIENT_SECRET &&
      process.env.AZURE_TENANT_ID,
  );
};
