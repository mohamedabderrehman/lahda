import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSettings } from '../api/client';

type AppSettings = {
  appLogoUrl: string | null;
  appNameAr: string;
  appNameEn: string;
};

const defaultSettings: AppSettings = {
  appLogoUrl: null,
  appNameAr: 'لحظة',
  appNameEn: 'Lahda',
};

const AppSettingsContext = createContext<AppSettings>(defaultSettings);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    getSettings()
      .then((res) => {
        setSettings({
          appLogoUrl: res.appLogoUrl ?? null,
          appNameAr: res.appNameAr ?? 'لحظة',
          appNameEn: res.appNameEn ?? 'Lahda',
        });
      })
      .catch(() => {});
  }, []);

  return (
    <AppSettingsContext.Provider value={settings}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
