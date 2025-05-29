import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Image,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

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
 */
export default function MyOfferScreen() {
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

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Historial de Oferta</Text>
      <Text style={[styles.detailText, { color: isDarkMode ? '#ddd' : '#333' }]}>De: {friendName} ({friendApodo})</Text>
      <Text style={[styles.detailText, { color: isDarkMode ? '#ddd' : '#333' }]}>Monto: ${offer}</Text>
      <Text style={[styles.statusText, { color: isDarkMode ? '#bbb' : '#555' }]}>Estado: {capitalStatus}</Text>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {cards.map((c, idx) => (
          <View key={c.cardId ?? idx} style={styles.cardBox}>
            {c.image && <Image source={{ uri: c.image }} style={styles.cardImage} />}
            <Text style={[styles.cardText, { color: isDarkMode ? '#fff' : '#000' }]}> 
              {c.name ?? c.cardId} × {c.quantity}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
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
});
