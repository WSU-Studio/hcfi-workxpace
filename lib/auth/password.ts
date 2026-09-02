/**
 * Shared password rules for credentials accounts.
 *
 * Keep this pure (no Prisma / NextResponse) so the profile form and the
 * `/api/profile/password` handler enforce the same contract. User Management
 * create/update uses the same minimum length.
 */
export const MIN_PASSWORD_LENGTH = 6;

export type ChangePasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

export type ChangePasswordValidation =
  | { ok: true; currentPassword: string; newPassword: string }
  | { ok: false; error: string; field: ChangePasswordField };

function asPassword(raw: unknown): string {
  return typeof raw === 'string' ? raw : '';
}

export function validateChangePasswordInput(raw: {
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
}): ChangePasswordValidation {
  const currentPassword = asPassword(raw.currentPassword);
  const newPassword = asPassword(raw.newPassword);
  const confirmPassword = asPassword(raw.confirmPassword);

  if (!currentPassword) {
    return { ok: false, error: 'Current password is required', field: 'currentPassword' };
  }
  if (!newPassword) {
    return { ok: false, error: 'New password is required', field: 'newPassword' };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      field: 'newPassword',
    };
  }
  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      error: 'New password and confirmation do not match',
      field: 'confirmPassword',
    };
  }
  if (newPassword === currentPassword) {
    return {
      ok: false,
      error: 'New password must be different from the current password',
      field: 'newPassword',
    };
  }
  return { ok: true, currentPassword, newPassword };
}
