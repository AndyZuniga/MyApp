//dia 6
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

// URL de la API del backend desplegado en Render
const API_URL = 'https://myappserve-go.onrender.com';

// Definición del tipo de usuario que maneja la pantalla
type UserType = {
  _id: string;
  nombre: string;
  apellido: string;
  apodo: string;
  correo?: string;
};

export default function FriendsScreen() {
  // Hook para la navegación entre pantallas
  const router = useRouter();
  // Determina si el tema actual es oscuro o claro
  const isDarkMode = useColorScheme() === 'dark';
  // Obtiene los estilos según el modo de color
  const styles = getStyles(isDarkMode);

  // Estado que almacena el objeto de usuario (cargado desde AsyncStorage)
  const [userObj, setUserObj] = useState<any>(null);
  // Estado para la lista de amigos
  const [friends, setFriends] = useState<UserType[]>([]);
  // Estado para la lista de usuarios bloqueados
  const [blockedUsers, setBlockedUsers] = useState<UserType[]>([]);
  // Estado que controla si se muestran los usuarios bloqueados o los amigos
  const [showBlocked, setShowBlocked] = useState<boolean>(false);
  // Estado de carga general (mientras se obtienen amigos o bloqueados)
  const [loading, setLoading] = useState<boolean>(true);

  // Estado para término de búsqueda ingresado en el TextInput
  const [searchTerm, setSearchTerm] = useState<string>('');
  // Estado para los resultados de búsqueda local
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  // Indicador de búsqueda en curso
  const [searching, setSearching] = useState<boolean>(false);

  // Estado que guarda los IDs de solicitudes pendientes de amistad
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  // Estado para controlar el modo de eliminación/bloqueo al pulsar un usuario amigo
  const [deleteModeUser, setDeleteModeUser] = useState<string | null>(null);

  // Función para navegar a la pantalla Home
  const goHome = () => router.push('/home');

  // Carga del usuario almacenado en AsyncStorage (se ejecuta solo al montar el componente)
  useEffect(() => {
    AsyncStorage.getItem('user')
      .then(data => {
        if (data) {
          // Si existe un usuario, lo parsea y lo guarda en el estado
          setUserObj(JSON.parse(data));
        }
      })
      .catch(err => console.error('[AsyncStorage] error:', err));
  }, []);

  // Cuando cambia userObj, carga la lista de amigos y usuarios bloqueados desde el backend
  useEffect(() => {
    if (!userObj) return;

    // Inicia indicador de carga
    setLoading(true);

    // Petición para obtener amigos del usuario
    fetch(`${API_URL}/friends?userId=${userObj.id}`)
      .then(res =>
        res.ok
          ? res.json()
          : Promise.reject(`HTTP ${res.status}`)
      )
      .then(({ friends }) =>
        // Si la respuesta incluye amigos, los guarda en el estado; sino, lista vacía
        setFriends(friends || [])
      )
      .catch(err => {
        console.error('[friends/get]', err);
        setFriends([]);
      })
      .finally(() => setLoading(false));

    // Petición para obtener usuarios bloqueados por el usuario
    fetch(`${API_URL}/user-blocked?userId=${userObj.id}`)
      .then(res =>
        res.ok
          ? res.json()
          : Promise.reject(`HTTP ${res.status}`)
      )
      .then(({ blocked }) =>
        // Si la respuesta incluye bloqueados, los guarda; sino, lista vacía
        setBlockedUsers(blocked || [])
      )
      .catch(err => {
        console.error('[user-blocked]', err);
        setBlockedUsers([]);
      });
  }, [userObj]);

  // Crea un Set de IDs de amigos para consultas rápidas
  const friendIds = new Set(friends.map(f => f._id));

  // Función para buscar usuarios localmente en modo amigos

const searchUsers = () => {
  const raw = searchTerm.trim();
  if (!raw) {
    setSearchResults([]);
    return;
  }
  setSearching(true);

  fetch(`${API_URL}/users/search?query=${encodeURIComponent(raw)}`)
    .then(res =>
      res.ok
        ? res.json()
        : Promise.reject(`HTTP ${res.status}`)
    )
    .then(({ users }) => {
      // Si userObj aún no está definido, devolvemos todos
      if (!userObj) {
        setSearchResults(users || []);
        return;
      }
      // Filtramos para que el propio usuario no aparezca 
      const filtered = (users || []).filter(u => u._id !== userObj.id);
      setSearchResults(filtered);
    })
    .catch(err => {
      console.error('[searchUsers]', err);
      setSearchResults([]);
    })
    .finally(() => setSearching(false));
};



  // Función para enviar una solicitud de amistad
  const sendFriendRequest = async (friendId: string) => {
    if (!userObj) return;
    try {
      const res = await fetch(`${API_URL}/friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Envía el ID del usuario actual y el del usuario al que se envía la solicitud
        body: JSON.stringify({ from: userObj.id, to: friendId }),
      });
      const text = await res.text();
      const json = (() => { try { return JSON.parse(text); } catch { return null; } })();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      // Agrega el ID a pendingRequests para marcar la solicitud como enviada
      setPendingRequests(prev => new Set(prev).add(friendId));
      Alert.alert('Éxito', 'Solicitud enviada');
    } catch (err: any) {
      console.error('[sendFriendRequest]', err);
      Alert.alert('Error', `No se pudo enviar solicitud: ${err.message}`);
    }
  };

  // Función para eliminar un amigo (sin confirmación adicional)
  const handleRemoveFriend = (friendId: string) => {
    // Petición para eliminar la relación de amistad en backend
    fetch(`${API_URL}/friend-remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userObj.id, friendId }),
    });
    // Elimina el amigo de la lista local
    setFriends(prev => prev.filter(f => f._id !== friendId));
    // Sale del modo eliminación
    setDeleteModeUser(null);
    Alert.alert('Eliminado', 'Amigo eliminado');
  };

  // Función para bloquear un usuario (muestra un Alert de confirmación)
  const handleBlockUser = (user: any) => {
    const fullName = `${user.nombre} ${user.apellido}`;
    Alert.alert(
      'Bloquear usuario',
      `¿Estás seguro que quieres bloquear a ${fullName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí', onPress: () => {
            // Si confirma, envía petición de bloqueo
            fetch(`${API_URL}/user-block`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ blocker: userObj.id, blocked: user._id }),
            });
            // Actualiza listas locales: quita de amigos y añade a bloqueados
            setFriends(prev => prev.filter(f => f._id !== user._id));
            setBlockedUsers(prev => [...prev, user]);
            setDeleteModeUser(null);
            Alert.alert('Bloqueado', `${fullName} bloqueado`);
          }
        },
      ]
    );
  };

  // Función para desbloquear un usuario (muestra un Alert de confirmación)
  const handleUnblockUser = (user: any) => {
    Alert.alert(
      'Desbloquear usuario',
      `¿Quieres desbloquear a ${user.nombre} ${user.apellido}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí', onPress: () => {
            // Si confirma, envía petición de desbloqueo
            fetch(`${API_URL}/user-unblock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ unblocker: userObj.id, unblocked: user._id }),
            });
            // Elimina de la lista de bloqueados local
            setBlockedUsers(prev => prev.filter(b => b._id !== user._id));
            Alert.alert('Desbloqueado', `${user.nombre} ${user.apellido} desbloqueado`);
          }
        },
      ]
    );
  };

  // Determina qué lista se mostrará en pantalla:
  // - Si showBlocked es true, muestra usuarios bloqueados.
  // - Si se ingresó un término de búsqueda (searchTerm), muestra resultados de búsqueda.
  // - En otro caso, muestra la lista de amigos.
  let listToRender;
  if (showBlocked) listToRender = blockedUsers;
  else if (searchTerm.trim()) listToRender = searchResults;
  else listToRender = friends;

  // Renderizado condicional del contenido principal (lista de usuarios)
  const renderContent = () => {
    if (loading) {
      // Si está cargando datos (amigos/bloqueados), muestra spinner
      return <ActivityIndicator style={styles.loading} />;
    }
    if (!showBlocked && searching) {
      // Si está realizando búsqueda, muestra spinner
      return <ActivityIndicator style={styles.loading} />;
    }
    // Si no está cargando, muestra la lista
    return (
      <ScrollView contentContainerStyle={styles.listContainer}>
        {listToRender.map(user => {
          // Verifica si el usuario en la lista es ya amigo
          const isFriend = friendIds.has(user._id);
          // Verifica si hay solicitud pendiente para ese usuario
          const isPending = pendingRequests.has(user._id);
          // Deshabilita botón si ya es amigo o solicitud pendiente
          const disabled = isFriend || isPending;
          // Label del botón según estado
          const label = isFriend ? 'Amigo' : isPending ? 'Enviada' : 'Agregar';

          return (
            <TouchableOpacity
              key={user._id}
              style={styles.userBox}
              onPress={() => {
                // Si el usuario ya es amigo y no está mostrando bloqueados, navega a su biblioteca
                if (!showBlocked && isFriend) {
                  router.push({
                    pathname: '/friends-library',
                    params: { friendId: user._id, friendName: `${user.nombre} ${user.apellido}` },
                  });
                }
              }}
              activeOpacity={0.7}
            >
              {/* Muestra nombre completo y apodo */}
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: isDarkMode ? '#fff' : '#000' }]}>
                  {user.nombre} {user.apellido} (@{user.apodo})
                </Text>
              </View>

              {/* Botones de acción (Agregar, Eliminar, Bloquear, Desbloquear) */}
              <View style={styles.actions}>
                {/* Solo si no está mostrando bloqueados */}
                {!showBlocked && (
                  <TouchableOpacity
                    style={[styles.friendButton, disabled ? styles.addedButton : styles.addButton]}
                    onPress={() => {
                      // Si ya es amigo, activa modo eliminación
                      if (isFriend) {
                        setDeleteModeUser(user._id);
                      } else if (!disabled) {
                        // Si no es amigo ni pendiente, envía solicitud
                        sendFriendRequest(user._id);
                      }
                    }}
                    // Deshabilita si ya hay solicitud pendiente
                    disabled={isPending}
                  >
                    <Text style={styles.buttonText}>{label}</Text>
                  </TouchableOpacity>
                )}

                {/* Si está en modo eliminación y el usuario coincide */}
                {deleteModeUser === user._id && !showBlocked && (
                  <>
                    {/* Botón para eliminar amistad */}
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleRemoveFriend(user._id)}>
                      <Text style={styles.deleteText}>Eliminar</Text>
                    </TouchableOpacity>
                    {/* Botón para bloquear usuario */}
                    <TouchableOpacity style={styles.blockButton} onPress={() => handleBlockUser(user)}>
                      <Text style={styles.blockText}>Bloquear usuario</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Si está mostrando bloqueados, permite desbloquear */}
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
      {/* Header de la pantalla con título y botón para alternar entre amigos/bloqueados */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Amigos</Text>
        <TouchableOpacity
          onPress={() => {
            // Invierte el estado de mostrar bloqueados, limpia término de búsqueda y resultados
            setShowBlocked(prev => !prev);
            setSearchTerm('');
            setSearchResults([]);
          }}
        >
          <Ionicons
            name="ban-outline"
            size={24}
            color={isDarkMode ? '#fff' : '#000'}
            // Rota el ícono 180° si está en modo bloqueados
            style={{ transform: [{ rotate: showBlocked ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>
      </View>

      {/* Barra de búsqueda para filtrar usuarios */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          // Placeholder cambia si está en modo bloqueados
          placeholder={showBlocked ? 'Filtrar bloqueados' : 'Buscar usuario'}
          placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
          value={searchTerm}
          onChangeText={text => setSearchTerm(text)}
          // Solo permite editar si no está viendo bloqueados
          editable={!showBlocked}
          returnKeyType="search"
          onSubmitEditing={searchUsers}
        />
        {/* Ícono de búsqueda solo en modo amigos */}
        {!showBlocked && (
          <TouchableOpacity onPress={searchUsers} style={styles.searchIcon}>
            <Ionicons name="search-outline" size={24} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Renderiza la lista de amigos, resultados de búsqueda o bloqueados */}
      {renderContent()}

      {/* Barra inferior de navegación con íconos */}
      <View style={styles.bottomBar}>
        {/* Botón para ir a la librería del usuario */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            if (!userObj) return Alert.alert('Usuario no disponible');
            // Codifica el objeto usuario en la URL
            const usuarioParam = encodeURIComponent(JSON.stringify(userObj));
            router.push({ pathname: '/library', params: { usuario: usuarioParam } });
          }}
        >
          <Ionicons name="book" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>

        {/* Botón Home (Pokébola) */}
        <TouchableOpacity style={styles.iconButton} onPress={goHome}>
          <Image
            source={require('@/assets/images/pokeball.png')}
            style={[styles.homeIcon, { tintColor: isDarkMode ? '#fff' : '#000' }]}
          />
        </TouchableOpacity>

        {/* Botón para ir a notificaciones */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={async () => {
            // Recupera usuario en AsyncStorage y navega a pantalla de notificaciones
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

// Función que retorna los estilos según si el tema es oscuro o claro
const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#fff',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 24,
      paddingTop: 40,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#ccc',
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      margin: 24,
      backgroundColor: isDarkMode ? '#1e1e1e' : '#f0f0f0',
      borderRadius: 6,
    },
    input: {
      flex: 1,
      height: 40,
      color: isDarkMode ? '#fff' : '#000',
      paddingHorizontal: 12,
    },
    searchIcon: {
      marginLeft: 8,
    },
    loading: {
      marginTop: 20,
    },
    listContainer: {
      padding: 16,
    },
    userBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      marginBottom: 12,
      backgroundColor: isDarkMode ? '#1e1e1e' : '#f9f9f9',
      borderRadius: 6,
    },
    userName: {
      fontSize: 16,
      fontWeight: '500',
    },
    friendButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    addButton: {
      backgroundColor: '#6A0DAD',
    },
    addedButton: {
      backgroundColor: '#888',
    },
    deleteButton: {
      marginTop: 4,
      backgroundColor: '#D32F2F',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    deleteText: {
      color: '#fff',
      fontWeight: '600',
    },
    blockButton: {
      marginTop: 4,
      backgroundColor: '#FFA000',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    blockText: {
      color: '#fff',
      fontWeight: '600',
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      height: 60,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
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
    // Estilos para el botón de desbloquear (añadidos para consistencia)
    unblockButton: {
      marginTop: 4,
      backgroundColor: '#388E3C',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    unblockText: {
      color: '#fff',
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'column',
      alignItems: 'flex-end',
    },
  });