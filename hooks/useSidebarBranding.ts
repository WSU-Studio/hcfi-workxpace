'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_APPLICATION_SETTINGS } from '@/types/app-settings';

export type SidebarBranding = {
  expandedLogoUrl: string;
  collapsedLogoUrl: string;
};

export function useSidebarBranding(): SidebarBranding {
  const [branding, setBranding] = useState<SidebarBranding>({
    expandedLogoUrl: DEFAULT_APPLICATION_SETTINGS.sidebarLogoUrl,
    collapsedLogoUrl: DEFAULT_APPLICATION_SETTINGS.sidebarLogoCollapsedUrl,
  });

  useEffect(() => {
    fetch('/api/application-settings', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (data: {
          settings?: { sidebarLogoUrl?: string; sidebarLogoCollapsedUrl?: string };
        } | null) => {
          setBranding({
            expandedLogoUrl: data?.settings?.sidebarLogoUrl?.trim() ?? '',
            collapsedLogoUrl: data?.settings?.sidebarLogoCollapsedUrl?.trim() ?? '',
          });
        },
      )
      .catch(() => {});
  }, []);

  return branding;
}
