import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Alert,
  Image,
  AsyncStorage
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://myappserve-go.onrender.com';

type NotificationType = {
  _id: string;
  type: 'offer' | 'friend_request' | 'system';
  message: string;
  isRead: boolean;
  status: 'pendiente' | 'aceptada' | 'rechazada';
  sender?: { _id: string; nombre: string; apodo: string };
  partner?: { _id: string; nombre: string; apodo: string };
  amount?: number;
  createdAt: string;
};

enum FilterOption {
  All = 'Todas',
  Pendiente = 'En espera',
  Aceptada = 'Aceptadas',
  Rechazada = 'Rechazadas',
  Solicitud = 'Solicitud'
}

export default function NotificationsScreen() {
  const params = useLocalSearchParams<{ userId?: string; newNotificationId?: string }>();
  const userId = params.userId as string;
  const newNotificationId = params.newNotificationId;
  const router = useRouter();

  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filter, setFilter] = useState<FilterOption>(FilterOption.All);

  const goHome = () => router.replace('/home');
  const goLibrary = () => router.push('/library');
  const goFriends = () => router.push('/friends');
  const showOptions = async () => {
    const raw = await AsyncStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    Alert.alert('Opciones', undefined, [
      { text: 'Mis datos', onPress: () => user && Alert.alert('Datos de usuario', `Apodo: ${user.apodo}\nCorreo: ${user.correo}`) },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: async () => { await AsyncStorage.removeItem('user'); router.replace('/login'); } },
      { text: 'Cancelar', style: 'cancel' }
    ]);
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
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
  }, [userId]);

  useFocusEffect(useCallback(() => { fetchNotifications(); }, [fetchNotifications]));

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('markAsRead:', err);
    }
  };

  const filteredNotifications = useMemo(() =>
    notifications.filter(noti => {
      const textMatch =
        noti.message.toLowerCase().includes(search.toLowerCase()) ||
        noti.sender?.apodo.toLowerCase().includes(search.toLowerCase()) ||
        noti.partner?.apodo.toLowerCase().includes(search.toLowerCase());
      if (!textMatch) return false;
      switch (filter) {
        case FilterOption.Pendiente: return noti.status === 'pendiente';
        case FilterOption.Aceptada: return noti.status === 'aceptada';
        case FilterOption.Rechazada: return noti.status === 'rechazada';
        case FilterOption.Solicitud: return noti.type === 'friend_request';
        default: return true;
      }
    })
  , [notifications, search, filter]);

  const handlePress = async (noti: NotificationType) => {
    await markAsRead(noti._id);
    if (noti.type === 'offer') {
      router.push(`/my-offer?cards=${encodeURIComponent(JSON.stringify(noti.cards||[]))}&offer=${noti.amount}&friendName=${noti.sender?.nombre}&friendApodo=${noti.sender?.apodo}&status=${noti.status}`);
    } else if (noti.type === 'friend_request') {
      router.push('/friend-requests');
    } else {
      Alert.alert('Notificación', noti.message);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large"/></View>;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.searchContainer} keyboardShouldPersistTaps="handled">
        <TextInput
          style={[styles.searchInput, { color: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? '#555' : '#ccc' }]}
          placeholder="Buscar..."
          placeholderTextColor={isDarkMode ? '#888' : '#666'}
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer} nestedScrollEnabled>
          {Object.values(FilterOption).map(opt => (
            <TouchableOpacity key={opt} style={[styles.filterButton, filter===opt && styles.filterButtonActive]} onPress={()=>setFilter(opt)}>
              <Text style={styles.filterText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {filteredNotifications.map(noti => (
          <View key={noti._id} style={[styles.notificationBox, newNotificationId===noti._id && {borderWidth:2,borderColor:'#6A0DAD'}]}>
            <View style={styles.textContainer}>
              <Text style={[styles.title, {color:isDarkMode?'#fff':'#000'}]}>{noti.message}</Text>
              <Text style={[styles.status, {color:isDarkMode?'#bbb':'#555'}]}>Estado: {noti.status.charAt(0).toUpperCase()+noti.status.slice(1)}</Text>
              <Text style={[styles.date, {color:isDarkMode?'#888':'#666'}]}>{new Date(noti.createdAt).toLocaleDateString()}</Text>
            </View>
            <TouchableOpacity style={styles.viewButton} onPress={()=>handlePress(noti)}>
              <Text style={styles.viewText}>Ver</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.iconButton} onPress={goLibrary}>
          <Ionicons name="book-outline" size={24} color={isDarkMode?'#fff':'#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={goHome}>
          <Image source={require('@/assets/images/pokeball.png')} style={styles.homeIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => {
          Alert.alert('Opciones', undefined, [
            { text: 'Mis datos', onPress: () => userObj && Alert.alert('Datos de usuario', `Apodo: ${userObj.apodo} Correo: ${userObj.correo}`) },
            { text: 'Cerrar Sesión', style: 'destructive', onPress: async () => { await AsyncStorage.removeItem('user'); router.replace('/login'); } },
            { text: 'Cancelar', style: 'cancel' },
          ]);
        }}>
          <Ionicons name="person" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { flex:1, backgroundColor: isDarkMode?'#121212':'#fff' },
  searchContainer: { padding:24,  paddingBottom: 16 },
  searchInput: { borderWidth:1, borderRadius:6, padding:8, marginBottom:12 },
  filterContainer: { paddingBottom:12 },
  filterButton: { marginRight:8, paddingHorizontal:12, paddingVertical:6, borderRadius:6, backgroundColor:isDarkMode?'#333':'#eee' },
  filterButtonActive: { backgroundColor:'#6A0DAD' },
  filterText: { color:'#fff', fontSize:14 },
  notificationBox: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, marginBottom:12, backgroundColor:isDarkMode?'#333':'#eee', borderRadius:8 },
  textContainer: { flex:1, marginRight:8 },
  title: { fontSize:16, fontWeight:'600', marginBottom:4 },
  status: { fontSize:14, marginBottom:4 },
  date: { fontSize:12, color:isDarkMode?'#888':'#666' },
  viewButton: { backgroundColor:'#6A0DAD', paddingVertical:8, paddingHorizontal:16, borderRadius:6 },
  viewText: { color:'#fff', fontWeight:'600' },
  bottomBar: { position:'absolute', bottom:0, left:0, right:0, height:60, flexDirection:'row', justifyContent:'space-around', alignItems:'center', backgroundColor:isDarkMode?'#1e1e1e':'#fff', borderTopWidth:1, borderTopColor:isDarkMode?'#333':'#ccc' },
  iconButton: { padding:8 },
   homeIcon: { width: 28, height: 28, tintColor: isDarkMode ? '#fff' : '#000' },
});
