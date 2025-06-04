// notifications.tsx
// Versión actualizada: 2025-06-15 – Agregada función de eliminar notificaciones mediante presión prolongada.

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

type NotificationType = {
  _id: string;
  type: 'offer' | 'friend_request' | 'system';
  role: 'sender' | 'receiver';
  message: string;
  isRead: boolean;
  status: 'pendiente' | 'aceptada' | 'rechazada';
  partner?: { _id: string; nombre: string; apodo: string };
  friendRequestId?: string;
  amount?: number;
  cards?: Array<{ cardId: string; quantity: number; name?: string; image?: string }>;
  createdAt: string;
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

  // Guardamos el ID del usuario actual para distinguir rol (emisor/receptor)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Para saber qué notificación está en "modo borrar" (mostrar basura)
  const [trashModeId, setTrashModeId] = useState<string | null>(null);

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

  /** 
   * Carga el ID del usuario desde AsyncStorage y luego obtiene notificaciones. 
   */
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

  /**
   * Obtiene las notificaciones del backend según userId.
   */
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

  /**
   * Cada vez que la pantalla toma foco, recarga notificaciones.
   * Ya no usamos setInterval; solo recargamos al enfocarse.
   */
  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        fetchNotifications(currentUserId);
      }
      return () => {};
    }, [currentUserId, fetchNotifications])
  );

  /**
   * Marca una notificación como leída en el backend y en el estado local.
   */
  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('markAsRead:', err);
    }
  };

  /**
   * Elimina una notificación (requiere confirmación).
   */
  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/notifications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar notificación');
      // Remuevo localmente
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err: any) {
      console.error('deleteNotification:', err);
      Alert.alert('Error', 'No se pudo eliminar la notificación');
    }
  };

  /**
   * Maneja la navegación al pulsar “Ver” o “Ver oferta”.
   * Si la oferta está pendiente y rol = receiver → abre judge-offer.
   * En otro caso abre my-offer.
   * Luego de cualquier acción, recarga la lista.
   */
  const handlePress = async (noti: NotificationType) => {
    await markAsRead(noti._id);

    if (noti.type === 'offer') {
      if (!currentUserId) {
        Alert.alert('Error', 'Usuario no disponible');
        return;
      }

      const cardsParam = encodeURIComponent(JSON.stringify(noti.cards || []));
      const amountParam = noti.amount != null ? noti.amount.toString() : '0';

      // RECEPTOR de oferta pendiente → “Ver oferta” → judge-offer.tsx
      if (noti.status === 'pendiente' && noti.role === 'receiver') {
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

      // En cualquier otro caso → historial (my-offer.tsx)
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
    // Las “friend_request” usan sus propios botones Aceptar/Rechazar

    // Finalmente, recargo la lista para asegurarme de reflejar cualquier cambio.
    if (currentUserId) fetchNotifications(currentUserId);
  };

  /**
   * Construye el texto que se muestra en cada tarjeta de notificación,
   * usando “Nombre (@apodo)” en lugar de solo apodo.
   */
  const buildDisplayMessage = (noti: NotificationType): string => {
    if (noti.type === 'friend_request') {
      // Construimos siempre “Nombre (@apodo)”:
      if (noti.role === 'receiver') {
        // Receptor recibe “Nueva solicitud de amistad de [nombre(@apodo)]”
        return `Nueva solicitud de amistad de ${noti.partner?.nombre} (@${noti.partner?.apodo})`;
      } else {
        // Emisor ve “Enviaste una solicitud a [nombre(@apodo)]”
        return `Enviaste una solicitud a ${noti.partner?.nombre} (@${noti.partner?.apodo})`;
      }
    }

    // Para ofertas:
    // 1) Si rol = receiver y estado pendiente → “Has recibido una oferta de [Nombre (@apodo)]”
    if (noti.status === 'pendiente' && noti.role === 'receiver') {
      return `Has recibido una oferta de ${noti.partner?.nombre} (@${noti.partner?.apodo})`;
    }

    // 2) Si rol = sender y estado pendiente → “Esperando respuesta de [Nombre (@apodo)]”
    if (noti.status === 'pendiente' && noti.role === 'sender') {
      return `Esperando respuesta de ${noti.partner?.nombre} (@${noti.partner?.apodo})`;
    }

    // 3) Oferta aceptada/rechazada:
    //    • Si rol = sender → “Tu oferta fue [aceptada/rechazada] por [Nombre (@apodo)]”
    if (noti.status !== 'pendiente' && noti.role === 'sender') {
      const verbo = noti.status === 'aceptada' ? 'aceptada' : 'rechazada';
      return `Tu oferta fue ${verbo} por ${noti.partner?.nombre} (@${noti.partner?.apodo})`;
    }

    //    • Si rol = receiver → “Has [aceptado/rechazado] la oferta de [Nombre (@apodo)]”
    if (noti.status !== 'pendiente' && noti.role === 'receiver') {
      const verbo = noti.status === 'aceptada' ? 'aceptado' : 'rechazado';
      return `Has ${verbo} la oferta de ${noti.partner?.nombre} (@${noti.partner?.apodo})`;
    }

    // Si no encaja en ningún caso, devolvemos el mensaje crudo:
    return noti.message;
  };

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((noti) => {
        const textMatch =
          noti.message.toLowerCase().includes(search.toLowerCase()) ||
          (noti.partner?.apodo || '').toLowerCase().includes(search.toLowerCase()) ||
          (noti.partner?.nombre || '').toLowerCase().includes(search.toLowerCase());
        if (!textMatch) return false;
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
      <ScrollView
        contentContainerStyle={[
          styles.searchContainer,
          { paddingBottom: 80 }, // <-- espacio extra para que la última notificación no quede tapada
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Input de búsqueda */}
        <TextInput
          style={[
            styles.searchInput,
            {
              color: isDarkMode ? '#fff' : '#000',
              borderColor: isDarkMode ? '#555' : '#ccc',
            },
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
          {Object.values(FilterOption).map((opt) => (
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
        {filteredNotifications.map((noti) => {
          const isFriendRequest = noti.type === 'friend_request';
          const isPending = noti.status === 'pendiente';
          const isReceivedRequest =
            isFriendRequest &&
            isPending &&
            noti.role === 'receiver';

          // Texto a mostrar con “Nombre (@apodo)”
          const displayMessage = buildDisplayMessage(noti);

          // Ocultamos el botón “Ver” si soy EMISOR en notificación de solicitud
          const hideViewButtonForFriendSender =
            isFriendRequest && noti.role === 'sender';

          return (
            <TouchableOpacity
              key={noti._id}
              style={[
                styles.notificationBox,
                noti.isRead ? null : { borderWidth: 1, borderColor: '#6A0DAD' },
              ]}
              activeOpacity={0.9}
              onLongPress={() => {
                // Al presionar prolongado, activamos el modo "mostrar basura" para esta notificación
                setTrashModeId((prev) => (prev === noti._id ? null : noti._id));
              }}
            >
              <View style={styles.textContainer}>
                <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>
                  {displayMessage}
                </Text>
                <Text style={[styles.status, { color: isDarkMode ? '#bbb' : '#555' }]}>
                  Estado: {noti.status.charAt(0).toUpperCase() + noti.status.slice(1)}
                </Text>
                <Text style={[styles.roleText, { color: isDarkMode ? '#aaa' : '#444' }]}>
                  Rol: {noti.role === 'receiver' ? 'Receptor' : 'Emisor'}
                </Text>
                <Text style={[styles.date, { color: isDarkMode ? '#888' : '#666' }]}>
                  {new Date(noti.createdAt).toLocaleDateString()}
                </Text>
              </View>

              {/* Si la notificación está en trashMode, mostramos ícono de basurero */}
              {trashModeId === noti._id ? (
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Eliminar notificación',
                      '¿Estás seguro de eliminar esta notificación?',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Eliminar',
                          style: 'destructive',
                          onPress: async () => {
                            await deleteNotification(noti._id);
                            setTrashModeId(null);
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={24}
                    color={isDarkMode ? '#f55' : '#900'}
                  />
                </TouchableOpacity>
              ) : (
                // Si no estamos en trashMode, renderizamos botones normales
                <View style={styles.buttonsContainer}>
                  {/* Botones para solicitud de amistad */}
                  {isReceivedRequest && (
                    <View style={styles.friendButtonsContainer}>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={async () => {
                          await acceptFriendRequest(noti);
                          if (currentUserId) fetchNotifications(currentUserId);
                        }}
                      >
                        <Text style={styles.buttonText}>Aceptar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={async () => {
                          await rejectFriendRequest(noti);
                          if (currentUserId) fetchNotifications(currentUserId);
                        }}
                      >
                        <Text style={styles.buttonText}>Rechazar</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Si ya se aceptó la solicitud */}
                  {isFriendRequest && noti.status === 'aceptada' && (
                    <TouchableOpacity style={styles.friendsButton} disabled>
                      <Text style={styles.buttonText}>Amigos</Text>
                    </TouchableOpacity>
                  )}

                  {/* Si ya se rechazó la solicitud */}
                  {isFriendRequest && noti.status === 'rechazada' && (
                    <TouchableOpacity style={styles.rejectedButton} disabled>
                      <Text style={styles.buttonText}>Rechazada</Text>
                    </TouchableOpacity>
                  )}

                  {/* Botón para ofertas y sistema */}
                  {!isFriendRequest && (
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={async () => {
                        await handlePress(noti);
                      }}
                    >
                      <Text style={styles.viewText}>
                        {noti.type === 'offer' && noti.role === 'receiver' && noti.status === 'pendiente'
                          ? 'Ver oferta'
                          : 'Ver'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Reserva espacio si ocultamos el botón “Ver” */}
                  {isFriendRequest && hideViewButtonForFriendSender && <View style={styles.spacer} />}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Barra inferior */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.iconButton} onPress={goLibrary}>
          <Ionicons name="book-outline" size={24} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/friends')}>
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

// Función para aceptar solicitud de amistad
async function acceptFriendRequest(noti: NotificationType) {
  if (!noti.friendRequestId) {
    Alert.alert('Error', 'No se encontró el ID de la solicitud');
    return;
  }
  try {
    const res = await fetch(`${API_URL}/friend-request/${noti.friendRequestId}/accept`, { method: 'POST' });
    if (!res.ok) throw new Error('Error al aceptar solicitud');
    Alert.alert('Éxito', 'Solicitud aceptada');
  } catch (err: any) {
    console.error('acceptFriendRequest:', err);
    Alert.alert('Error', 'Error al aceptar solicitud');
  }
}

// Función para rechazar solicitud de amistad
async function rejectFriendRequest(noti: NotificationType) {
  if (!noti.friendRequestId) {
    Alert.alert('Error', 'No se encontró el ID de la solicitud');
    return;
  }
  try {
    const res = await fetch(`${API_URL}/friend-request/${noti.friendRequestId}/reject`, { method: 'POST' });
    if (!res.ok) throw new Error('Error al rechazar solicitud');
    Alert.alert('Información', 'Solicitud rechazada');
  } catch (err: any) {
    console.error('rejectFriendRequest:', err);
    Alert.alert('Error', 'Error al rechazar solicitud');
  }
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
      marginBottom: 4,
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
    buttonsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    friendButtonsContainer: {
      flexDirection: 'row',
    },
    acceptButton: {
      backgroundColor: '#388E3C',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      marginRight: 4,
    },
    rejectButton: {
      backgroundColor: '#D32F2F',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    friendsButton: {
      backgroundColor: '#6A0DAD',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    rejectedButton: {
      backgroundColor: '#D32F2F',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    buttonText: {
      color: '#fff',
      fontWeight: '600',
    },
    viewButton: {
      backgroundColor: '#6A0DAD',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      marginLeft: 4,
    },
    viewText: {
      color: '#fff',
      fontWeight: '600',
    },
    spacer: {
      width: 0, // Usado para mantener consistencia (sin botón "Ver")
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
