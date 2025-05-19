// File: app/_layout.tsx

import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import LinkingHandler from '../components/LinkingHandler'; // 🔴 handler de deep links
import { useColorScheme } from '@/hooks/useColorScheme';

// 🔴 Evita que el splash se oculte antes de cargar fuentes
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync(); // 🔴 ocultar splash tras cargar
    }
  }, [loaded]);

  if (!loaded) {
    return null; // 🔴 mantén splash hasta que carguen las fuentes
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LinkingHandler />  

      {/* 🔴 APLICAR screenOptions A TODO el Stack para ocultar cabeceras */}
      <Stack screenOptions={{ headerShown: false }}>
        {/* ahora ya no se mostrará "(tabs)/home" ni ningún título de cabecera */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
