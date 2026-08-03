type PreferenceLanguage = "en" | "sw";
type PreferenceAppearance = "system" | "light" | "dark";
type PreferenceDateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
type PreferenceTimeFormat = "12h" | "24h";

type UserPreferences = {
  language: PreferenceLanguage;
  appearance: PreferenceAppearance;
  timezone: string;
  date_format: PreferenceDateFormat;
  time_format: PreferenceTimeFormat;
  reduced_motion: boolean;
};

type UserPreferenceUpdate = Partial<UserPreferences>;

export type {
  PreferenceAppearance,
  PreferenceDateFormat,
  PreferenceLanguage,
  PreferenceTimeFormat,
  UserPreferences,
  UserPreferenceUpdate,
};
