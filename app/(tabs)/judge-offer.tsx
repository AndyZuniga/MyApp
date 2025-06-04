// judge-offer.tsx
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
    cards?: string;
    offer?: string;
    friendName?: string;
    friendId?: string;
    receptorId?: string;
    notificationId?: string;
  }>();

  const cards: OfferedCard[] = params.cards ? JSON.parse(params.cards) : [];
  const offer = params.offer ?? '0';
  const friendName = params.friendName ?? '';
  const friendId = params.friendId as string;         // este es el “comercial” receptor
  const receptorId = params.receptorId as string;     // esto es el mismo receptorId
  const notificationId = params.notificationId as string; // ID de la notificación que se va a responder

  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  /**
   * Función que envía la acción al endpoint de respuesta de notificación;
   * el backend actualiza tanto la notificación receptor como su contraparte.
   */
  const respondNotification = async (
    notiId: string,
    action: 'accept' | 'reject',
    byApodo: string
  ) => {
    try {
      const resp = await fetch(`${API_URL}/notifications/${notiId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, byApodo }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Error en el backend al responder notificación');
      }
    } catch (error) {
      console.error(`Error al responder notificación ${notiId}:`, error);
      throw error;
    }
  };

  /**
   * Antes de quitar/agregar cartas, comprobamos que el receptor (friendId)
   * aún tenga en su librería cada cardId en la cantidad solicitada.
   */
  const verifyReceiverHasCards = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/library?userId=${friendId}`);
      if (!res.ok) {
        console.warn('Error al obtener biblioteca del receptor');
        return false;
      }
      const data = await res.json();
      const library: Array<{ cardId: string; quantity: number }> = data.library || [];

      // Convertimos la librería en un diccionario: { cardId → cantidad }
      const mapLibrary: Record<string, number> = {};
      for (const entry of library) {
        mapLibrary[entry.cardId] = entry.quantity;
      }

      // Para cada carta de la oferta, comprobamos si existe suficientes unidades
      for (const c of cards) {
        if (!c.cardId || !c.quantity) continue;
        const available = mapLibrary[c.cardId] || 0;
        if (available < c.quantity) {
          // Si falta al menos una carta
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error('verifyReceiverHasCards:', err);
      return false;
    }
  };

  /**
   * Maneja la aceptación de la oferta: verifica existencia → intercambio → notifica.
   */
  const acceptOffer = async () => {
    try {
      // 1) Recuperamos datos del usuario que está ejecutando la acción
      const raw = await AsyncStorage.getItem('user');
      const storedUser = raw ? JSON.parse(raw) : null;
      if (!storedUser) {
        Alert.alert('Error', 'Usuario no disponible');
        return;
      }

      // 2) Antes de modificar librerías, comprobamos que el receptor todavía
      //    tenga en stock todas las cartas solicitadas.
      const receiverHasAll = await verifyReceiverHasCards();
      if (!receiverHasAll) {
        // Si no tiene stock, rechazamos la oferta y notificamos al emisor automáticamente.
        await respondNotification(notificationId, 'reject', storedUser.apodo);
        Alert.alert(
          'No se puede aceptar',
          `El usuario ${friendName} (@${friendName}) ya no tiene todas las cartas solicitadas. La oferta ha sido cancelada automáticamente.`
        );
        router.back();
        return;
      }

      // 3) Si pasa la verificación, procedemos a quitar/agregar cartas:
      for (const c of cards) {
        const qty = c.quantity || 0;
        for (let i = 0; i < qty; i++) {
          // Quitar 1 unidad de la librería de receptor
          await fetch(`${API_URL}/library/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: friendId, cardId: c.cardId }),
          });
          // Agregar 1 unidad a la librería de quien acepta (el emisor original)
          await fetch(`${API_URL}/library/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: storedUser.id, cardId: c.cardId }),
          });
        }
      }

      // 4) Notificamos al backend que “aceptamos” (esto actualizará ambas notificaciones)
      await respondNotification(notificationId, 'accept', storedUser.apodo);

      Alert.alert('Oferta aceptada', 'Has aceptado la oferta correctamente.', [
        { text: 'OK', onPress: () => router.back() },
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
            // Notificar backend (rechazar la notificación)
            await respondNotification(notificationId, 'reject', storedUser.apodo);
            Alert.alert('Oferta rechazada', 'Has rechazado la oferta.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (err: any) {
            console.error('Error al notificar rechazo:', err);
            Alert.alert('Error', err.message || 'No se pudo notificar el rechazo');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>
        Oferta de {friendName}
      </Text>
      <Text style={[styles.offerText, { color: isDarkMode ? '#fff' : '#000' }]}>
        Monto ofrecido: ${offer}
      </Text>
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

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDarkMode ? '#121212' : '#fff', paddingTop: 40 },
    title: { fontSize: 22, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
    offerText: { fontSize: 18, textAlign: 'center', marginBottom: 16 },
    listContainer: { paddingHorizontal: 16, paddingBottom: 120 },
    cardBox: {
      padding: 12,
      marginBottom: 12,
      backgroundColor: isDarkMode ? '#1e1e1e' : '#f9f9f9',
      borderRadius: 6,
      alignItems: 'center',
    },
    cardImage: { width: 100, height: 140, resizeMode: 'contain', marginBottom: 8 },
    cardText: { fontSize: 16 },
    actionPanel: {
      position: 'absolute',
      bottom: 60,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 16,
    },
    acceptButton: {
      flex: 1,
      marginRight: 8,
      backgroundColor: '#6A0DAD',
      paddingVertical: 12,
      borderRadius: 6,
      alignItems: 'center',
    },
    rejectButton: {
      flex: 1,
      marginLeft: 8,
      backgroundColor: '#d9534f',
      paddingVertical: 12,
      borderRadius: 6,
      alignItems: 'center',
    },
    buttonText: { color: '#fff', fontWeight: '600' },
    bottomBarPlaceholder: { height: 60 },
  });
