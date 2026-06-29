'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_APPLICATION_SETTINGS } from '@/types/app-settings';

export function useEnableDocumentDownload(): boolean {
  const [enabled, setEnabled] = useState(DEFAULT_APPLICATION_SETTINGS.enableDocumentDownload);

  useEffect(() => {
    fetch('/api/application-settings', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { settings?: { enableDocumentDownload?: boolean } } | null) => {
        if (typeof data?.settings?.enableDocumentDownload === 'boolean') {
          setEnabled(data.settings.enableDocumentDownload);
        }
      })
      .catch(() => {});
  }, []);

  return enabled;
}
