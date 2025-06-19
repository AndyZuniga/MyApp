import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '@/utils/apiFetch';

type UserType = {
  _id: string;
  nombre: string;
  apellido: string;
  apodo: string;
  correo?: string;
};

export default function FriendsScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  const [userObj, setUserObj] = useState<any>(null);
  const [friends, setFriends] = useState<UserType[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<UserType[]>([]);
  const [showBlocked, setShowBlocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  const [pendingRequests, setPendingRequests] = useState<Record<string, string>>({});
  const [cancelModeUser, setCancelModeUser] = useState<string | null>(null);
  const [deleteModeUser, setDeleteModeUser] = useState<string | null>(null);

  const userId = userObj?._id ?? userObj?.id;

  // 1) Cargo usuario
  useEffect(() => {
    AsyncStorage.getItem('user')
      .then(data => data && setUserObj(JSON.parse(data)))
      .catch(err => console.error('[AsyncStorage]', err));
  }, []);

  // 2) Función para cargar solicitudes enviadas
  const loadSentRequests = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiFetch(`/friend-requests/sent?userId=${userId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { requests } = await res.json();
      const pending: Record<string, string> = {};
      (requests || []).forEach((x: any) => {
        const toId = typeof x.to === 'string' ? x.to : x.to._id;
        pending[toId] = x._id;
      });
      setPendingRequests(pending);
    } catch (err) {
      console.error('[friend-requests/sent]', err);
    }
  }, [userId]);

  // 3) Carga inicial de listas
  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    apiFetch(`/friends?userId=${userId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(({ friends }) => setFriends(friends || []))
      .catch(err => console.error('[friends/get]', err))
      .finally(() => setLoading(false));

    apiFetch(`/user-blocked?userId=${userId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(({ blocked }) => setBlockedUsers(blocked || []))
      .catch(err => console.error('[user-blocked]', err));

    loadSentRequests();
  }, [userId, loadSentRequests]);

  // 4) Cada vez que la pantalla gana foco, sólo recargo solicitudes
  useFocusEffect(
    useCallback(() => {
      loadSentRequests();
    }, [loadSentRequests])
  );

  // 5) Búsqueda de usuarios (dispara sólo en Enter o al presionar lupa)
  const searchUsers = async () => {
    const q = searchTerm.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await apiFetch(`/users/search?query=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { users } = await res.json();
      setSearchResults((users || []).filter((u: UserType) => u._id !== userId));
    } catch (err) {
      console.error('[searchUsers]', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // 6) Enviar solicitud
  const sendFriendRequest = async (toId: string) => {
    try {
      const res = await apiFetch(`/friend-request`, {
        method: 'POST',
        body: JSON.stringify({ from: userId, to: toId }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      const { request } = await res.json();
      setPendingRequests(prev => ({ ...prev, [toId]: request._id }));
      Alert.alert('Éxito', 'Solicitud enviada');
    } catch (err: any) {
      console.error('[sendFriendRequest]', err);
      Alert.alert(
        'Error',
        err.message.includes('ya enviada')
          ? 'Ya existe una solicitud pendiente'
          : `No se pudo enviar: ${err.message}`
      );
    }
  };

  // 7) Cancelar solicitud
  const cancelFriendRequest = async (toId: string) => {
    const reqId = pendingRequests[toId];
    if (!reqId) return;
    try {
      await apiFetch(`/friend-request/${reqId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      setPendingRequests(prev => {
        const copy = { ...prev };
        delete copy[toId];
        return copy;
      });
      setCancelModeUser(null);
      Alert.alert('Solicitud cancelada');
    } catch (err) {
      console.error('[cancelFriendRequest]', err);
      Alert.alert('Error', 'No se pudo cancelar');
    }
  };

  // 8) Eliminar amigo
  const handleRemoveFriend = (fId: string) => {
    apiFetch(`/friend-remove`, {
      method: 'POST',
      body: JSON.stringify({ userId, friendId: fId }),
    });
    setFriends(prev => prev.filter(x => x._id !== fId));
    setDeleteModeUser(null);
    Alert.alert('Amigo eliminado');
  };

  // 9) Bloquear / Desbloquear
  const handleBlockUser = (u: UserType) => {
    Alert.alert('Bloquear usuario', `¿Bloquear a ${u.nombre}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí',
        onPress: () => {
          apiFetch(`/user-block`, {
            method: 'POST',
            body: JSON.stringify({ blocker: userId, blocked: u._id }),
          });
          setFriends(prev => prev.filter(x => x._id !== u._id));
          setBlockedUsers(prev => [...prev, u]);
          setDeleteModeUser(null);
          Alert.alert('Usuario bloqueado');
        },
      },
    ]);
  };
  const handleUnblockUser = (u: UserType) => {
    Alert.alert('Desbloquear usuario', `¿Desbloquear a ${u.nombre}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí',
        onPress: () => {
          apiFetch(`/user-unblock`, {
            method: 'POST',
            body: JSON.stringify({ unblocker: userId, unblocked: u._id }),
          });
          setBlockedUsers(prev => prev.filter(x => x._id !== u._id));
          Alert.alert('Usuario desbloqueado');
        },
      },
    ]);
  };

  // 10) Renderizado
  const friendIds = new Set(friends.map(f => f._id));
  const listToRender = showBlocked
    ? blockedUsers
    : searchTerm
    ? searchResults
    : friends;

  const renderContent = () => {
    if (loading) return <ActivityIndicator style={styles.loading} />;
    if (!showBlocked && searching) return <ActivityIndicator style={styles.loading} />;

    return (
      <ScrollView contentContainerStyle={styles.listContainer}>
        {listToRender.map(u => {
          const isFriend = friendIds.has(u._id);
          const isPending = Boolean(pendingRequests[u._id]);
          const label = isFriend ? 'Amigo' : isPending ? 'Enviada' : 'Agregar';

          return (
            <View key={u._id} style={styles.userBox}>
              <TouchableOpacity
                style={styles.userInfo}
                onPress={() =>
                  isFriend &&
                  router.push({
                    pathname: '/friends-library',
                    params: { friendId: u._id, friendName: `${u.nombre} ${u.apellido}` },
                  })
                }
                activeOpacity={0.7}
              >
                <Text style={[styles.userName, { color: isDarkMode ? '#fff' : '#000' }]}>
                  {u.nombre} {u.apellido} (@{u.apodo})
                </Text>
              </TouchableOpacity>

              {!showBlocked && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[
                      styles.friendButton,
                      isPending ? styles.addedButton : styles.addButton,
                    ]}
                    onPress={() => {
                      if (isFriend) setDeleteModeUser(u._id);
                      else if (isPending) setCancelModeUser(u._id);
                      else sendFriendRequest(u._id);
                    }}
                    disabled={isPending}
                  >
                    <Text style={styles.buttonText}>{label}</Text>
                  </TouchableOpacity>

                  {cancelModeUser === u._id && isPending && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => cancelFriendRequest(u._id)}
                    >
                      <Text style={styles.cancelText}>Cancelar solicitud</Text>
                    </TouchableOpacity>
                  )}

                  {deleteModeUser === u._id && (
                    <>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleRemoveFriend(u._id)}
                      >
                        <Text style={styles.deleteText}>Eliminar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.blockButton}
                        onPress={() => handleBlockUser(u)}
                      >
                        <Text style={styles.blockText}>Bloquear</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              {showBlocked && (
                <TouchableOpacity
                  style={styles.unblockButton}
                  onPress={() => handleUnblockUser(u)}
                >
                  <Text style={styles.unblockText}>Desbloquear</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  // 11) Opciones y navegación
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
  const goHome = () => router.push('/home');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>
          Amigos
        </Text>
        <TouchableOpacity
          onPress={() => {
            setShowBlocked(prev => !prev);
            setSearchTerm('');
            setSearchResults([]);
          }}
        >
          <Ionicons
            name="ban-outline"
            size={24}
            color={isDarkMode ? '#fff' : '#000'}
            style={{ transform: [{ rotate: showBlocked ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder={showBlocked ? 'Filtrar bloqueados' : 'Buscar usuario'}
          placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
          value={searchTerm}
          onChangeText={text => setSearchTerm(text)}
          editable={!showBlocked}
          returnKeyType="search"
          onSubmitEditing={searchUsers}
        />
        {!showBlocked && (
          <TouchableOpacity onPress={searchUsers} style={styles.searchIcon}>
            <Ionicons name="search-outline" size={24} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {renderContent()}

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            if (!userObj) return Alert.alert('Usuario no disponible');
            const param = encodeURIComponent(JSON.stringify(userObj));
            router.push({ pathname: '/library', params: { usuario: param } });
          }}
        >
          <Ionicons name="book" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={goHome}>
          <Image
            source={require('@/assets/images/pokeball.png')}
            style={[styles.homeIcon, { tintColor: isDarkMode ? '#fff' : '#000' }]}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={async () => {
            const raw = await AsyncStorage.getItem('user');
            const stored = raw ? JSON.parse(raw) : null;
            if (stored) router.push(`/notifications?userId=${stored._id ?? stored.id}`);
            else Alert.alert('Error', 'No se pudo recuperar usuario');
          }}
        >
          <Ionicons name="notifications-outline" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={showOptions}>
          <Ionicons name="person" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (dark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: dark ? '#121212' : '#fff' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 24,
      paddingTop: 40,
      borderBottomWidth: 1,
      borderBottomColor: dark ? '#333' : '#ccc',
    },
    title: { fontSize: 24, fontWeight: '600' },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      margin: 24,
      backgroundColor: dark ? '#1e1e1e' : '#f0f0f0',
      borderRadius: 6,
    },
    input: {
      flex: 1,
      height: 40,
      color: dark ? '#fff' : '#000',
      paddingHorizontal: 12,
    },
    searchIcon: { marginLeft: 8 },
    loading: { marginTop: 20 },
    listContainer: { padding: 16,
      paddingBottom: 60,
     },
    userBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      marginBottom: 12,
      backgroundColor: dark ? '#1e1e1e' : '#f9f9f9',
      borderRadius: 6,
    },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '500' },
    actions: { flexDirection: 'column', alignItems: 'flex-end' },
    friendButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
    addButton: { backgroundColor: '#6A0DAD' },
    addedButton: { backgroundColor: '#888' },
    cancelButton: {
      marginTop: 4,
      backgroundColor: '#D32F2F',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    cancelText: { color: '#fff', fontWeight: '600' },
    deleteButton: {
      marginTop: 4,
      backgroundColor: '#D32F2F',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    deleteText: { color: '#fff', fontWeight: '600' },
    blockButton: {
      marginTop: 4,
      backgroundColor: '#FFA000',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    blockText: { color: '#fff', fontWeight: '600' },
    unblockButton: {
      marginTop: 4,
      backgroundColor: '#388E3C',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    unblockText: { color: '#fff', fontWeight: '600' },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      height: 60,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      backgroundColor: dark ? '#1e1e1e' : '#fff',
      borderTopWidth: 1,
      borderTopColor: dark ? '#333' : '#ccc',
    },
    iconButton: { padding: 8 },
    homeIcon: { width: 28, height: 28 },
  });
