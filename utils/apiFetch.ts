// utils/apiFetch.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://myappserve-go.onrender.com';

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  // 1) Leer token guardado
  const rawToken = await AsyncStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (rawToken) {
    headers['Authorization'] = `Bearer ${rawToken}`;
  }

  // 2) Combinar con posibles headers que ya venían en options
  const mergedHeaders = {
    ...(options.headers as Record<string, string>),
    ...headers,
  };

  // 3) Llamar a fetch sobre la URL base + path
  return fetch(API_URL + path, {
    ...options,
    headers: mergedHeaders,
  });
}
