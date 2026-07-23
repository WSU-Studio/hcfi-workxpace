'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

/**
 * One-shot session refresh on mount so Access Control / department edits from
 * the DB appear without requiring logout → login.
 *
 * Guarded by a ref so `update()` never re-enters (avoids /api/auth/session loops).
 */
export function useRefreshSessionAccessOnce() {
  const { update, status } = useSession();
  const didRefresh = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || didRefresh.current) return;
    didRefresh.current = true;
    void update();
  }, [status, update]);
}
