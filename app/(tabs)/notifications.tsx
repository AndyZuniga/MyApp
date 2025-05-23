import React, { useEffect, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

const API_URL = 'https://myappserve-go.onrender.com';

export default function NotificationsScreen() {
  // Función para limpiar todas las notificaciones (marcar todas como leídas)
  const clearAll = async () => {
    try {
      // Filtrar notificaciones no leídas
      const unread = notifications.filter(n => !n.isRead);
      await Promise.all(unread.map(n =>
        fetch(API_URL + '/notifications/' + n._id + '/read', { method: 'PATCH' })
      ));
      // Actualizar estado local
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('[notifications/clearAll]', err);
      Alert.alert('Error', 'No se pudieron limpiar las notificaciones');
    }
  };

  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Obtener userId desde AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem('user')
      .then(raw => {
        if (!raw) throw new Error('Usuario no disponible');
        const u = JSON.parse(raw);
        setUserId(u.id);
      })
      .catch(err => {
        console.error('[AsyncStorage/user]', err);
        Alert.alert('Error', 'Usuario no disponible');
      });
  }, []);

  // Cargar notificaciones (todas, para incluir leídas y mostrar estado)
  useFocusEffect(
    React.useCallback(() => {
      if (!userId) return;
      let active = true;
      setLoading(true);
      fetch(`${API_URL}/notifications?userId=${userId}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(json => {
          if (active) setNotifications(json.notifications || []);
        })
        .catch(err => {
          console.error('[notifications/get]', err);
          Alert.alert('Error', 'No se pudieron cargar notificaciones');
        })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [userId])
  );

  // Marcar como leída
  const markAsRead = async (id: string) => {
    try {
      const resp = await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      // Actualizar local
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('[notifications/read]', err);
      Alert.alert('Error', 'No se pudo actualizar la notificación');
    }
  };

  // Indicador de eliminación permitida (30 min)
  const canDelete = (createdAt: string) => Date.now() - new Date(createdAt).getTime() >= 30*60*1000;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Notificaciones</Text>
        {/* Botón para limpiar todas las notificaciones */}
        <TouchableOpacity onPress={clearAll} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={24} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loading} />
      ) : notifications.length === 0 ? (
        <Text style={[styles.emptyText, { color: isDarkMode ? '#fff' : '#000' }]}>No tienes notificaciones</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {notifications.map(n => (
            <View
              key={n._id}
              style={[
                styles.requestBox,
                n.isRead && n.type === 'offer' ? styles.acceptedBox : null
              ]}
            >
              {n.sender && (
                <Text style={[styles.requestText, { color: isDarkMode ? '#bbb' : '#555' }]}>De: {n.sender.nombre} (@{n.sender.apodo})</Text>
              )}
              <View style={{ marginBottom: 8 }}>
                {n.type === 'offer' && n.partner && n.message.includes('Esperando') ? (
                  <Text style={[styles.requestText, { color: isDarkMode ? '#fff' : '#000' }]}>Esperando respuesta de {n.partner.nombre}</Text>
                ) : (
                  <Text style={[styles.requestText, { color: isDarkMode ? '#fff' : '#000' }]}>{n.message}</Text>
                )}
                <Text style={[styles.dateText, { color: isDarkMode ? '#aaa' : '#666' }]}> {new Date(n.createdAt).toLocaleDateString()} </Text>
              </View>

              {n.type === 'offer' ? (
                n.message.includes('Esperando') ? (
                  // Notificación 'Esperando respuesta', solo ver
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.button, styles.viewButton]}
                      onPress={() =>
                        router.push({
                          pathname: '/my-offer',
                          params: {
                            cards: JSON.stringify(n.cards),
                            offer: n.amount.toString(),
                            friendName: n.sender.nombre,
                            mode: n.mode,
                            date: new Date(n.createdAt).toISOString(),
                            friendId: n.partner._id
                          }
                        })
                      }
                    >
                      <Text style={styles.buttonText}>Ver</Text>
                    </TouchableOpacity>
                  </View>
                ) : n.isRead ? (
                  // Estado Aceptada (recibida)
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={() =>
                        router.push({
                          pathname: '/judge-offer',
                          params: {
                            cards: JSON.stringify(n.cards),
                            offer: n.amount.toString(),
                            friendName: n.sender.nombre,
                            mode: n.mode,
                            date: new Date(n.createdAt).toISOString(),
                            friendId: n.partner._id,
                            notificationId: n._id
                          }
                        })
                      }
                    >
                      <Text style={styles.buttonText}>Ver oferta</Text>
                    </TouchableOpacity>
                    <Text style={styles.acceptedText}>Aceptada</Text>
                  </View>
                ) : ( // Pendiente
                  // Estado pendiente
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.button, styles.viewButton]}
                      onPress={() =>
                        router.push({
                          pathname: '/my-offer',
                          params: {
                            cards: JSON.stringify(n.cards),
                            offer: n.amount.toString(),
                            friendName: n.sender.nombre,
                            mode: n.mode,
                            
                            date: new Date(n.createdAt).toISOString(),
                            friendId: n.partner._id
                          }
                        })
                      }
                    >
                      <Text style={styles.buttonText}>Ver oferta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.rejectOfferButton]}
                      onPress={() => markAsRead(n._id)}
                    >
                      <Text style={styles.buttonText}>Rechazar</Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                <TouchableOpacity style={styles.readButton} onPress={() => markAsRead(n._id)}>
                  <Text style={styles.readText}>Marcar leído</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.replace('/home')}><Ionicons name="home" size={28} color={isDarkMode ? '#fff' : '#000'} /></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/library')}><Ionicons name="book" size={28} color={isDarkMode ? '#fff' : '#000'} /></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/friends')}><Ionicons name="people-outline" size={28} color={isDarkMode ? '#fff' : '#000'} /></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}><Ionicons name="notifications-outline" size={28} color="#6A0DAD"/></TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (dark: boolean) => StyleSheet.create({
  clearButton: { position: 'absolute', right: 16, top: 40 },
  container: { flex: 1, backgroundColor: dark ? '#121212' : '#fff' },
  header: { padding: 24, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: dark ? '#333' : '#ccc' },
  title: { fontSize: 24, fontWeight: '600' },
  loading: { marginTop: 20 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16 },
  listContainer: { padding: 16, paddingBottom: 100 },
  requestBox: { padding: 12, marginBottom: 12, backgroundColor: dark ? '#1e1e1e' : '#f9f9f9', borderRadius: 6 },
  acceptedBox: { backgroundColor: '#e6ffed' },  // verde claro para aceptadas
  requestText: { fontSize: 16 },
  dateText: { fontSize: 12, textAlign: 'right' },
  actionButtons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  button: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginLeft: 8, backgroundColor: '#6A0DAD' },
  viewButton: { backgroundColor: '#6A0DAD' },
  rejectOfferButton: { backgroundColor: '#d9534f' },
  acceptedText: { color: 'green', fontWeight: '600', marginLeft: 12 },
  readButton: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#6A0DAD', borderRadius: 6 },
  readText: { color: '#fff', fontWeight: '600' },
  bottomBar: { position: 'absolute', bottom: 0, width: '100%', height: 60, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: dark ? '#1e1e1e' : '#fff', borderTopWidth: 1, borderTopColor: dark ? '#333' : '#ccc' },
  iconButton: { padding: 8 },
});
