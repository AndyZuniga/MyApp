// my-offer.tsx
import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://myappserve-go.onrender.com';

type OfferedCard = {
  cardId?: string;
  quantity?: number;
  name?: string;
  image?: string;
};

/**
 * Pantalla para visualizar el historial de una oferta (aceptada o rechazada).
 * Muestra los detalles de la oferta junto con el nombre y apodo de quien la realizó.
 * Incluye barra inferior con navegación a Librería, Amigos, Home y Opciones.
 */
export default function MyOfferScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    cards?: string;
    offer?: string;
    friendName?: string;
    friendApodo?: string;
    status?: string;
  }>();

  const cards: OfferedCard[] = params.cards ? JSON.parse(params.cards) : [];
  const offer = params.offer ?? '0';
  const friendName = params.friendName ?? '';
  const friendApodo = params.friendApodo ?? '';
  const statusRaw = params.status ?? 'pendiente';

  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  // Capitaliza primera letra
  const capitalStatus = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);

  // Función para mostrar opciones (Mis datos / Cerrar sesión)
  const showOptions = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      Alert.alert('Opciones', undefined, [
        {
          text: 'Mis datos',
          onPress: () =>
            user &&
            Alert.alert(
              'Datos de usuario',
              `Apodo: ${user.apodo}\nCorreo: ${user.correo}`
            ),
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('user');
            router.replace('/login');
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } catch (err: any) {
      console.error('showOptions:', err);
      Alert.alert('Error', 'No se pudo mostrar opciones');
    }
  }, [router]);

  const goHome = () => router.replace('/home');
  const goLibrary = () => router.push('/library');
  const goFriends = () => router.push('/friends');

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>
        Historial de Oferta
      </Text>
      <Text style={[styles.detailText, { color: isDarkMode ? '#ddd' : '#333' }]}>
        De: @{friendApodo}
      </Text>
      <Text style={[styles.detailText, { color: isDarkMode ? '#ddd' : '#333' }]}>
        Monto: ${offer}
      </Text>
      <Text style={[styles.statusText, { color: isDarkMode ? '#bbb' : '#555' }]}>
        Estado: {capitalStatus}
      </Text>

      <ScrollView contentContainerStyle={[styles.listContainer, { paddingBottom: 80 }]}>
        {cards.map((c, idx) => (
          <View key={c.cardId ?? idx} style={styles.cardBox}>
            {c.image && <Image source={{ uri: c.image }} style={styles.cardImage} />}
            <Text style={[styles.cardText, { color: isDarkMode ? '#fff' : '#000' }]}>
              {c.name ?? c.cardId} × {c.quantity}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Barra inferior */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.iconButton} onPress={goLibrary}>
          <Ionicons name="book-outline" size={24} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={goFriends}>
          <Ionicons name="people-outline" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={goHome}>
          <Image
            source={require('@/assets/images/pokeball.png')}
            style={[styles.homeIcon, { tintColor: isDarkMode ? '#fff' : '#000' }]}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={showOptions}>
          <Ionicons name="person" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#fff',
      padding: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 12,
      color: isDarkMode ? '#fff' : '#000',
    },
    detailText: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 4,
    },
    statusText: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 12,
    },
    listContainer: {
      paddingVertical: 8,
    },
    cardBox: {
      padding: 12,
      marginBottom: 12,
      backgroundColor: isDarkMode ? '#1e1e1e' : '#f0f0f0',
      borderRadius: 6,
      alignItems: 'center',
    },
    cardImage: {
      width: 80,
      height: 112,
      resizeMode: 'contain',
      marginBottom: 8,
      borderRadius: 4,
    },
    cardText: {
      fontSize: 16,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 60,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#333' : '#ccc',
    },
    iconButton: {
      padding: 8,
    },
    homeIcon: {
      width: 28,
      height: 28,
    },
  });
