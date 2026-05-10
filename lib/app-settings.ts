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

export const getApplicationSettings = async (): Promise<ApplicationSettings> => {
  const rows = await prisma.applicationSetting.findMany({
    where: { key: { in: [APP_SETTING_KEYS.confinsUseMock] } },
  });

  const map = new Map(rows.map((row) => [row.key, row.value]));

  return {
    confinsUseMock: parseBooleanValue(map.get(APP_SETTING_KEYS.confinsUseMock), DEFAULT_APPLICATION_SETTINGS.confinsUseMock),
  };
};

export const updateApplicationSettings = async (
  input: Partial<ApplicationSettings>
): Promise<ApplicationSettings> => {
  if (typeof input.confinsUseMock === 'boolean') {
    await prisma.applicationSetting.upsert({
      where: { key: APP_SETTING_KEYS.confinsUseMock },
      update: { value: input.confinsUseMock },
      create: { key: APP_SETTING_KEYS.confinsUseMock, value: input.confinsUseMock },
    });
  }

  return getApplicationSettings();
};
