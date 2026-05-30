import { prisma } from '@/lib/prisma';
import {
  APP_SETTING_KEYS,
  DEFAULT_APPLICATION_SETTINGS,
  type ApplicationSettings,
} from '@/types/app-settings';

const parseBooleanValue = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};

const parseStringValue = (value: unknown, fallback: string): string => {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  return fallback;
};

type ApplicationSettingRow = {
  key: string;
  value: unknown;
};

type SettingUpsertValue = boolean | string;

const getApplicationSettingDelegate = (): {
  findMany: (args: { where: { key: { in: string[] } } }) => Promise<ApplicationSettingRow[]>;
  upsert: (args: {
    where: { key: string };
    update: { value: SettingUpsertValue };
    create: { key: string; value: SettingUpsertValue };
  }) => Promise<unknown>;
} | null => {
  const delegate = (prisma as unknown as { applicationSetting?: unknown }).applicationSetting;
  if (!delegate) return null;
  return delegate as {
    findMany: (args: { where: { key: { in: string[] } } }) => Promise<ApplicationSettingRow[]>;
    upsert: (args: {
      where: { key: string };
      update: { value: SettingUpsertValue };
      create: { key: string; value: SettingUpsertValue };
    }) => Promise<unknown>;
  };
};

const ALL_KEYS: string[] = Object.values(APP_SETTING_KEYS);

export const getApplicationSettings = async (): Promise<ApplicationSettings> => {
  const delegate = getApplicationSettingDelegate();
  if (!delegate) return DEFAULT_APPLICATION_SETTINGS;

  try {
    const rows = await delegate.findMany({ where: { key: { in: ALL_KEYS } } });
    const map = new Map(rows.map((row) => [row.key, row.value]));

    return {
      confinsUseMock: parseBooleanValue(
        map.get(APP_SETTING_KEYS.confinsUseMock),
        DEFAULT_APPLICATION_SETTINGS.confinsUseMock
      ),
      confinsMockBudgetRealJson: parseStringValue(
        map.get(APP_SETTING_KEYS.confinsMockBudgetRealJson),
        DEFAULT_APPLICATION_SETTINGS.confinsMockBudgetRealJson
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

  const writes: Promise<unknown>[] = [];

  if (typeof input.confinsUseMock === 'boolean') {
    writes.push(
      delegate.upsert({
        where: { key: APP_SETTING_KEYS.confinsUseMock },
        update: { value: input.confinsUseMock },
        create: { key: APP_SETTING_KEYS.confinsUseMock, value: input.confinsUseMock },
      })
    );
  }

  if (typeof input.confinsMockBudgetRealJson === 'string') {
    writes.push(
      delegate.upsert({
        where: { key: APP_SETTING_KEYS.confinsMockBudgetRealJson },
        update: { value: input.confinsMockBudgetRealJson },
        create: {
          key: APP_SETTING_KEYS.confinsMockBudgetRealJson,
          value: input.confinsMockBudgetRealJson,
        },
      })
    );
  }

  if (writes.length > 0) {
    try {
      await Promise.all(writes);
    } catch {
      return getApplicationSettings();
    }
  }

  return getApplicationSettings();
};
