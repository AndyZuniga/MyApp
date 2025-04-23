import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import LinkingHandler from '../components/LinkingHandler'; // 🔴 Se importa el handler de deep links

import { useColorScheme } from '@/hooks/useColorScheme';

// 🔴 Impedir auto-hide del splash hasta cargar assets
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync(); // 🔴 Ocultar splash al cargar fuentes
    }
  }, [loaded]);

  if (!loaded) {
    return null; // 🔴 Mantener splash hasta que carguen fuentes
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* 🔴 Único LinkingHandler fuera del Stack para capturar deep links */}
      <LinkingHandler />   
      <Stack>
        {/* 📌 Pantallas definidas en rutas */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" /> {/* 🔴 CAMBIO: corregido syntax con equals y comillas */}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
