// MyApp/utils/apiFetch.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://myappserve-go.onrender.com';

/**
 * apiFetch: igual que fetch(), pero añade automáticamente el header
 * Authorization: Bearer <token> si existe un token guardado en AsyncStorage.
 *
 * @param endpoint - la ruta en el backend, p. ej. '/notifications'
 * @param options  - las mismas opciones que pasarías a fetch (method, body, etc.)
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  // 1) Obtenemos el token guardado en AsyncStorage
  const token = await AsyncStorage.getItem('token');

  // 2) Preparamos encabezados: siempre JSON
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // 3) Si hay token, lo agregamos
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 4) Ejecutamos la petición real a API
  return fetch(API_URL + endpoint, {
    ...options,
    headers,
  });
}
