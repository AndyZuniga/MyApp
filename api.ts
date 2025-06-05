// api.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function apiFetch(path: string, options: RequestInit = {}) {
  // 1) Leer token desde AsyncStorage
  const token = await AsyncStorage.getItem('token');

  // 2) Encabezados por defecto con JSON y, si existe token, Authorization
  const headers: Record<string,string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string,string>) || {})
  };

  // 3) Llamar a la ruta completa (ajusta la URL base a tu backend)
  const response = await fetch(`https://myappserve-go.onrender.com${path}`, {
    ...options,
    headers,
  });

  return response;
}
