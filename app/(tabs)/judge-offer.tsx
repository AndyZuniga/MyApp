/**
 * JudgeOfferScreen.tsx
 *
 * Función de la página:
 * Pantalla donde el receptor de una oferta revisa los detalles de la misma,
 * puede aceptar (transferir cartas) o rechazar la oferta.
 *
 * Cambios:
 *  - 2025-05-27 17:00: Corrección de navegación con router.back().
 *  - 2025-05-27 17:45: Al rechazar, se envía notificación de rechazo al emisor.
 *  - 2025-05-27 17:55: Al aceptar, se envía notificación de aceptación al emisor.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';

// URL base del backend
const API_URL = 'https://myappserve-go.onrender.com';

/**
 * Tipo de tarjeta recibida en params, incluye nombre e imagen opcionales
 */
type OfferedCard = {
  cardId?: string;
  quantity?: number;
  name?: string;
  image?: string;
};

export default function JudgeOfferScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    cards?: string;
    offer?: string;
    friendName?: string;
    friendId?: string;
  }>();
  const cards: OfferedCard[] = params.cards ? JSON.parse(params.cards) : [];
  const offer = params.offer ?? '0';
  const friendName = params.friendName ?? '';
  const friendId = params.friendId as string; // ID de quien ofreció

  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  /**
   * Aceptar oferta:
   *  - Quita las cartas ofertadas de la biblioteca del usuario actual
   *  - Añade esas cartas a la biblioteca del comprador (friendId)
   *  - Envía notificación de aceptación al emisor
   *  - Vuelve a la pantalla anterior
   */
  const acceptOffer = async () => {
    try {
      const raw = await AsyncStorage.getItem('user');
      const storedUser = raw ? JSON.parse(raw) : null;
      if (!storedUser) {
        Alert.alert('Error', 'Usuario no disponible');
        return;
      }
      // Procesa cada carta según la cantidad ofertada
      for (const c of cards) {
        const qty = c.quantity || 0;
        for (let i = 0; i < qty; i++) {
          // 1) Quitar del usuario actual
          await fetch(`${API_URL}/library/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: storedUser.id, cardId: c.cardId })
          });
          // 2) Añadir al comprador
          await fetch(`${API_URL}/library/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: friendId, cardId: c.cardId })
          });
        }
      }
      // 2025-05-27 17:55 - Notificar aceptación al emisor
      await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: friendId,                     // emisor original
          partner: storedUser.id,                // receptor actual
          type: 'offer',
          cards,
          amount: Number(offer),
          message: `Tu oferta ha sido aceptada por ${storedUser.apodo}`
        })
      });
      Alert.alert('Oferta aceptada', 'Has aceptado la oferta.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      console.error('Error al procesar aceptación:', err);
      Alert.alert('Error', err.message || 'No se pudo procesar la oferta');
    }
  };

  /**
   * Rechazar oferta:
   *  - Envía notificación de rechazo al emisor
   *  - Vuelve a la pantalla anterior
   */
  const rejectOffer = () => {
    Alert.alert('Rechazar oferta', '¿Estás seguro de rechazar la oferta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar',
        style: 'destructive',
        onPress: async () => {
          try {
            const raw = await AsyncStorage.getItem('user');
            const storedUser = raw ? JSON.parse(raw) : null;
            if (!storedUser) {
              Alert.alert('Error', 'Usuario no disponible');
              return;
            }
            // 2025-05-27 17:45 - Notificar rechazo al emisor
            await fetch(`${API_URL}/notifications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: friendId,
                partner: storedUser.id,
                type: 'offer',
                cards,
                amount: Number(offer),
                message: `Tu oferta ha sido rechazada por ${storedUser.apodo}`
              })
            });
            router.back();
          } catch (err: any) {
            console.error('Error al notificar rechazo:', err);
            Alert.alert('Error', 'No se pudo notificar el rechazo');
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Oferta de {friendName}</Text>
      <Text style={[styles.offerText, { color: isDarkMode ? '#fff' : '#000' }]}>Monto ofrecido: ${offer}</Text>
      <ScrollView contentContainerStyle={styles.listContainer}>
        {cards.map((c, idx) => (
          <View key={c.cardId ?? idx} style={styles.cardBox}>
            {c.image ? <Image source={{ uri: c.image }} style={styles.cardImage} /> : null}
            <Text style={[styles.cardText, { color: isDarkMode ? '#fff' : '#000' }]}> 
              {c.name ?? c.cardId} × {c.quantity}
            </Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.actionPanel}>
        <TouchableOpacity style={styles.acceptButton} onPress={acceptOffer}>
          <Text style={styles.buttonText}>Aceptar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectButton} onPress={rejectOffer}>
          <Text style={styles.buttonText}>Rechazar</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bottomBarPlaceholder} />
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDarkMode ? '#121212' : '#fff', paddingTop: 40 },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  offerText: { fontSize: 18, textAlign: 'center', marginBottom: 16 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 120 },
  cardBox: { padding: 12, marginBottom: 12, backgroundColor: isDarkMode ? '#1e1e1e' : '#f9f9f9', borderRadius: 6, alignItems: 'center' },
  cardImage: { width: 100, height: 140, resizeMode: 'contain', marginBottom: 8 },
  cardText: { fontSize: 16 },
  actionPanel: { position: 'absolute', bottom: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16 },
  acceptButton: { flex: 1, marginRight: 8, backgroundColor: '#6A0DAD', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  rejectButton: { flex: 1, marginLeft: 8, backgroundColor: '#d9534f', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  bottomBarPlaceholder: { height: 60 },
});
