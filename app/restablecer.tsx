import React, { useState, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons'; // 🔴 CAMBIO: importar iconos para eye

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const colorScheme = useColorScheme(); // 🔴 CAMBIO: detectar esquema de color
  const isDarkMode = colorScheme === 'dark';
  const styles = getStyles(isDarkMode);

  const [token, setToken] = useState<string>(params.token as string || '');
  const [correoUsuario, setCorreoUsuario] = useState<string>(params.correo as string || '');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // 🔴 CAMBIO: estado para mostrar/ocultar contraseña
  const [errorPassword, setErrorPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        const data = Linking.parse(url);
        if (data.hostname === 'restablecer') {
          if (data.queryParams?.token) setToken(data.queryParams.token as string);
          if (data.queryParams?.correo) setCorreoUsuario(data.queryParams.correo as string);
        }
      }
    })();
  }, []);

  const validarPassword = () => /^(?=.*[A-Z]).{8,}$/.test(nuevaPassword);

  const enviarReset = async () => {
    if (!token) {
      Alert.alert('Error', 'Token de restablecimiento no encontrado');
      return;
    }
    if (!validarPassword()) {
      setErrorPassword('La contraseña debe tener al menos 8 caracteres y 1 mayúscula');
      return;
    }
    setErrorPassword('');
    setLoading(true);
    try {
      const res = await fetch('https://myappserve-go.onrender.com/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nuevaPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al restablecer contraseña');
      Alert.alert('Éxito', 'Contraseña restablecida correctamente');
      setNuevaPassword(''); // 🔴 CAMBIO: limpiar campo
      router.replace('/login'); // 🔴 CAMBIO: redirigir a login
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Restablecer Contraseña</Text>

        {correoUsuario !== '' && (
          <Text style={styles.emailText}>Correo: {correoUsuario}</Text>
        )}

        <View style={styles.passwordContainer}> {/* 🔴 contenedor con dinámico */}
          <TextInput
            style={styles.passwordInput}
            placeholder="Nueva contraseña"
            placeholderTextColor={isDarkMode ? '#aaa' : '#999'} // 🔴 placeholder adaptativo
            secureTextEntry={!showPassword}
            value={nuevaPassword}
            onChangeText={(text) => { setNuevaPassword(text); if (errorPassword) setErrorPassword(''); }}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(prev => !prev)}
            style={styles.eyeButton}
          >
            <Ionicons
              name={showPassword ? 'eye' : 'eye-off'}
              size={24}
              color={isDarkMode ? '#fff' : '#000'} // 🔴 icono adaptativo
            />
          </TouchableOpacity>
        </View>
        {errorPassword !== '' && (
          <Text style={styles.errorText}>{errorPassword}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, (loading || nuevaPassword==='') && styles.buttonDisabled]}
          onPress={enviarReset}
          disabled={loading || nuevaPassword===''}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Confirmar</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: isDarkMode ? '#121212' : '#fff', // 🔴 fondo adaptativo
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
    color: isDarkMode ? '#fff' : '#6A0DAD', // 🔴 color adaptativo
  },
  emailText: {
    width: '100%',
    fontSize: 16,
    color: isDarkMode ? '#fff' : '#333', // 🔴 adaptativo
    marginBottom: 12,
    textAlign: 'left',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: isDarkMode ? '#333' : '#ccc', // 🔴 adaptativo
    backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', // 🔴 adaptativo
    borderRadius: 6,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: isDarkMode ? '#fff' : '#000', // 🔴 adaptativo
  },
  eyeButton: {
    padding: 4,
  },
  button: {
    width: '100%',
    backgroundColor: '#6A0DAD',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
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
