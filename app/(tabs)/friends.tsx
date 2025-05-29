import React, { useState, useEffect } from 'react';
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

// API del backend desplegado en Render
const API_URL = 'https://myappserve-go.onrender.com';

export default function FriendsScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  const [userObj, setUserObj] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [showBlocked, setShowBlocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [deleteModeUser, setDeleteModeUser] = useState<string | null>(null);

  // Navegar Home
  const goHome = () => router.push('/home');

  // Carga usuario y datos
  useEffect(() => {
    AsyncStorage.getItem('user')
      .then(data => { if (data) setUserObj(JSON.parse(data)); })
      .catch(err => console.error('[AsyncStorage] error:', err));
  }, []);

  // Carga amigos y bloqueados
  useEffect(() => {
    if (!userObj) return;
    setLoading(true);
    fetch(`${API_URL}/friends?userId=${userObj.id}`)
      .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
      .then(({ friends }) => setFriends(friends || []))
      .catch(err => { console.error('[friends/get]', err); setFriends([]); })
      .finally(() => setLoading(false));
    fetch(`${API_URL}/user-blocked?userId=${userObj.id}`)
      .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
      .then(({ blocked }) => setBlockedUsers(blocked || []))
      .catch(err => { console.error('[user-blocked]', err); setBlockedUsers([]); });
  }, [userObj]);

  const friendIds = new Set(friends.map(f => f._id));

  // Búsqueda local de usuarios (solo en modo amigos)
  const searchUsers = () => {
    const raw = searchTerm.trim();
    if (!raw) { setSearchResults([]); return; }
    setSearching(true);
    const tokens = raw.toLowerCase().split(/\s+/);
    fetch(`${API_URL}/users/all`)
      .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
      .then(({ users }) => {
        const filtered = (users || []).filter(u => {
          const nombre = u.nombre.toLowerCase();
          const apellido = u.apellido.toLowerCase();
          const apodo = u.apodo.toLowerCase();
          return tokens.every(t => nombre.includes(t) || apellido.includes(t) || apodo.includes(t));
        });
        setSearchResults(filtered);
      })
      .catch(err => { console.error('[searchUsers]', err); setSearchResults([]); })
      .finally(() => setSearching(false));
  };

  // Enviar solicitud
  const sendFriendRequest = async (friendId: string) => {
    if (!userObj) return;
    try {
      const res = await fetch(`${API_URL}/friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: userObj.id, to: friendId }),
      });
      const text = await res.text();
      const json = (() => { try { return JSON.parse(text); } catch { return null; } })();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setPendingRequests(prev => new Set(prev).add(friendId));
      Alert.alert('Éxito', 'Solicitud enviada');
    } catch (err: any) {
      console.error('[sendFriendRequest]', err);
      Alert.alert('Error', `No se pudo enviar solicitud: ${err.message}`);
    }
  };

  // Eliminar amigo
  const handleRemoveFriend = (friendId: string) => {
    fetch(`${API_URL}/friend-remove`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: userObj.id, friendId }),
    });
    setFriends(prev => prev.filter(f => f._id !== friendId));
    setDeleteModeUser(null);
    Alert.alert('Eliminado', 'Amigo eliminado');
  };

  // Bloquear usuario
  const handleBlockUser = (user: any) => {
    const fullName = `${user.nombre} ${user.apellido}`;
    Alert.alert(
      'Bloquear usuario',
      `¿Estás seguro que quieres bloquear a ${fullName}?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí', onPress: () => {
            fetch(`${API_URL}/user-block`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blocker: userObj.id, blocked: user._id }),
            });
            setFriends(prev => prev.filter(f => f._id !== user._id));
            setBlockedUsers(prev => [...prev, user]);
            setDeleteModeUser(null);
            Alert.alert('Bloqueado', `${fullName} bloqueado`);
          } },
      ]
    );
  };

  // Desbloquear usuario
  const handleUnblockUser = (user: any) => {
    Alert.alert(
      'Desbloquear usuario',
      `¿Quieres desbloquear a ${user.nombre} ${user.apellido}?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí', onPress: () => {
            fetch(`${API_URL}/user-unblock`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unblocker: userObj.id, unblocked: user._id }),
            });
            setBlockedUsers(prev => prev.filter(b => b._id !== user._id));
            Alert.alert('Desbloqueado', `${user.nombre} ${user.apellido} desbloqueado`);
          } },
      ]
    );
  };

  // Determinar lista a mostrar
  let listToRender;
  if (showBlocked) listToRender = blockedUsers;
  else if (searchTerm.trim()) listToRender = searchResults;
  else listToRender = friends;

  // Mostrar contenido
  const renderContent = () => {
    if (loading) return <ActivityIndicator style={styles.loading} />;
    if (!showBlocked && searching) return <ActivityIndicator style={styles.loading} />;
    return (
      <ScrollView contentContainerStyle={styles.listContainer}>
        {listToRender.map(user => {
          const isFriend = friendIds.has(user._id);
          const isPending = pendingRequests.has(user._id);
          const disabled = isFriend || isPending;
          const label = isFriend ? 'Amigo' : isPending ? 'Enviada' : 'Agregar';
          return (
            <TouchableOpacity
              key={user._id}
              style={styles.userBox}
              onPress={() => {
                if (!showBlocked && isFriend) {
                  router.push({ pathname: '/friends-library', params: { friendId: user._id, friendName: `${user.nombre} ${user.apellido}` } });
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: isDarkMode ? '#fff' : '#000' }]}>  
                  {user.nombre} {user.apellido} (@{user.apodo})
                </Text>
              </View>
              <View style={styles.actions}>
                {!showBlocked && (
                  <TouchableOpacity
                    style={[styles.friendButton, disabled ? styles.addedButton : styles.addButton]}
                    onPress={() => { isFriend ? setDeleteModeUser(user._id) : (!disabled && sendFriendRequest(user._id)); }}
                    disabled={isPending}
                  >
                    <Text style={styles.buttonText}>{label}</Text>
                  </TouchableOpacity>
                )}
                {deleteModeUser === user._id && !showBlocked && (
                  <>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleRemoveFriend(user._id)}>
                      <Text style={styles.deleteText}>Eliminar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.blockButton} onPress={() => handleBlockUser(user)}>
                      <Text style={styles.blockText}>Bloquear usuario</Text>
                    </TouchableOpacity>
                  </>
                )}
                {showBlocked && (
                  <TouchableOpacity style={styles.unblockButton} onPress={() => handleUnblockUser(user)}>
                    <Text style={styles.unblockText}>Desbloquear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header con filtro bloqueados */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Amigos</Text>
        <TouchableOpacity onPress={() => { setShowBlocked(prev => !prev); setSearchTerm(''); setSearchResults([]); }}>
          <Ionicons
            name="ban-outline"
            size={24}
            color={isDarkMode ? '#fff' : '#000'}
            style={{ transform: [{ rotate: showBlocked ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>
      </View>
      {/* Barra de búsqueda */}
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
      {renderContent()}
      {/* Barra inferior */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => {
          if (!userObj) return Alert.alert('Usuario no disponible');
          const usuarioParam = encodeURIComponent(JSON.stringify(userObj));
          router.push({ pathname: '/library', params: { usuario: usuarioParam } });
        }}>
          <Ionicons name="book" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={goHome}>
          <Image source={require('@/assets/images/pokeball.png')} style={[styles.homeIcon, { tintColor: isDarkMode ? '#fff' : '#000' }]} />
        </TouchableOpacity>
        <TouchableOpacity
  style={styles.iconButton}
  onPress={async () => {
    const raw = await AsyncStorage.getItem('user');
    const storedUser = raw ? JSON.parse(raw) : null;
    if (storedUser) {
      router.push(`/notifications?userId=${storedUser.id}`);
    } else {
      Alert.alert('Error', 'No se pudo recuperar el usuario');
    }
  }}
>
  <Ionicons name="notifications-outline" size={28} color={isDarkMode ? '#fff' : '#000'} />
</TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDarkMode ? '#121212' : '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#333' : '#ccc' },
  title: { fontSize: 24, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, margin: 24, backgroundColor: isDarkMode ? '#1e1e1e' : '#f0f0f0', borderRadius: 6 },
  input: { flex: 1, height: 40, color: isDarkMode ? '#fff' : '#000', paddingHorizontal: 12 },
  searchIcon: { marginLeft: 8 },
  loading: { marginTop: 20 },
  listContainer: { padding: 16 },
  userBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, marginBottom: 12, backgroundColor: isDarkMode ? '#1e1e1e' : '#f9f9f9', borderRadius: 6 },
  userName: { fontSize: 16, fontWeight: '500' },
  friendButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  addButton: { backgroundColor: '#6A0DAD' },
  addedButton: { backgroundColor: '#888' },
  deleteButton: { marginTop: 4, backgroundColor: '#D32F2F', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  deleteText: { color: '#fff', fontWeight: '600' },
  blockButton: { marginTop: 4, backgroundColor: '#FFA000', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  blockText: { color: '#fff', fontWeight: '600' },
  bottomBar: { position: 'absolute', bottom: 0, width: '100%', height: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderTopWidth: 1, borderTopColor: isDarkMode ? '#333' : '#ccc' },
  iconButton: { padding: 8 },
  homeIcon: { width: 28, height: 28 }
});
