/**
 * NotificationsScreen.tsx
 *
 * Función de la página:
 * Pantalla para mostrar las notificaciones del usuario, incluyendo ofertas,
 * solicitudes de amistad y mensajes del sistema.
 * Agrupa notificaciones de ofertas por transacción y muestra sólo el estado más
 * reciente (esperando, aceptada, rechazada).
 *
 * Cambios:
 *  - 2025-05-27 18:15: Agrupación de notificaciones de ofertas, mostrando sólo la última.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';

// URL base del backend
const API_URL = 'https://myappserve-go.onrender.com';

/**
 * Tipo de notificación desde el backend
 */
type NotificationType = {
  _id: string;
  type: 'offer' | 'friend_request' | 'system';
  message: string;
  isRead: boolean;
  sender?: { _id: string; nombre: string; apodo: string };
  partner?: { _id: string; nombre: string; apodo: string };
  cards?: Array<{ cardId: string; quantity: number; name?: string; image?: string }>;
  amount?: number;
  createdAt: string;
};

export default function NotificationsScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = params.userId as string;
  const router = useRouter();

  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Agrupa ofertas y mantiene sólo la última notificación de cada oferta única
  const processOffers = (notis: NotificationType[]): NotificationType[] => {
    const others = notis.filter(n => n.type !== 'offer');
    const offerNotis = notis.filter(n => n.type === 'offer');
    const map = new Map<string, NotificationType>();
    offerNotis.forEach(n => {
      // Clave única: partner-id + monto + detalles de cartas
      const key = `${n.partner?._id}-${n.amount}-${JSON.stringify(n.cards)}`;
      const prev = map.get(key);
      if (!prev || new Date(n.createdAt) > new Date(prev.createdAt)) {
        map.set(key, n);
      }
    });
    // Combinar y ordenar por fecha descendente
    return [...others, ...Array.from(map.values())]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/notifications?userId=${userId}`);
      if (!res.ok) throw new Error('Error al obtener notificaciones');
      const data = await res.json();
      // Agrupar ofertas y luego actualizar estado
      setNotifications(processOffers(data.notifications));
    } catch (err: any) {
      console.error('fetchNotifications:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('markAsRead:', err);
    }
  };

  const handlePress = async (noti: NotificationType) => {
    await markAsRead(noti._id);

    if (noti.type === 'offer') {
      const isRejected = noti.message.includes('rechazada');
      const isAccepted = noti.message.includes('aceptada');
      const isSender = !noti.message.startsWith('Has recibido');
      const partner = noti.partner;
      const cardsParam = encodeURIComponent(JSON.stringify(noti.cards || []));
      const offerParam = noti.amount;
      let route = '';
      let query = '';

      if (isRejected || isAccepted || isSender) {
        // Emisor: mostrar su historial
        route = '/my-offer';
        query = `cards=${cardsParam}&offer=${offerParam}`;
      } else {
        // Receptor: juzgar oferta
        route = '/judge-offer';
        query = `cards=${cardsParam}&offer=${offerParam}&friendName=${partner?.apodo}`;
      }
      router.push(`${route}?${query}`);
      return;
    }
    if (noti.type === 'friend_request') {
      router.push('/friend-requests');
      return;
    }
    Alert.alert('Notificación', noti.message);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: isDarkMode ? '#888' : '#444' }]}>No tienes notificaciones</Text>
        </View>
      ) : (
        <ScrollView>
          {notifications.map(noti => {
            if (noti.type === 'offer') {
              const isRejected = noti.message.includes('rechazada');
              const isAccepted = noti.message.includes('aceptada');
              const isSender = !noti.message.startsWith('Has recibido');
              const partner = noti.partner;
              let title = '';
              let status = '';
              let buttonLabel = '';

              if (isRejected) {
                title = noti.message;
                status = 'Estado: Rechazada';
                buttonLabel = 'Ver';
              } else if (isAccepted) {
                title = noti.message;
                status = 'Estado: Aceptada';
                buttonLabel = 'Ver';
              } else if (isSender) {
                title = `Esperando respuesta de ${partner?.nombre} (${partner?.apodo})`;
                status = 'Estado: Esperando respuesta';
                buttonLabel = 'Ver';
              } else {
                title = `Has recibido una oferta de ${partner?.nombre} (${partner?.apodo})`;
                status = `Monto: $${noti.amount?.toFixed(2)}`;
                buttonLabel = 'Ver oferta';
              }

              return (
                <View key={noti._id} style={styles.notificationBox}>
                  <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>{title}</Text>
                    <Text style={[styles.status, { color: isDarkMode ? '#bbb' : '#555' }]}>{status}</Text>
                    <Text style={[styles.date, { color: isDarkMode ? '#888' : '#666' }]}>
                      {new Date(noti.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.viewButton} onPress={() => handlePress(noti)}>
                    <Text style={styles.viewText}>{buttonLabel}</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            return (
              <TouchableOpacity
                key={noti._id}
                style={[styles.notificationRow, noti.isRead ? styles.read : styles.unread]}
                onPress={() => handlePress(noti)}
              >
                <Ionicons
                  name={noti.type === 'friend_request' ? 'person-add' :                
                    'notifications'}
                  size={24}
                  color={isDarkMode ? '#fff' : '#000'}
                />
                <Text style={[styles.message, { color: isDarkMode ? '#fff' : '#000' }]}>{noti.message}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDarkMode ? '#121212' : '#fff', padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 16 },
    notificationRow: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8, borderRadius: 6 },
    unread: { backgroundColor: isDarkMode ? '#333' : '#eee' },
    read: { backgroundColor: isDarkMode ? '#222' : '#fafafa' },
    message: { marginLeft: 12, fontSize: 14 },
    notificationBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, marginBottom: 8, backgroundColor: isDarkMode ? '#333' : '#eee', borderRadius: 6 },
    textContainer: { flex: 1, paddingRight: 8 },
    title: { fontSize: 16, fontWeight: '600' },
    status: { fontSize: 14, marginTop: 4 },
    date: { fontSize: 12, marginTop: 2 },
    viewButton: { backgroundColor: '#6A0DAD', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 },
    viewText: { color: '#fff', fontWeight: '600' },
  });
