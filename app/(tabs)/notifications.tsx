import React, { useState, useEffect } from 'react';
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
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

  useFocusEffect(
    React.useCallback(() => {
      if (!userId) return;
      let active = true;
      setLoading(true);
      fetch(`${API_URL}/notifications?userId=${userId}&isRead=false`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(json => { if(active) setNotifications(json.notifications || []); })
        .catch(err => { console.error('[notifications/get]', err); if(active) Alert.alert('Error','No se pudieron cargar notificaciones'); })
        .finally(() => { if(active) setLoading(false); });
      return () => { active = false; };
    }, [userId])
  );

  const markAsRead = async (id: string) => {
    try {
      const resp = await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('[notifications/read]', err);
      Alert.alert('Error', 'No se pudo eliminar la notificación');
    }
  };

  const canDelete = (createdAt: string) => Date.now() - new Date(createdAt).getTime() >= 30*60*1000;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: isDarkMode?'#fff':'#000'}]}>Notificaciones</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={styles.loading}/>
      ) : notifications.length===0 ? (
        <Text style={[styles.emptyText,{color: isDarkMode?'#fff':'#000'}]}>No tienes notificaciones nuevas</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {notifications.map(n=> (
            <View key={n._id} style={styles.requestBox}>
              {n.sender && <Text style={[styles.requestText,{color:isDarkMode?'#bbb':'#555'}]}>De: {n.sender.nombre} (@{n.sender.apodo})</Text>}
              {n.type==='offer' && n.partner && n.message.includes('Esperando') ? (
                <Text style={[styles.requestText,{color:isDarkMode?'#fff':'#000', marginBottom:8}]}>Esperando respuesta de {n.partner.nombre} (@{n.partner.apodo})</Text>
              ) : (
                <Text style={[styles.requestText,{color:isDarkMode?'#fff':'#000'}]}>{n.message}</Text>
              )}
              {n.type==='offer' && n.message.includes('Esperando') ? (
                <TouchableOpacity
                  style={[styles.button, canDelete(n.createdAt)?styles.deleteButton:styles.deleteDisabled]}
                  onPress={()=>markAsRead(n._id)} disabled={!canDelete(n.createdAt)}>
                  <Text style={styles.buttonText}>Eliminar</Text>
                </TouchableOpacity>
              ) : n.type==='offer' ? (
                <View style={styles.actionButtons}>
    <TouchableOpacity
      style={[styles.button, styles.viewButton]}
      onPress={() =>
        router.push({
          pathname: '/judge-offer',
          params: {
            cards: JSON.stringify(n.cards),
            offer: n.amount.toString(),
            friendName: n.sender.nombre
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
              ) : (
                <TouchableOpacity style={styles.readButton} onPress={()=>markAsRead(n._id)}>
                  <Text style={styles.readText}>Marcar leído</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.iconButton} onPress={()=>router.replace('/home')}><Ionicons name="home" size={28} color={isDarkMode?'#fff':'#000'}/></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={()=>router.push('/library')}><Ionicons name="book" size={28} color={isDarkMode?'#fff':'#000'}/></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={()=>router.push('/friends')}><Ionicons name="people-outline" size={28} color={isDarkMode?'#fff':'#000'}/></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}><Ionicons name="notifications-outline" size={28} color="#6A0DAD"/></TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles= (dark:boolean)=>StyleSheet.create({
  container:{flex:1,backgroundColor:dark?'#121212':'#fff'},
  header:{padding:24,paddingTop:40,borderBottomWidth:1,borderBottomColor:dark?'#333':'#ccc'},
  title:{fontSize:24,fontWeight:'600'},
  loading:{marginTop:20},
  emptyText:{textAlign:'center',marginTop:20,fontSize:16},
  listContainer:{padding:16,paddingBottom:100},
  requestBox:{padding:12,marginBottom:12,backgroundColor:dark?'#1e1e1e':'#f9f9f9',borderRadius:6},
  requestText:{fontSize:16},
  actionButtons:{flexDirection:'row',justifyContent:'flex-end'},
  button:{paddingVertical:8,paddingHorizontal:12,borderRadius:6,marginLeft:8,backgroundColor:'#6A0DAD'},
  viewButton:{},
  rejectOfferButton:{backgroundColor:'#d9534f'},
  deleteButton:{backgroundColor:'#d9534f',alignSelf:'flex-end',marginTop:8},
  deleteDisabled:{backgroundColor:'#888',alignSelf:'flex-end',marginTop:8},
  buttonText:{color:'#fff',fontWeight:'600'},
  readButton:{alignSelf:'flex-end',paddingVertical:6,paddingHorizontal:12,backgroundColor:'#6A0DAD',borderRadius:6},
  readText:{color:'#fff',fontWeight:'600'},
  bottomBar:{position:'absolute',bottom:0,width:'100%',height:60,flexDirection:'row',justifyContent:'space-around',alignItems:'center',backgroundColor:dark?'#1e1e1e':'#fff',borderTopWidth:1,borderTopColor:dark?'#333':'#ccc'},
  iconButton:{padding:8},
});
