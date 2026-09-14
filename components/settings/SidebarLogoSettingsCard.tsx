'use client';

import LogoUploadField from '@/components/settings/LogoUploadField';

export type SidebarLogoSettingsCardProps = {
  expandedLogoUrl: string;
  collapsedLogoUrl: string;
  onExpandedLogoChange: (url: string) => void;
  onCollapsedLogoChange: (url: string) => void;
  disabled?: boolean;
};

/**
 * Branding section for Application Settings — same role as SiteSettings on
 * the credit-sims admin page: persist optional overrides, empty = product default.
 */
export default function SidebarLogoSettingsCard({
  expandedLogoUrl,
  collapsedLogoUrl,
  onExpandedLogoChange,
  onCollapsedLogoChange,
  disabled = false,
}: SidebarLogoSettingsCardProps) {
  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="border-b border-gray-200 pb-2">
        <h2 className="text-base font-semibold text-gray-900">Sidebar Logo</h2>
        <p className="mt-1 text-sm text-gray-600">
          Upload custom logos for the sidebar. Leave empty to keep the default Workxpace logo.
          PNG, JPG, WebP, or SVG, max 2MB.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <LogoUploadField
          label="Expanded sidebar"
          description="Shown when the sidebar is open."
          value={expandedLogoUrl}
          fallbackSrc="/workxpace-full-logo.svg"
          onChange={onExpandedLogoChange}
          disabled={disabled}
        />
        <LogoUploadField
          label="Collapsed sidebar"
          description="Shown when the sidebar is collapsed to icons."
          value={collapsedLogoUrl}
          fallbackSrc="/workxpace-logo.svg"
          onChange={onCollapsedLogoChange}
          disabled={disabled}
        />
      </div>
    </section>
  );
}
