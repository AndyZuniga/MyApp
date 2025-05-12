import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const { usuario } = useLocalSearchParams<{ usuario: string }>();
  const userObj = usuario ? JSON.parse(usuario) : null;

  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  // Estados de biblioteca
  const [libraryList, setLibraryList] = useState<{ cardId: string; quantity: number }[]>([]);
  const [cards, setCards] = useState<any[]>([]);

  // Carga inicial: obtener library y detalles de cartas
  useEffect(() => {
    if (!userObj) return;
    (async () => {
      try {
        const res = await fetch(`https://myappserve-go.onrender.com/library?userId=${userObj.id}`);
        const json = await res.json();
        setLibraryList(json.library);
        const details = await Promise.all(
          json.library.map((e: any) =>
            fetch(`https://api.pokemontcg.io/v2/cards/${e.cardId}`)
              .then(r => r.json())
              .then(rj => ({ ...rj.data, quantity: e.quantity }))
          )
        );
        setCards(details);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    })();
  }, [userObj]);

  // Función para actualizar cantidad (+ / -)
  const updateLibrary = async (cardId: string, action: 'add' | 'remove') => {
    try {
      const endpoint = action === 'add' ? 'library/add' : 'library/remove';
      const res = await fetch(`https://myappserve-go.onrender.com/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userObj.id, cardId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLibraryList(data.library);
      setCards(cards.map(c => ({
        ...c,
        quantity: data.library.find((e: any) => e.cardId === c.id)?.quantity || 0,
      })));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Logout y menú
  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    router.replace('/login');
  };
  const showOptions = () => {
    Alert.alert('Opciones', undefined, [
      { text: 'Mis datos', onPress: () => {
          if (userObj) Alert.alert('Datos de usuario',
            `Apodo: ${userObj.apodo}\nCorreo: ${userObj.correo}\nNombre: ${userObj.nombre}\nID: ${userObj.id}`
          );
        }
      },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: handleLogout },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.listContainer}>
        {cards.map(card => (
          <View key={card.id} style={styles.cardBox}>
            {/* Cantidad */}
            {card.quantity > 0 && (
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>{card.quantity}</Text>
              </View>
            )}
            {/* – */}
            <TouchableOpacity
              style={styles.iconCircleLeft}
              onPress={() => updateLibrary(card.id, 'remove')}
            >
              <Ionicons name="remove" size={16} color="#fff" />
            </TouchableOpacity>
            {/* + */}
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => updateLibrary(card.id, 'add')}
            >
              <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: card.images.small }} style={styles.cardImage} />
            <Text style={[styles.cardName, { color: isDarkMode ? '#fff' : '#000' }]}>
              {card.name}
            </Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.iconButton} onPress={showOptions}>
          <Ionicons name="person" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDarkMode ? '#121212' : '#fff' },
    listContainer: { padding: 24, paddingTop: 40, paddingBottom: 100 },
    cardBox: { width: '100%', alignItems: 'center', padding: 12, marginBottom: 16, backgroundColor: isDarkMode ? '#1e1e1e' : '#f9f9f9', borderRadius: 6 },
    cardImage: { width: '100%', height: 200, resizeMode: 'contain', borderRadius: 6, marginBottom: 8 },
    cardName: { fontSize: 16, fontWeight: '500' },
    counterBadge: { position: 'absolute', top: 8, right: 48, backgroundColor: '#6A0DAD', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, zIndex: 1 },
    counterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    iconCircle: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#6A0DAD', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    iconCircleLeft: { position: 'absolute', top: 8, left: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#6A0DAD', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    bottomBar: { position: 'absolute', bottom: 0, width: '100%', height: 60, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 20, backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderTopWidth: 1, borderTopColor: isDarkMode ? '#333' : '#ccc' },
    iconButton: { padding: 8 },
  });
