/**
 * Validation rules for the `code` field on `ApprovalSchema`.
 *
 * Shared between the POST and PUT handlers (and the seed script) so the
 * server enforces a single, consistent contract:
 *
 *   - non-empty after trim
 *   - <= 64 characters (DB has no max, but we cap to keep the UI sane and
 *     ensure the value fits in Excel cells without truncation)
 *   - only [A-Z, 0-9, dash, underscore, dot] — no whitespace or special
 *     characters that could be mangled by spreadsheets, URL encoders, or
 *     bulk-import parsers
 *   - normalized to upper case so case differences cannot create
 *     near-duplicates (`BP-Primary` vs `bp-primary`)
 *
 * Keeping this pure (no Prisma / no `NextResponse`) makes it trivially
 * unit-testable and safe to reuse on the client for inline validation if we
 * ever want to.
 */

const CODE_PATTERN = /^[A-Za-z0-9._-]+$/;
const MAX_CODE_LENGTH = 64;

export type ApprovalSchemaCodeValidation =
  | { ok: true; code: string }
  | { ok: false; error: string };

export function validateApprovalSchemaCode(
  raw: unknown,
): ApprovalSchemaCodeValidation {
  const code = typeof raw === 'string' ? raw.trim() : '';
  if (!code) return { ok: false, error: 'Code is required' };
  if (code.length > MAX_CODE_LENGTH) {
    return { ok: false, error: `Code must be at most ${MAX_CODE_LENGTH} characters` };
  }
  if (!CODE_PATTERN.test(code)) {
    return {
      ok: false,
      error: 'Code may only contain letters, digits, dash, underscore, and dot',
    };
  }
  return { ok: true, code: code.toUpperCase() };
}
