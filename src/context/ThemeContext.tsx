import React, { createContext, useContext } from 'react';
import { PurpleThemeLight, PurpleThemeDark } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ThemeColors = typeof PurpleThemeLight;

const ThemeContext = createContext<ThemeColors>(PurpleThemeLight);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? PurpleThemeDark : PurpleThemeLight;
  return (
    <ThemeContext.Provider value={colors}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeColors {
  const ctx = useContext(ThemeContext);
  return ctx ?? PurpleThemeLight;
}
