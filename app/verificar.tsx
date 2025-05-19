import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';

export default function Verificar() {
  const { token } = useLocalSearchParams();
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    if (typeof token === 'string') {
      fetch(`https://myappserve-go.onrender.com/verify-token?token=${token}`)
        .then(async (res) => {
          const data = await res.json();
          if (res.ok) {
            Alert.alert('✅ Verificación exitosa', data.message);
            router.replace('/login'); // Redirige al login
          } else {
            Alert.alert('❌ Error', data.error || 'Token inválido o expirado');
          }
        })
        .catch(() => {
          Alert.alert('⚠️ Error de red', 'No se pudo conectar con el servidor');
        })
        .finally(() => setVerificando(false));
    }
  }, [token]);

  return (
    <View style={styles.container}>
      {verificando ? (
        <ActivityIndicator size="large" color="#6A0DAD" />
      ) : (
        <Text style={styles.text}>Verificación completada</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
  },
});
