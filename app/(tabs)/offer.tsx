import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  useColorScheme,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

// URL del backend
const API_URL = 'https://myappserve-go.onrender.com';

/**
 * Tipo de entrada de carta en OfferScreen
 */
type CardEntry = {
  id: string;
  name: string;
  images: { small: string };
  quantity: number;
  cardmarket?: { prices?: { lowPrice?: number; trendPrice?: number } };
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

  const [mode, setMode] = useState<'trend' | 'low' | 'manual'>('trend');
  const [offer, setOffer] = useState<string>('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  // Inicializar contadores con la cantidad máxima disponible
  useEffect(() => {
    const init: Record<string, number> = {};
    cards.forEach(c => { init[c.id] = c.quantity; });
    setCounts(init);
  }, [cards]);

  // Cálculo de sumas según modo
  const lowSum = cards
    .reduce((sum, c) => sum + (c.cardmarket?.prices?.lowPrice || 0) * (counts[c.id] || 0), 0)
    .toFixed(2);
  const trendSum = cards
    .reduce((sum, c) => sum + (c.cardmarket?.prices?.trendPrice || 0) * (counts[c.id] || 0), 0)
    .toFixed(2);

  // Actualiza oferta automáticamente
  useEffect(() => {
    if (mode === 'trend') setOffer(trendSum);
    else if (mode === 'low') setOffer(lowSum);
  }, [mode, lowSum, trendSum]);

  // Entrada manual de monto
  const onChangeOffer = (text: string) => {
    setMode('manual');
    setOffer(text);
  };

  // Funciones de incremento/decremento de contadores
  const increment = (id: string) => {
    setCounts(prev => {
      const orig = cards.find(c => c.id === id)?.quantity || 0;
      const cur = prev[id] || 0;
      if (cur < orig) return { ...prev, [id]: cur + 1 };
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
   * Envía la oferta:
   * 1) Guarda historial en /api/offers
   * 2) Crea notificaciones para emisor y receptor
   */
  const sendOffer = async () => {
    try {
      const raw = await AsyncStorage.getItem('user');
      const storedUser = raw ? JSON.parse(raw) : null;
      if (!storedUser) {
        Alert.alert('Error', 'Usuario no disponible');
        return;
      }

      // --- Preparar payload de historial ---
      const payloadHistory = {
        sellerId:  storedUser.id,
        buyerId:   friendId,
        buyerName: friendName,
        amount:    Number(offer),
        mode, // 'trend' | 'low' | 'manual'
        date:      new Date().toISOString(),
        cards:     cards.map(c => ({
          cardId:    c.id,
          quantity:  counts[c.id] || 0,
          unitPrice: mode === 'trend'
            ? (c.cardmarket?.prices?.trendPrice || 0)
            : (c.cardmarket?.prices?.lowPrice   || 0),
          name:      c.name,            // nombre de la carta
          image:     c.images.small     // URL de la imagen pequeña
        }))
      };

      // Guardar en backend
      const resHist = await fetch(`${API_URL}/api/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadHistory)
      });
      if (!resHist.ok) {
        const err = await resHist.json();
        throw new Error(err.error || 'Error al guardar oferta');
      }

      // --- Crear notificaciones ---
      const notifyBase = {
        partner: storedUser.id,
        type: 'offer',
        cards: payloadHistory.cards,
        amount: payloadHistory.amount
      };
      // Notificar receptor
      await fetch(`${API_URL}/notifications`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userId:friendId, message:`Has recibido una oferta de ${storedUser.apodo}`, ...notifyBase })
      });
      // Notificar emisor
      await fetch(`${API_URL}/notifications`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userId:storedUser.id, message:`Esperando respuesta de ${friendName}`, ...notifyBase })
      });

      // Redirigir a lista de notificaciones
      router.push(`/notifications?userId=${storedUser.id}`);
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
              {/* Imagen de la carta */}
              {c.images?.small ? (
                <Image source={{ uri: c.images.small }} style={styles.cardImage} />
              ) : null}
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
        <TouchableOpacity style={[styles.modeButton, mode==='trend'&&styles.modeButtonSelected]} onPress={()=>setMode('trend')}>
          <Text style={styles.modeText}>Trend</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeButton, mode==='low'&&styles.modeButtonSelected]} onPress={()=>setMode('low')}>
          <Text style={styles.modeText}>Low</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        value={offer}
        onChangeText={onChangeOffer}
        placeholder="Ingresa oferta"
        placeholderTextColor={isDarkMode?'#888':'#666'}
        keyboardType="numeric"
      />
      <TouchableOpacity style={[styles.sendButton, !offer&&styles.sendButtonDisabled]} onPress={()=>Alert.alert('Confirmar oferta','¿Deseas enviar la oferta?',[
        { text:'No', style:'cancel' }, { text:'Sí', onPress:sendOffer }
      ])} disabled={!offer}>
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
// andy.zuniga.williams@gmail.com