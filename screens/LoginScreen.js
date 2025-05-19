// screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';

const LoginScreen = () => {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!correo || !password) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    try {
      const response = await fetch('https://myappserve-go.onrender.com/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo, password }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Éxito', 'Inicio de sesión exitoso');
        // Aquí puedes navegar a otra pantalla o guardar el estado del usuario
      } else {
        Alert.alert('Error', data.error || 'Error al iniciar sesión');
      }
    } catch (error) {
      Alert.alert('Error', 'Error de conexión');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>
      <TextInput
        style={styles.input}
        placeholder="Correo"
        onChangeText={setCorreo}
        value={correo}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        onChangeText={setPassword}
        value={password}
        secureTextEntry
      />
      <Button title="Ingresar" onPress={handleLogin} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
});

export default LoginScreen;
