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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getStyles(isDarkMode);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [apodo, setApodo] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [errorApodo, setErrorApodo] = useState('');
  const [errorCorreo, setErrorCorreo] = useState('');
  const [errorPassword, setErrorPassword] = useState('');

  // 🟢 Enviar solicitud de registro y esperar verificación por correo
  const registrarUsuario = async () => {
    if (!nombre || !apellido || !apodo || !correo || !password) {
      Alert.alert('Campos incompletos', 'Por favor, completa todos los campos.');
      return;
    }

    // 🔴 Validación de contraseña
    const passwordValida = /^(?=.*[A-Z]).{8,}$/.test(password);
    if (!passwordValida) {
      setErrorPassword('La contraseña debe tener al menos 8 caracteres y 1 mayúscula');
      return;
    }

    // 🔴 Limpiar errores previos
    setErrorApodo('');
    setErrorCorreo('');
    setErrorPassword('');

    try {
      setCargando(true);
      const response = await fetch('https://myappserve-go.onrender.com/register-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre, apellido, apodo, correo, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 🔴 Mostrar errores específicos
        if (data.error?.includes('apodo')) {
          setErrorApodo(data.error);
        } else if (data.error?.includes('correo')) {
          setErrorCorreo(data.error);
        } else {
          Alert.alert('Error de registro', data.error || 'Error desconocido');
        }
        return;
      }

      setModalVisible(true);
    } catch (error) {
      Alert.alert('Error de red', 'No se pudo conectar con el servidor');
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
          onChangeText={(text) => {
            setApodo(text);
            if (errorApodo) setErrorApodo(''); // 🔴 Limpiar error automáticamente
          }}
        />
        {errorApodo !== '' && (
          <Text style={styles.errorText}>{errorApodo}</Text>
        )}

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
          keyboardType="email-address"
          autoCapitalize="none"
          value={correo}
          onChangeText={(text) => {
            setCorreo(text);
            if (errorCorreo) setErrorCorreo(''); // 🔴 Limpiar error automáticamente
          }}
        />
        {errorCorreo !== '' && (
          <Text style={styles.errorText}>{errorCorreo}</Text>
        )}

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
          secureTextEntry
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (errorPassword) setErrorPassword(''); // 🔴 Limpiar error automáticamente
          }}
        />
        {errorPassword !== '' && (
          <Text style={styles.errorText}>{errorPassword}</Text>
        )}

        <TouchableOpacity
          style={styles.loginButton}
          onPress={registrarUsuario}
          disabled={cargando}>
          <Text style={styles.loginText}>
            {cargando ? 'Registrando...' : 'Registrarse'}
          </Text>
        </TouchableOpacity>

        {/* 🔵 Modal para aviso de verificación por correo */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalBox}>
              <Text style={styles.modalText}>
                Se ha enviado un enlace de verificación a:
              </Text>
              <Text style={styles.modalEmail}>{correo}</Text>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.loginText}>Cambiar correo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalBox: {
      width: '80%',
      backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
      borderRadius: 10,
      padding: 20,
      alignItems: 'center',
    },
    modalText: {
      fontSize: 16,
      color: isDarkMode ? '#fff' : '#000',
      textAlign: 'center',
      marginBottom: 10,
    },
    modalEmail: {
      fontWeight: 'bold',
      color: '#6A0DAD',
      marginBottom: 20,
    },
    modalButton: {
      backgroundColor: '#6A0DAD',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 6,
    },
    errorText: {
      color: 'red',
      fontSize: 14,
      alignSelf: 'flex-start',
      marginTop: -12,
      marginBottom: 8,
      marginLeft: 4,
    },
  });
