import { Prisma } from '@prisma/client';

export function isPrismaUniqueViolation(error: unknown, field?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  if (!field) return true;
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.includes(field);
  if (typeof target === 'string') return target.includes(field);
  return true;
}

/**
 * Prisma unique/constraint errors dump the whole `Invalid prisma.x()` invocation
 * into `error.message`. Testers should not see that — return a short reason.
 */
export function publicErrorMessage(error: unknown, fallback: string): string {
  if (isPrismaUniqueViolation(error, 'code')) {
    return 'Could not allocate a unique document number. Please retry the import.';
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return fallback;
  }
  if (error instanceof Error && error.message && !error.message.includes('Invalid `prisma.')) {
    return error.message;
  }
  return fallback;
}
