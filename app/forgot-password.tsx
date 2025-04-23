import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme, // 🔴 CAMBIO: importar hook para modo oscuro
} from 'react-native';
import { useRouter } from 'expo-router';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme(); // 🔴 CAMBIO: detectar esquema
  const isDarkMode = colorScheme === 'dark';

  const [correo, setCorreo] = useState('');
  const [errorCorreo, setErrorCorreo] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔴 CAMBIO: función para solicitar enlace de restablecimiento
  const solicitarReset = async () => {
    if (!correo) {
      setErrorCorreo('El correo es obligatorio');
      return;
    }
    setErrorCorreo('');
    setLoading(true);
    try {
      const res = await fetch('https://myappserve-go.onrender.com/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al solicitar enlace');
      }
      Alert.alert('Enviado', 'Revisa tu correo para restablecer la contraseña'); // 🔴 CAMBIO: claro mensaje de éxito
      setCorreo(''); // 🔴 CAMBIO: limpiar campo tras éxito
      router.back(); // opcional: regresar al login o ruta anterior
    } catch (err: any) { // 🔴 CAMBIO: tipar err para acceder a .message
      Alert.alert('Error', err.message || 'Error al solicitar enlace'); // 🔴 CAMBIO: mostrar error
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#fff' }} // 🔴 CAMBIO: fondo adaptativo
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#fff' }]} // 🔴 CAMBIO: fondo adaptativo
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#6A0DAD' }]}>Recuperar Contraseña</Text> {/* 🔴 CAMBIO: color adaptativo */}

        <TextInput
          style={[styles.input, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', color: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? '#333' : '#ccc' }]} // 🔴 CAMBIO: estilos dinámicos
          placeholder="Correo electrónico"
          placeholderTextColor={isDarkMode ? '#aaa' : '#999'} // 🔴 CAMBIO: placeholder adaptativo
          keyboardType="email-address"
          autoCapitalize="none"
          value={correo}
          onChangeText={(text) => {
            setCorreo(text);
            if (errorCorreo) setErrorCorreo(''); // 🔴 limpiar error al escribir
          }}
        />
        {errorCorreo !== '' && (
          <Text style={styles.errorText}>{errorCorreo}</Text> // errorText color fijo está bien
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#6A0DAD' }]} // 👍 mantiene color fijo
          onPress={solicitarReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Enviar enlace</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 40,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    alignSelf: 'flex-start',
    marginTop: -12,
    marginBottom: 8,
  },
});
