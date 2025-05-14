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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function FriendsScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  const [userObj, setUserObj] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState<boolean>(true);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  // Recuperar usuario almacenado
  useEffect(() => {
    AsyncStorage.getItem('user')
      .then(data => data && setUserObj(JSON.parse(data)))
      .catch(err => console.error('[AsyncStorage] error:', err));
  }, []);

  // Cargar lista de amigos
  useEffect(() => {
    const loadFriends = async () => {
      if (!userObj) return;
      try {
        const resp = await fetch(
          `https://myappserve-go.onrender.com/friends?userId=${userObj.id}`
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const { friends } = await resp.json();
        setFriends(friends || []);
      } catch (err) {
        console.error('[friends/get] error:', err);
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    };
    loadFriends();
  }, [userObj]);

  // Buscar usuarios (nombre, apellido, apodo, o id, case-insensitive)
  const searchUsers = async () => {
    const q = searchTerm.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const resp = await fetch(
        `https://myappserve-go.onrender.com/users/search?query=${encodeURIComponent(q)}`
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { users } = await resp.json();
      setSearchResults(users || []);
    } catch (err) {
      console.error('[searchUsers] error:', err);
      setSearchResults([]);
      Alert.alert('Error', 'No se pudo buscar usuarios: ' + (err as Error).message);
    } finally {
      setSearching(false);
    }
  };

  // Enviar solicitud de amistad
  const sendFriendRequest = async (friendId: string) => {
    if (!userObj) return;
    try {
      const resp = await fetch(
        `https://myappserve-go.onrender.com/friend-request`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: userObj.id, to: friendId }),
        }
      );
      if (!resp.ok) {
        let errorMsg = `HTTP ${resp.status}`;
        try {
          const errJson = await resp.json();
          if (errJson.error) errorMsg = errJson.error;
        } catch {}
        throw new Error(errorMsg);
      }
      // Marcar como pendiente
      setPendingRequests(prev => new Set(prev).add(friendId));
      Alert.alert('Éxito', 'Solicitud enviada correctamente');
      router.push('/notifications');
    } catch (err) {
      console.error('[sendFriendRequest] error:', err);
      Alert.alert('Error', 'No se pudo enviar la solicitud: ' + (err as Error).message);
    }
  };

  // Render de cada usuario
  const renderUsers = (list: any[]) => (
    list.map(user => (
      <View key={user._id} style={styles.userBox}>
        <Text style={[styles.userName, { color: isDarkMode ? '#fff' : '#000' }]}>
          {user.nombre} {user.apellido}
        </Text>
        <Text style={[styles.userDetail, { color: isDarkMode ? '#aaa' : '#555' }]}>
          {user.apodo}
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.friendButton, styles.addButton]}
            onPress={() => sendFriendRequest(user._id)}
            disabled={pendingRequests.has(user._id)}
          >
            <Text style={styles.buttonText}>
              {pendingRequests.has(user._id) ? 'Enviada' : 'Agregar amigo'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.friendButton, styles.blockButton]}
            onPress={() => Alert.alert('Bloquear', `Has bloqueado a ${user.apodo}`)}
          >
            <Text style={styles.buttonText}>Bloquear usuario</Text>
          </TouchableOpacity>
        </View>
      </View>
    ))
  );

  // Determinar contenido principal
  let content;
  if (searchTerm.trim() !== '') {
    if (searching) {
      content = <ActivityIndicator style={styles.loading} />;
    } else if (searchResults.length === 0) {
      content = (
        <Text style={[styles.emptyText, { color: isDarkMode ? '#fff' : '#000' }]}>Usuario No Existe</Text>
      );
    } else {
      content = <ScrollView contentContainerStyle={styles.listContainer}>{renderUsers(searchResults)}</ScrollView>;
    }
  } else {
    content = loadingFriends
      ? <ActivityIndicator style={styles.loading} />
      : <ScrollView contentContainerStyle={styles.listContainer}>{renderUsers(friends)}</ScrollView>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Amigos</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Buscar usuario"
          placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
          value={searchTerm}
          onChangeText={setSearchTerm}
          returnKeyType="search"
          onSubmitEditing={searchUsers}
        />
        <TouchableOpacity onPress={searchUsers} style={styles.searchButton}>
          <Ionicons name="search-outline" size={24} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>

      {content}

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.replace('/home')}>
          <Ionicons name="home" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/library')}>
          <Ionicons name="book" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/friends')}>
          <Ionicons name="people-outline" size={28} color="#6A0DAD" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDarkMode ? '#121212' : '#fff' },
    header: { padding: 24, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#333' : '#ccc' },
    title: { fontSize: 24, fontWeight: '600' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, margin: 24, backgroundColor: isDarkMode ? '#1e1e1e' : '#f0f0f0', borderRadius: 6 },
    input: { flex: 1, height: 40, color: isDarkMode ? '#fff' : '#000', paddingHorizontal: 12 },
    searchButton: { marginLeft: 8 },
    loading: { marginTop: 20 },
    listContainer: { padding: 16, paddingBottom: 100 },
    userBox: { padding: 12, marginBottom: 12, backgroundColor: isDarkMode ? '#1e1e1e' : '#f9f9f9', borderRadius: 6 },
    userName: { fontSize: 16, fontWeight: '500' },
    userDetail: { fontSize: 14, marginTop: 4 },
    emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16 },
    actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    friendButton: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center', marginHorizontal: 4 },
    addButton: { backgroundColor: '#6A0DAD' },
    blockButton: { backgroundColor: '#d9534f' },
    buttonText: { color: '#fff', fontWeight: '600' },
    bottomBar: { position: 'absolute', bottom: 0, width: '100%', height: 60, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderTopWidth: 1, borderTopColor: isDarkMode ? '#333' : '#ccc' },
    iconButton: { padding: 8 },
  });
