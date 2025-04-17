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

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getStyles(isDarkMode);

  // 🟣 Estado para campos del formulario
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [apodo, setApodo] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  // 🟢 Función para registrar el usuario
  const registrarUsuario = async () => {
    if (!nombre || !apellido || !apodo || !correo || !password) {
      Alert.alert('Campos incompletos', 'Por favor, completa todos los campos.');
      return;
    }

    try {
      setCargando(true);
      const response = await fetch('https://myappserve-go.onrender.com/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nombre, apellido, apodo, correo, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo registrar el usuario');
      }

      Alert.alert('¡Registro exitoso!', `Bienvenido, ${data.usuario.apodo}`);
      router.replace('/login'); // Redirige al login

    } catch (error: any) {
      Alert.alert('Error de registro', error.message);
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
        
        <Text style={styles.title}>Registrarse</Text>

        <TextInput
          style={styles.input}
          placeholder="Nombre"
          placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
          value={nombre}
          onChangeText={setNombre}
        />

        <TextInput
          style={styles.input}
          placeholder="Apellido"
          placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
          value={apellido}
          onChangeText={setApellido}
        />

        <TextInput
          style={styles.input}
          placeholder="Apodo"
          placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
          value={apodo}
          onChangeText={setApodo}
        />

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
          keyboardType="email-address"
          autoCapitalize="none"
          value={correo}
          onChangeText={setCorreo}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.loginButton}
          onPress={registrarUsuario}
          disabled={cargando}>
          <Text style={styles.loginText}>
            {cargando ? 'Registrando...' : 'Registrarse'}
          </Text>
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
  });
