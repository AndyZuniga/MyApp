// notifications.tsx
// Última edición: 2025-06-03 13:45 – Se incorporó campo `role` y ajustes de botón.

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Appearance,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://myappserve-go.onrender.com';
const POLLING_INTERVAL = 10000;

type NotificationType = {
  _id: string;
  type: 'offer' | 'friend_request' | 'system';
  message: string;
  isRead: boolean;
  status: 'pendiente' | 'aceptada' | 'rechazada';
  user: string; // ID de quién recibe esta notificación
  partner?: { _id: string; nombre: string; apodo: string };
  friendRequestId?: string;
  amount?: number;
  cards?: Array<{ cardId: string; quantity: number; name?: string; image?: string }>;
  createdAt: string;
  role: 'sender' | 'receiver'; // <-- campo que vino del backend
};

enum FilterOption {
  All = 'Todas',
  Pendiente = 'En espera',
  Aceptada = 'Aceptadas',
  Rechazada = 'Rechazadas',
  Solicitud = 'Solicitud',
}

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = Appearance.getColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getStyles(isDarkMode);

  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filter, setFilter] = useState<FilterOption>(FilterOption.All);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const goHome = () => router.replace('/home');
  const goLibrary = () => router.push('/library');
  const goFriends = () => router.push('/friends');

  const showOptions = async () => {
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
  };

  useEffect(() => {
    const loadUserAndFetch = async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        const user = raw ? JSON.parse(raw) : null;
        if (!user || !user.id) {
          Alert.alert('Error', 'Usuario no disponible');
          setLoading(false);
          return;
        }
        setCurrentUserId(user.id);
        await fetchNotifications(user.id);
      } catch (err: any) {
        console.error('loadUserAndFetch:', err);
        Alert.alert('Error', 'No se pudo cargar usuario');
        setLoading(false);
      }
    };
    loadUserAndFetch();
  }, []);

  const fetchNotifications = useCallback(
    async (userId: string) => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/notifications?userId=${userId}`);
        if (!res.ok) throw new Error('Error al obtener notificaciones');
        const data = await res.json();
        setNotifications(data.notifications);
      } catch (err: any) {
        console.error('fetchNotifications:', err);
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        fetchNotifications(currentUserId);
        const interval = setInterval(() => fetchNotifications(currentUserId), POLLING_INTERVAL);
        return () => clearInterval(interval);
      }
      return () => {};
    }, [currentUserId, fetchNotifications])
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
    if (!currentUserId) {
      Alert.alert('Error', 'Usuario no disponible');
      return;
    }

    if (noti.type === 'offer') {
      const cardsParam = encodeURIComponent(JSON.stringify(noti.cards || []));
      const amountParam = noti.amount != null ? noti.amount.toString() : '0';

      // → Si soy RECEPTOR de oferta pendiente (role === 'receiver' && status === 'pendiente')
      if (noti.role === 'receiver' && noti.status === 'pendiente') {
        const friendNameParam = encodeURIComponent(noti.partner?.apodo ?? '');
        const friendIdParam = noti.partner?._id ?? '';
        router.push(
          `/judge-offer?notificationId=${noti._id}` +
            `&cards=${cardsParam}` +
            `&offer=${amountParam}` +
            `&friendName=${friendNameParam}` +
            `&friendId=${friendIdParam}` +
            `&receptorId=${currentUserId}`
        );
        return;
      }

      // → En cualquier otro caso (incluyendo quien envió la oferta), ir a historial (my-offer)
      const partnerApodo = encodeURIComponent(noti.partner?.apodo ?? '');
      router.push(
        `/my-offer?cards=${cardsParam}` +
          `&offer=${amountParam}` +
          `&friendName=${partnerApodo}` +
          `&friendApodo=${partnerApodo}` +
          `&status=${noti.status}`
      );
    } else if (noti.type === 'system') {
      Alert.alert('Notificación', noti.message);
    }
    // Las “friend_request” tienen sus propios botones Aceptar/Rechazar
  };

  const buildDisplayMessage = (noti: NotificationType): string => {
    if (noti.type === 'friend_request') return noti.message;

    if (noti.role === 'receiver' && noti.status === 'pendiente') {
      return `Has recibido una oferta de ${noti.partner?.apodo ?? ''}`;
    }
    if (noti.role === 'sender' && noti.status === 'pendiente') {
      return `Esperando respuesta de ${noti.partner?.apodo ?? ''}`;
    }
    if (noti.role === 'sender' && noti.status !== 'pendiente') {
      const verbo = noti.status === 'aceptada' ? 'aceptada' : 'rechazada';
      return `Tu oferta fue ${verbo} por ${noti.partner?.apodo ?? ''}`;
    }
    if (noti.role === 'receiver' && noti.status !== 'pendiente') {
      const verbo = noti.status === 'aceptada' ? 'aceptado' : 'rechazado';
      return `Has ${verbo} la oferta de ${noti.partner?.apodo ?? ''}`;
    }
    return noti.message;
  };

  const filteredNotifications = useMemo(
    () =>
      notifications.filter(noti => {
        const display = buildDisplayMessage(noti).toLowerCase();
        if (!display.includes(search.toLowerCase())) return false;
        switch (filter) {
          case FilterOption.Pendiente:
            return noti.status === 'pendiente';
          case FilterOption.Aceptada:
            return noti.status === 'aceptada';
          case FilterOption.Rechazada:
            return noti.status === 'rechazada';
          case FilterOption.Solicitud:
            return noti.type === 'friend_request';
          default:
            return true;
        }
      }),
    [notifications, search, filter]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={isDarkMode ? '#ffffff' : '#000000'} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.searchContainer} keyboardShouldPersistTaps="handled">
        {/* Input de búsqueda */}
        <TextInput
          style={[
            styles.searchInput,
            { color: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? '#555' : '#ccc' },
          ]}
          placeholder="Buscar..."
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={search}
          onChangeText={setSearch}
        />

        {/* Filtros horizontales */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
          nestedScrollEnabled
        >
          {Object.values(FilterOption).map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.filterButton, filter === opt && styles.filterButtonActive]}
              onPress={() => setFilter(opt)}
            >
              <Text style={styles.filterText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Lista de notificaciones */}
        {filteredNotifications.map(noti => {
          const displayMessage = buildDisplayMessage(noti);
          const rolTexto = noti.role === 'receiver' ? 'Rol: Receptor' : 'Rol: Emisor';

          return (
            <View
              key={noti._id}
              style={[
                styles.notificationBox,
                noti.isRead ? null : { borderWidth: 1, borderColor: '#6A0DAD' },
              ]}
            >
              <View style={styles.textContainer}>
                <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>
                  {displayMessage}
                </Text>
                <Text style={[styles.status, { color: isDarkMode ? '#bbb' : '#555' }]}>
                  Estado: {noti.status.charAt(0).toUpperCase() + noti.status.slice(1)}
                </Text>
                {/* Indicador de rol */}
                <Text style={[styles.roleText, { color: isDarkMode ? '#bbb' : '#555' }]}>
                  {rolTexto}
                </Text>
                <Text style={[styles.date, { color: isDarkMode ? '#888' : '#666' }]}>
                  {new Date(noti.createdAt).toLocaleDateString()}
                </Text>
              </View>

              {/* Botón “Ver oferta” sólo si soy receiver y status = pendiente */}
              {! (noti.type === 'friend_request') && (
                <TouchableOpacity style={styles.viewButton} onPress={() => handlePress(noti)}>
                  <Text style={styles.viewText}>
                    {noti.type === 'offer' && noti.role === 'receiver' && noti.status === 'pendiente'
                      ? 'Ver oferta'
                      : 'Ver'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Barra inferior */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.iconButton} onPress={goLibrary}>
          <Ionicons name="book-outline" size={24} color={isDarkMode ? '#fff' : '#000'} />
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
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#121212' : '#fff',
    },
    searchContainer: {
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 24 : 24,
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    searchInput: {
      borderWidth: 1,
      borderRadius: 6,
      padding: 8,
      marginBottom: 12,
    },
    filterContainer: {
      paddingBottom: 12,
    },
    filterButton: {
      marginRight: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: isDarkMode ? '#333' : '#eee',
    },
    filterButtonActive: {
      backgroundColor: '#6A0DAD',
    },
    filterText: {
      color: '#fff',
      fontSize: 14,
    },
    notificationBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      marginBottom: 12,
      backgroundColor: isDarkMode ? '#333' : '#eee',
      borderRadius: 8,
    },
    textContainer: {
      flex: 1,
      marginRight: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    status: {
      fontSize: 14,
      marginBottom: 2,
    },
    roleText: {
      fontSize: 12,
      fontStyle: 'italic',
      marginBottom: 4,
    },
    date: {
      fontSize: 12,
      color: isDarkMode ? '#888' : '#666',
    },
    viewButton: {
      backgroundColor: '#6A0DAD',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
    },
    viewText: {
      color: '#fff',
      fontWeight: '600',
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
