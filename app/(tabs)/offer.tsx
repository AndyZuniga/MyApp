import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, useColorScheme, Image, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const API_URL = 'https://myappserve-go.onrender.com';

type CardEntry = {
  id: string;
  name: string;
  images: { small: string };
  quantity: number;
  cardmarket?: {
    prices?: { lowPrice?: number; trendPrice?: number };
  };
};

export default function OfferScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cards: string; friendId?: string; friendName?: string }>();
  const friendId = params.friendId as string;
  const friendName = params.friendName ?? 'Amigo';
  const cards: CardEntry[] = React.useMemo(
    () => JSON.parse(params.cards || '[]'),
    [params.cards]
  );

  // Estados para counts y oferta
  const [mode, setMode] = useState<'trend' | 'low' | 'manual'>('trend');
  const [offer, setOffer] = useState<string>('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  // Estados para almacenar IDs de notificaciones
  const [receptorNotiId, setReceptorNotiId] = useState<string | null>(null);
  const [emisorNotiId, setEmisorNotiId] = useState<string | null>(null);

  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  // Inicializa counts
  useEffect(() => {
    const init: Record<string, number> = {};
    cards.forEach(c => { init[c.id] = c.quantity; });
    setCounts(init);
  }, [cards]);

  // Calcula sumas de precio
  const lowSum = cards
    .reduce((sum, c) => sum + (c.cardmarket?.prices?.lowPrice || 0) * (counts[c.id] || 0), 0)
    .toFixed(2);
  const trendSum = cards
    .reduce((sum, c) => sum + (c.cardmarket?.prices?.trendPrice || 0) * (counts[c.id] || 0), 0)
    .toFixed(2);

  useEffect(() => {
    if (mode === 'trend') setOffer(trendSum);
    else if (mode === 'low') setOffer(lowSum);
  }, [mode, lowSum, trendSum]);

  const onChangeOffer = (text: string) => {
    setMode('manual');
    setOffer(text);
  };

  const increment = (id: string) => {
    setCounts(prev => {
      const max = cards.find(c => c.id === id)?.quantity || 0;
      const cur = prev[id] || 0;
      if (cur < max) return { ...prev, [id]: cur + 1 };
      return prev;
    });
  };

  const decrement = (id: string) => {
    setCounts(prev => {
      const cur = prev[id] || 0;
      if (cur > 0) return { ...prev, [id]: cur - 1 };
      return prev;
    });
  };

  /**
   * Responde a una notificación existente usando tu endpoint PATCH /notifications/:id/respond
   * @param notiId ID de la notificación a actualizar
   * @param action 'accept' o 'reject'
   * @param byApodo Apodo del usuario que realiza la acción
   */
  const respondNotification = async (
    notiId: string,
    action: 'accept' | 'reject',
    byApodo: string
  ) => {
    try {
      await fetch(`${API_URL}/notifications/${notiId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, byApodo })
      });
    } catch (error) {
      console.error(`Error al responder notificación ${notiId}:`, error);
    }
  };

  // Envía la oferta y captura ambos IDs de notificación
  const sendOffer = async () => {
    try {
      const raw = await AsyncStorage.getItem('user');
      const storedUser = raw ? JSON.parse(raw) : null;
      if (!storedUser) {
        Alert.alert('Error', 'Usuario no disponible');
        return;
      }

      // Registra oferta en historial
      const payloadHistory = {
        sellerId: storedUser.id,
        buyerId: friendId,
        buyerName: friendName,
        amount: Number(offer),
        mode,
        date: new Date().toISOString(),
        cards: cards.map(c => ({
          cardId: c.id,
          quantity: counts[c.id] || 0,
          unitPrice: mode === 'trend'
            ? (c.cardmarket?.prices?.trendPrice || 0)
            : (c.cardmarket?.prices?.lowPrice || 0),
          name: c.name,
          image: c.images.small
        }))
      };

      const resHist = await fetch(`${API_URL}/api/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadHistory)
      });
      if (!resHist.ok) {
        const err = await resHist.json();
        throw new Error(err.error || 'Error al guardar oferta');
      }

      const notifyBase = {
        type: 'offer',
        cards: payloadHistory.cards,
        amount: payloadHistory.amount
      };

      // Notificar receptor y capturar ID
      const resReceptor = await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: friendId,
          partner: storedUser.id,
          message: `Has recibido una oferta de ${storedUser.apodo}`,
          ...notifyBase
        })
      });
      if (!resReceptor.ok) throw new Error('Error al notificar al receptor');
      const { notification: receptorNoti } = await resReceptor.json();
      setReceptorNotiId(receptorNoti._id);

      // Notificar emisor y capturar ID
      const resEmisor = await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUser.id,
          partner: friendId,
          message: `Esperando respuesta de ${friendName}`,
          ...notifyBase
        })
      });
      if (!resEmisor.ok) throw new Error('Error al notificar al emisor');
      const { notification: emisorNoti } = await resEmisor.json();
      setEmisorNotiId(emisorNoti._id);

      // Mostrar detalles de notificación
      const emitterName = storedUser.nombre ?? storedUser.apodo;
      const emitterApodo = storedUser.apodo;
      const receptorName = friendName;
      const receptorApodo = friendName; // usa friendName como apodo si no hay otro
      Alert.alert(
        'Detalles de Notificación',
        `Emisor: ${emitterName} (${emitterApodo})\n` +
        `Receptor: ${receptorName} (${receptorApodo})\n\n` +
        `IDs:\nReceptor: ${receptorNoti._id}\nEmisor: ${emisorNoti._id}`
      );

      // Redirige a pantalla de notificaciones
      router.push(
        `/notifications?userId=${storedUser.id}&newNotificationId=${receptorNoti._id}`
      );
    } catch (error: any) {
      console.error('Error en sendOffer:', error);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Enviar oferta a {friendName}</Text>
      <ScrollView contentContainerStyle={styles.listContainer}>
        {cards.map(c => {
          const cur = counts[c.id] || 0;
          const orig = c.quantity;
          const unitPrice = mode === 'trend'
            ? (c.cardmarket?.prices?.trendPrice || 0)
            : (c.cardmarket?.prices?.lowPrice || 0);
          const totalPrice = (unitPrice * cur).toFixed(2);
          return (
            <View key={c.id} style={styles.cardBox}>
              {c.images?.small && <Image source={{ uri: c.images.small }} style={styles.cardImage} />}
              <Text style={[styles.cardText, { color: isDarkMode ? '#fff' : '#000' }]}>{c.name}</Text>
              <Text style={[styles.priceText, { color: isDarkMode ? '#fff' : '#000' }]}>Precio: ${totalPrice}</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity
                  style={[styles.counterButton, cur === 0 && styles.counterDisabled]}
                  onPress={() => decrement(c.id)}
                  disabled={cur === 0}
                >
                  <Ionicons name="remove" size={16} color="#fff" />
                </TouchableOpacity>
                <Text style={[styles.counterValue, { color: isDarkMode ? '#fff' : '#000' }]}>{cur}</Text>
                <TouchableOpacity
                  style={[styles.counterButton, cur === orig && styles.counterDisabled]}
                  onPress={() => increment(c.id)}
                  disabled={cur === orig}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.modeButtons}>
        <TouchableOpacity style={[styles.modeButton, mode==='trend' && styles.modeButtonSelected]} onPress={()=>setMode('trend')}>
          <Text style={styles.modeText}>Trend</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeButton, mode==='low' && styles.modeButtonSelected]} onPress={()=>setMode('low')}>
          <Text style={styles.modeText}>Low</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        value={offer}
        onChangeText={onChangeOffer}
        placeholder="Ingresa oferta"
        placeholderTextColor={isDarkMode ? '#888' : '#666'}
        keyboardType="numeric"
      />
      <TouchableOpacity
        style={[styles.sendButton, !offer && styles.sendButtonDisabled]}
        onPress={() => Alert.alert('Confirmar oferta', '¿Deseas enviar la oferta?', [
          { text: 'No', style: 'cancel' },
          { text: 'Sí', onPress: sendOffer }
        ])}
        disabled={!offer}
      >
        <Text style={styles.sendText}>Enviar oferta</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container:{flex:1,backgroundColor:isDarkMode?'#121212':'#fff',padding:16},
  title:{fontSize:20,fontWeight:'600',marginBottom:12,color:isDarkMode?'#fff':'#000'},
  listContainer:{paddingVertical:8},
  cardBox:{paddingVertical:8,borderBottomWidth:1,borderBottomColor:isDarkMode?'#333':'#ccc',alignItems:'center'},
  cardImage:{width:100,height:140,resizeMode:'contain',marginBottom:8,borderRadius:6},
  cardText:{fontSize:16,marginBottom:4,textAlign:'center'},
  priceText:{fontSize:14,marginBottom:4,textAlign:'center'},
  counterContainer:{flexDirection:'row',alignItems:'center',justifyContent:'center'},
  counterButton:{width:32,height:32,borderRadius:16,backgroundColor:'#6A0DAD',justifyContent:'center',alignItems:'center'},
  counterDisabled:{backgroundColor:'#888'},
  counterValue:{marginHorizontal:12,fontSize:16,fontWeight:'500'},
  modeButtons:{flexDirection:'row',justifyContent:'center',marginVertical:12},
  modeButton:{marginHorizontal:8,paddingVertical:6,paddingHorizontal:16,borderRadius:6,backgroundColor:isDarkMode?'#333':'#ddd'},
  modeButtonSelected:{backgroundColor:'#6A0DAD'},
  modeText:{color:'#fff',fontWeight:'500'},
  input:{borderWidth:1,borderColor:isDarkMode?'#555':'#ccc',borderRadius:6,padding:8,fontSize:16,color:isDarkMode?'#fff':'#000',marginVertical:12},
  sendButton:{backgroundColor:'#6A0DAD',paddingVertical:12,borderRadius:6,alignItems:'center'},
  sendButtonDisabled:{backgroundColor:'#888'},
  sendText:{color:'#fff',fontSize:16,fontWeight:'600'}
});
