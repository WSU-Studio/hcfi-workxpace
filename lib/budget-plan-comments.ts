/** Token inserted into comment bodies when a user picks an @mention. */
export const MENTION_TOKEN_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g;

export function serializeMention(displayName: string, userId: string): string {
  return `@[${displayName}](${userId})`;
}

/** Replace mention tokens with `@Display Name` for UI rendering. */
export function formatCommentBodyForDisplay(body: string): string {
  return body.replace(MENTION_TOKEN_PATTERN, (_match, displayName: string) => `@${displayName}`);
}

export function parseMentionUserIds(body: string): string[] {
  const ids = new Set<string>();
  for (const match of body.matchAll(MENTION_TOKEN_PATTERN)) {
    const userId = match[2]?.trim();
    if (userId) ids.add(userId);
  }
  return Array.from(ids);
}

export function formatCommentDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', '');
}
