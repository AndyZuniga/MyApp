// judge-offer.tsx
// Última edición: 2025-06-03 10:15 - Incluye nombre y apodo en la alerta de rechazo.

import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  useColorScheme, Image, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';

const API_URL = 'https://myappserve-go.onrender.com';

type OfferedCard = {
  cardId?: string;
  quantity?: number;
  name?: string;
  image?: string;
};

/**
 * Pantalla para aceptar o rechazar una oferta recibida.
 */
export default function JudgeOfferScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    notificationId?: string; // ahora usamos este parámetro
    cards?: string;
    offer?: string;
    friendName?: string;
    friendId?: string;
    receptorId?: string;
  }>();

  const notificationId = params.notificationId as string; // ID de la notificación a responder
  const cards: OfferedCard[] = params.cards ? JSON.parse(params.cards) : [];
  const offer = params.offer ?? '0';
  const friendName = params.friendName ?? '';
  const receptorId = params.receptorId as string; // ID de usuario receptor, ya no se usa para responder notificación

  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  /**
   * Envía la acción al endpoint de respuesta de notificación;
   * el backend actualiza tanto la notificación receptor como su contraparte.
   */
  const respondNotification = async (
    notiId: string,
    action: 'accept' | 'reject',
    byApodo: string
  ) => {
    const res = await fetch(
      `${API_URL}/notifications/${notiId}/respond`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, byApodo })
      }
    );
    const body = await res.json();
    console.log('PATCH responde', res.status, body);
    if (!res.ok) throw new Error(body.error || 'Error al responder notificación');
  };

  /**
   * Maneja la aceptación de la oferta: intercambio de cartas y notificación.
   */
  const acceptOffer = async () => {
    try {
      const raw = await AsyncStorage.getItem('user');
      const storedUser = raw ? JSON.parse(raw) : null;
      if (!storedUser) {
        Alert.alert('Error', 'Usuario no disponible');
        return;
      }

      // Intercambio de cartas
      for (const c of cards) {
        const qty = c.quantity || 0;
        for (let i = 0; i < qty; i++) {
          await fetch(`${API_URL}/library/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: storedUser.id, cardId: c.cardId })
          });
          await fetch(`${API_URL}/library/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: params.friendId, cardId: c.cardId })
          });
        }
      }

      // Notificar backend (receptor + contraparte)
      await respondNotification(notificationId, 'accept', storedUser.apodo);

      Alert.alert('Oferta aceptada', 'Has aceptado la oferta.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      console.error('Error al procesar aceptación:', err);
      Alert.alert('Error', err.message || 'No se pudo procesar la oferta');
    }
  };

  /**
   * Muestra confirmación y notifica el rechazo de la oferta.
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

            // Notificar backend (usamos notificationId en vez de receptorId)
            await respondNotification(notificationId, 'reject', storedUser.apodo);

            // Incluir nombre y apodo del emisor en la alerta
            Alert.alert(
              'Oferta rechazada',
              `Has rechazado la oferta de ${friendName} (${friendName})`,
              [ { text: 'OK', onPress: () => router.back() } ]
            );
          } catch (err: any) {
            console.error('Error al notificar rechazo:', err);
            Alert.alert('Error', err.message || 'No se pudo notificar el rechazo');
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
            {c.image && <Image source={{ uri: c.image }} style={styles.cardImage} />}
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
