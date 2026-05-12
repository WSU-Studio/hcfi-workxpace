export const APP_SETTING_KEYS = {
  confinsUseMock: 'confinsUseMock',
} as const;

export type AppSettingKey = (typeof APP_SETTING_KEYS)[keyof typeof APP_SETTING_KEYS];

export type ApplicationSettings = {
  confinsUseMock: boolean;
};

export const DEFAULT_APPLICATION_SETTINGS: ApplicationSettings = {
  confinsUseMock: false,
};
