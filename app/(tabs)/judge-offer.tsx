import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// JudgeOfferScreen recibe cards, offer y friendName desde params
export default function JudgeOfferScreen() {
  const router = useRouter();
  // Paso 4: extraer params
  const params = useLocalSearchParams<{ cards?: string; offer?: string; friendName?: string }>();
const cards: Array<{ cardId: string; quantity: number }> =
  params.cards ? JSON.parse(params.cards) : [];
const offer = params.offer ?? '0';
const friendName = params.friendName ?? '';

  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  const acceptOffer = () => {
    Alert.alert('Oferta aceptada', 'Has aceptado la oferta.', [
      { text: 'OK', onPress: () => router.push('/notifications') }
    ]);
  };

  const rejectOffer = () => {
    Alert.alert('Rechazar oferta', '¿Estás seguro de rechazar la oferta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Rechazar', style: 'destructive', onPress: () => router.goBack() }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Oferta de {friendName}</Text>
      <Text style={[styles.offerText, { color: isDarkMode ? '#fff' : '#000' }]}>Monto ofrecido: ${offer}</Text>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {cards.map(c => (
          <View key={c.cardId} style={styles.cardBox}>
            <Text style={[styles.cardText, { color: isDarkMode ? '#fff' : '#000' }]}> 
              {c.cardId} × {c.quantity}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Botones fijos sobre la barra inferior */}
      <View style={styles.actionPanel}>
        <TouchableOpacity style={styles.acceptButton} onPress={acceptOffer}>
          <Text style={styles.buttonText}>Aceptar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectButton} onPress={rejectOffer}>
          <Text style={styles.buttonText}>Rechazar</Text>
        </TouchableOpacity>
      </View>

      {/* Espacio para la barra inferior */}
      <View style={styles.bottomBarPlaceholder} />
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDarkMode ? '#121212' : '#fff', paddingTop: 40 },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  offerText: { fontSize: 18, textAlign: 'center', marginBottom: 16 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 120 },
  cardBox: { padding: 12, marginBottom: 12, backgroundColor: isDarkMode ? '#1e1e1e' : '#f9f9f9', borderRadius: 6 },
  cardText: { fontSize: 16 },
  actionPanel: { position: 'absolute', bottom: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16 },
  acceptButton: { flex: 1, marginRight: 8, backgroundColor: '#6A0DAD', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  rejectButton: { flex: 1, marginLeft: 8, backgroundColor: '#d9534f', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  bottomBarPlaceholder: { height: 60 },
});
