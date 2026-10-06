import React, { createContext, useContext } from 'react';
import { lightTheme, type Theme } from '../constants/theme';

const ThemeContext = createContext<Theme>(lightTheme);

/** The redesigned customer experience is intentionally light-only. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={lightTheme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
