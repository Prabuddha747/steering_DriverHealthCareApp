import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { PurpleThemeLight, PurpleThemeDark } from '@/constants/theme';
import { AuthProvider } from '@/src/context/AuthContext';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/src/context/ThemeContext';

const PurpleLightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: PurpleThemeLight.primary,
    background: PurpleThemeLight.background,
    card: PurpleThemeLight.surface,
    text: PurpleThemeLight.text,
    border: PurpleThemeLight.border,
    notification: PurpleThemeLight.primary,
  },
};

const PurpleDarkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: PurpleThemeDark.primary,
    background: PurpleThemeDark.background,
    card: PurpleThemeDark.surface,
    text: PurpleThemeDark.text,
    border: PurpleThemeDark.border,
    notification: PurpleThemeDark.primary,
  },
};

function NavThemeWrapper({ children }: { children: React.ReactNode }) {
  const colors = useAppTheme();
  const isDark = colors.background === PurpleThemeDark.background;
  return (
    <ThemeProvider value={isDark ? PurpleDarkNavTheme : PurpleLightNavTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AuthProvider>
          <NavThemeWrapper>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="intro" />
              <Stack.Screen name="login" />
              <Stack.Screen name="waiting" />
              <Stack.Screen name="(driver)" options={{ headerShown: false }} />
              <Stack.Screen name="(admin)" options={{ headerShown: false }} />
            </Stack>
          </NavThemeWrapper>
        </AuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
