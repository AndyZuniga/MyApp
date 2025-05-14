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
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  const [userObj, setUserObj] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    AsyncStorage.getItem('user')
      .then(data => data && setUserObj(JSON.parse(data)))
      .catch(err => console.error('[AsyncStorage] error:', err));
  }, []);

  useEffect(() => {
    if (!userObj) return;
    (async () => {
      try {
        const resp = await fetch(
          `https://myappserve-go.onrender.com/friend-requests?userId=${userObj.id}`
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        setRequests(json.requests || []);
      } catch (err) {
        console.error('[friend-requests] error:', err);
        Alert.alert('Error', 'No se pudo cargar las notificaciones');
        setRequests([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userObj]);

  const accept = async (reqId: string) => {
    try {
      const resp = await fetch(
        `https://myappserve-go.onrender.com/friend-request/${reqId}/accept`,
        { method: 'POST' }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setRequests(prev => prev.filter(r => r._id !== reqId));
      Alert.alert('Solicitud aceptada');
    } catch (err) {
      console.error('[acceptRequest] error:', err);
      Alert.alert('Error', 'No se pudo aceptar la solicitud');
    }
  };

  const reject = async (reqId: string) => {
    try {
      const resp = await fetch(
        `https://myappserve-go.onrender.com/friend-request/${reqId}/reject`,
        { method: 'POST' }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setRequests(prev => prev.filter(r => r._id !== reqId));
      Alert.alert('Solicitud rechazada');
    } catch (err) {
      console.error('[rejectRequest] error:', err);
      Alert.alert('Error', 'No se pudo rechazar la solicitud');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Notificaciones</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loading} />
      ) : requests.length === 0 ? (
        <Text style={[styles.emptyText, { color: isDarkMode ? '#fff' : '#000' }]}>No tienes notificaciones</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {requests.map(req => (
            <View key={req._id} style={styles.requestBox}>
              <Text style={[styles.requestText, { color: isDarkMode ? '#fff' : '#000' }]}>                
                {req.from.nombre} {req.from.apellido} te ha enviado una solicitud
              </Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.acceptButton]}
                  onPress={() => accept(req._id)}
                >
                  <Text style={styles.buttonText}>Aceptar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.rejectButton]}
                  onPress={() => reject(req._id)}
                >
                  <Text style={styles.buttonText}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.replace('/home')}>
          <Ionicons name="home" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/library')}>
          <Ionicons name="book" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/friends')}>
          <Ionicons name="people-outline" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={28} color="#6A0DAD" />
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
    loading: { marginTop: 20 },
    emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16 },
    listContainer: { padding: 16, paddingBottom: 100 },
    requestBox: { padding: 12, marginBottom: 12, backgroundColor: isDarkMode ? '#1e1e1e' : '#f9f9f9', borderRadius: 6 },
    requestText: { fontSize: 16, marginBottom: 8 },
    actionButtons: { flexDirection: 'row', justifyContent: 'space-between' },
    button: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center', marginHorizontal: 4 },
    acceptButton: { backgroundColor: '#6A0DAD' },
    rejectButton: { backgroundColor: '#d9534f' },
    buttonText: { color: '#fff', fontWeight: '600' },
    bottomBar: { position: 'absolute', bottom: 0, width: '100%', height: 60, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderTopWidth: 1, borderTopColor: isDarkMode ? '#333' : '#ccc' },
    iconButton: { padding: 8 },
  });
