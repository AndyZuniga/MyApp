import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getStyles(isDarkMode);

  // 🟣 Estado para los campos y mensajes
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  // 🟢 Función que llama a tu API
  const iniciarSesion = async () => {
    if (!correo || !password) {
      Alert.alert('Error', 'Por favor, completa todos los campos.');
      return;
    }

    try {
      setCargando(true);
      const response = await fetch('https://myappserve-go.onrender.com/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ correo, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // 🔒 Aquí podrías guardar datos del usuario en contexto o asyncStorage
      console.log('Usuario:', data.usuario);

      // 🔁 Redirige al home o pantalla principal
      Alert.alert('Bienvenido', `Hola, ${data.usuario.apodo}`);
      router.replace('/home'); // Asegúrate de tener esa ruta

    } catch (error: any) {
      Alert.alert('Error de inicio de sesión', error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">

        <Text style={styles.title}>Iniciar Sesión</Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
          keyboardType="email-address"
          autoCapitalize="none"
          value={correo} // 🟣 Enlazado al estado
          onChangeText={setCorreo}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
          secureTextEntry
          value={password} // 🟣 Enlazado al estado
          onChangeText={setPassword}
        />

        <View style={styles.forgotContainer}>
          <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={iniciarSesion}
          disabled={cargando}>
          <Text style={styles.loginText}>
            {cargando ? 'Cargando...' : 'Iniciar Sesión'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/register')}>
          <Text style={styles.registerText}>Registrarse</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      padding: 24,
      paddingTop: 80,
      backgroundColor: isDarkMode ? '#121212' : '#fff',
      alignItems: 'center',
      minHeight: Dimensions.get('window').height,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      marginBottom: 40,
      color: isDarkMode ? '#fff' : '#6A0DAD',
    },
    input: {
      width: '100%',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333' : '#ccc',
      backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
      color: isDarkMode ? '#fff' : '#000',
      borderRadius: 6,
      padding: 12,
      marginBottom: 16,
      fontSize: 16,
    },
    forgotContainer: {
      width: '100%',
      alignItems: 'flex-end',
      marginBottom: 32,
    },
    forgotText: {
      fontSize: 14,
      color: isDarkMode ? '#aaa' : '#999',
    },
    loginButton: {
      width: '100%',
      backgroundColor: '#6A0DAD',
      paddingVertical: 14,
      borderRadius: 6,
      alignItems: 'center',
      marginBottom: 16,
    },
    loginText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
    registerButton: {
      width: '100%',
      borderColor: '#6A0DAD',
      borderWidth: 1.5,
      borderRadius: 6,
      paddingVertical: 14,
      alignItems: 'center',
    },
    registerText: {
      color: '#6A0DAD',
      fontWeight: '600',
      fontSize: 16,
    },
  });
