export const APP_SETTING_KEYS = {
  confinsUseMock: 'confinsUseMock',
  /**
   * JSON string berisi array `ReturnObject` payload dari endpoint Confins
   * `GetListGetListBudgetRealBySourceTypeX`. Dipakai saat mock API aktif.
   *
   * - Disimpan sebagai string supaya editor di Settings (textarea) bisa
   *   menampilkan format-an apa adanya.
   * - Kalau kosong / invalid, sistem fallback ke fixture bundled di
   *   `lib/integrations/confins/fixtures/budget-real-egl-sample.json`.
   */
  confinsMockBudgetRealJson: 'confinsMockBudgetRealJson',
} as const;

export type AppSettingKey = (typeof APP_SETTING_KEYS)[keyof typeof APP_SETTING_KEYS];

export type ApplicationSettings = {
  confinsUseMock: boolean;
  /** String JSON (pretty-printed). Kosong = pakai fixture bundled. */
  confinsMockBudgetRealJson: string;
};

export const DEFAULT_APPLICATION_SETTINGS: ApplicationSettings = {
  confinsUseMock: false,
  confinsMockBudgetRealJson: '',
};

/** Batas ukuran JSON mock yang boleh disimpan ke settings (cegah abuse storage). */
export const MOCK_JSON_MAX_BYTES = 512 * 1024; // 512 KB
