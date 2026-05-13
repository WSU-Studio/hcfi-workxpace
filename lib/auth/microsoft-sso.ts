/**
 * Entra (Azure AD) OIDC — nilai ini didaftarkan di App registration mereka,
 * lalu diisi ke environment server (bukan NEXT_PUBLIC_* kecuali memang perlu).
 *
 * - AZURE_AD_TENANT_ID     → Directory (tenant) ID
 * - AZURE_AD_CLIENT_ID     → Application (client) ID
 * - AZURE_AD_CLIENT_SECRET → Client secret (rahasia, server-only)
 *
 * Redirect URI yang mereka daftarkan harus persis:
 *   {NEXTAUTH_URL}/api/auth/callback/azure-ad
 */
export function isMicrosoftEntraSsoConfigured(): boolean {
  return Boolean(
    process.env.AZURE_AD_TENANT_ID?.trim() &&
      process.env.AZURE_AD_CLIENT_ID?.trim() &&
      process.env.AZURE_AD_CLIENT_SECRET?.trim(),
  );
}

/** Claim dari Entra yang dipakai untuk cocokkan ke kolom `User.email` di Prisma */
export function emailFromAzureProfile(profile: unknown): string | null {
  if (!profile || typeof profile !== 'object') return null;
  const p = profile as Record<string, unknown>;
  if (typeof p.email === 'string' && p.email.trim()) return p.email.trim();
  if (typeof p.preferred_username === 'string' && p.preferred_username.trim()) {
    return p.preferred_username.trim();
  }
  return null;
}
