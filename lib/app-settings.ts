import { prisma } from '@/lib/prisma';
import { APP_SETTING_KEYS, DEFAULT_APPLICATION_SETTINGS, type ApplicationSettings } from '@/types/app-settings';

const parseBooleanValue = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};

type ApplicationSettingRow = {
  key: string;
  value: unknown;
};

const getApplicationSettingDelegate = (): {
  findMany: (args: { where: { key: { in: string[] } } }) => Promise<ApplicationSettingRow[]>;
  upsert: (args: {
    where: { key: string };
    update: { value: boolean };
    create: { key: string; value: boolean };
  }) => Promise<unknown>;
} | null => {
  const delegate = (prisma as unknown as { applicationSetting?: unknown }).applicationSetting;
  if (!delegate) return null;
  return delegate as {
    findMany: (args: { where: { key: { in: string[] } } }) => Promise<ApplicationSettingRow[]>;
    upsert: (args: {
      where: { key: string };
      update: { value: boolean };
      create: { key: string; value: boolean };
    }) => Promise<unknown>;
  };
};

export const getApplicationSettings = async (): Promise<ApplicationSettings> => {
  const delegate = getApplicationSettingDelegate();
  if (!delegate) return DEFAULT_APPLICATION_SETTINGS;

  try {
    const rows = await delegate.findMany({
      where: { key: { in: [APP_SETTING_KEYS.confinsUseMock] } },
    });

    const map = new Map(rows.map((row) => [row.key, row.value]));

    return {
      confinsUseMock: parseBooleanValue(
        map.get(APP_SETTING_KEYS.confinsUseMock),
        DEFAULT_APPLICATION_SETTINGS.confinsUseMock
      ),
    };
  } catch {
    return DEFAULT_APPLICATION_SETTINGS;
  }
};

export const updateApplicationSettings = async (
  input: Partial<ApplicationSettings>
): Promise<ApplicationSettings> => {
  const delegate = getApplicationSettingDelegate();
  if (!delegate) return DEFAULT_APPLICATION_SETTINGS;

  if (typeof input.confinsUseMock === 'boolean') {
    try {
      await delegate.upsert({
        where: { key: APP_SETTING_KEYS.confinsUseMock },
        update: { value: input.confinsUseMock },
        create: { key: APP_SETTING_KEYS.confinsUseMock, value: input.confinsUseMock },
      });
    } catch {
      return DEFAULT_APPLICATION_SETTINGS;
    }
  }

  return getApplicationSettings();
};
