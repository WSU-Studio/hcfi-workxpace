'use client';

import { useEffect, useState } from 'react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import SettingToggleCard from '@/components/settings/SettingToggleCard';
import type { ApplicationSettings } from '@/types/app-settings';

const defaultSettings: ApplicationSettings = {
  confinsUseMock: false,
};

type MessageState = {
  type: 'success' | 'error';
  text: string;
} | null;

export default function SettingsPage() {
  const [settings, setSettings] = useState<ApplicationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/application-settings');
        if (!response.ok) throw new Error('Failed to fetch settings');
        const data = (await response.json()) as { settings?: ApplicationSettings };
        setSettings(data.settings ?? defaultSettings);
      } catch {
        setMessage({ type: 'error', text: 'Failed to load application settings.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const saveSettings = async () => {
    try {
      setMessage(null);
      setIsSaving(true);
      const response = await fetch('/api/application-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = (await response.json()) as { settings?: ApplicationSettings; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to save settings');
      }
      setSettings(data.settings ?? settings);
      setMessage({ type: 'success', text: 'Application settings saved successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Loading application settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Application Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage global application behavior across modules.
        </p>
      </div>

      {message && (
        <div
          className={
            message.type === 'success'
              ? 'rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800'
              : 'rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
          }
        >
          {message.text}
        </div>
      )}

      <SettingToggleCard
        title="Activate Mock API"
        description="When enabled, CONFINS integration reads mock data instead of external API. Suitable for testing or development fallback."
        enabled={settings.confinsUseMock}
        onChange={(value) => setSettings((prev) => ({ ...prev, confinsUseMock: value }))}
        disabled={isSaving}
      />

      <div>
        <button
          type="button"
          onClick={saveSettings}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconDeviceFloppy size={18} />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
