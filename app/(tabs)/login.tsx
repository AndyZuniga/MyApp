import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage'; // 🔴 CAMBIO: seguimos importando AsyncStorage
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getStyles(isDarkMode);

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 🔴 CAMBIO: al montar, comprueba si hay sesión guardada (usuario + token)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const rawUser = await AsyncStorage.getItem('user');
        const storedToken = await AsyncStorage.getItem('token');
        if (rawUser && storedToken) {
          // Si hay usuario + token, navegamos directo a Home
          router.replace({
            pathname: '/home',
            params: { usuario: rawUser },
          });
        }
      } catch (e) {
        console.error('Error leyendo sesión:', e);
      }
    };
    checkSession();
  }, []);

  const iniciarSesion = async () => {
    if (!correo || !password) {
      Alert.alert('Error', 'Por favor, completa todos los campos.');
      return;
    }

    try {
      setCargando(true);
      const response = await fetch('https://myappserve-go.onrender.com/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ correo, password }),
});
const data = await response.json();
if (!response.ok) {
  throw new Error(data.error || 'Error al iniciar sesión');
}
const { token, usuario } = data;
if (!token) {
  throw new Error('El servidor no devolvió token');
}
await AsyncStorage.setItem('user', JSON.stringify(usuario));
await AsyncStorage.setItem('token', token);

      // 🔴 CAMBIO: navegar a Home pasando el usuario completo
      router.replace({
        pathname: '/home',
        params: { usuario: JSON.stringify(usuario) },
      });
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
          value={correo}
          onChangeText={setCorreo}
        />

        {/* 🔴 CAMBIO: contenedor de contraseña con ojo */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Contraseña"
            placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(prev => !prev)}
            style={styles.eyeButton}>
            <Ionicons
              name={showPassword ? 'eye' : 'eye-off'}
              size={24}
              color={isDarkMode ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.forgotContainer}
          onPress={() => router.push('/forgot-password')}>
          <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

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
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333' : '#ccc',
      backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
      borderRadius: 6,
      marginBottom: 16,
      paddingHorizontal: 12,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 12,
      color: isDarkMode ? '#fff' : '#000',
      fontSize: 16,
    },
    eyeButton: {
      padding: 4,
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
