/**
 * OfferScreen.tsx
 *
 * Función de la página:
 * Pantalla para crear y enviar una oferta de intercambio de cartas a un amigo.
 * Permite ajustar la cantidad de cada carta, seleccionar el modo de cálculo de precios
 * (trend, low o manual), visualizar el monto total y enviar la oferta al backend,
 * además de generar notificaciones para emisor y receptor.
 */

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

// URL base del backend para peticiones
const API_URL = 'https://myappserve-go.onrender.com';

/**
 * Tipo de entrada de carta en OfferScreen
 */
type CardEntry = {
  id: string;                               // Identificador único de la carta
  name: string;                             // Nombre de la carta
  images: { small: string };                // URL de imagen pequeña
  quantity: number;                         // Cantidad máxima disponible para oferta
  cardmarket?: {                            // Datos de precio desde Cardmarket
    prices?: { lowPrice?: number; trendPrice?: number }
  };
};

export default function OfferScreen() {
  // Hooks de navegación y parámetros recibidos
  const router = useRouter();
  const params = useLocalSearchParams<{ cards: string; friendId?: string; friendName?: string }>();
  const friendId = params.friendId as string;                        // ID del amigo receptor
  const friendName = params.friendName ?? 'Amigo';                   // Nombre visible del amigo
  const cards: CardEntry[] = React.useMemo(
    () => JSON.parse(params.cards || '[]'),
    [params.cards]
  );  // Array de cartas para ofertar

  // Estados locales
  const [mode, setMode] = useState<'trend' | 'low' | 'manual'>('trend');  // Modo de cálculo de precio
  const [offer, setOffer] = useState<string>('');                        // Monto total de la oferta
  const [counts, setCounts] = useState<Record<string, number>>({});       // Contadores por carta
  const isDarkMode = useColorScheme() === 'dark';                        // Detecta tema
  const styles = getStyles(isDarkMode);

  // Inicializa los contadores con la cantidad máxima disponible de cada carta
  useEffect(() => {
    const init: Record<string, number> = {};
    cards.forEach(c => { init[c.id] = c.quantity; });
    setCounts(init);
  }, [cards]);

  // Cálculo de sumas según modo 'low' y 'trend'
  const lowSum = cards
    .reduce((sum, c) => sum + (c.cardmarket?.prices?.lowPrice || 0) * (counts[c.id] || 0), 0)
    .toFixed(2);
  const trendSum = cards
    .reduce((sum, c) => sum + (c.cardmarket?.prices?.trendPrice || 0) * (counts[c.id] || 0), 0)
    .toFixed(2);

  // Actualiza el estado de oferta automáticamente al cambiar el modo
  useEffect(() => {
    if (mode === 'trend') setOffer(trendSum);
    else if (mode === 'low') setOffer(lowSum);
  }, [mode, lowSum, trendSum]);

  // Maneja entrada manual de monto y cambia modo a 'manual'
  const onChangeOffer = (text: string) => {
    setMode('manual');
    setOffer(text);
  };

  // Incrementa el contador de una carta, sin superar la cantidad disponible
  const increment = (id: string) => {
    setCounts(prev => {
      const orig = cards.find(c => c.id === id)?.quantity || 0;
      const cur = prev[id] || 0;
      if (cur < orig) return { ...prev, [id]: cur + 1 };
      return prev;
    });
  };
  // Decrementa el contador de una carta, sin caer por debajo de cero
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
      // Obtiene datos de usuario logueado desde AsyncStorage
      const raw = await AsyncStorage.getItem('user');
      const storedUser = raw ? JSON.parse(raw) : null;
      if (!storedUser) {
        Alert.alert('Error', 'Usuario no disponible');
        return;
      }

      // Prepara datos para historial de oferta
      const payloadHistory = {
        sellerId:  storedUser.id,
        buyerId:   friendId,
        buyerName: friendName,
        amount:    Number(offer),
        mode,            // 'trend' | 'low' | 'manual'
        date:      new Date().toISOString(),
        cards:     cards.map(c => ({
          cardId:    c.id,
          quantity:  counts[c.id] || 0,
          unitPrice: mode === 'trend'
            ? (c.cardmarket?.prices?.trendPrice || 0)
            : (c.cardmarket?.prices?.lowPrice   || 0),
          name:      c.name,
          image:     c.images.small
        }))
      };

      // Envía historial al backend
      const resHist = await fetch(`${API_URL}/api/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadHistory)
      });
      if (!resHist.ok) {
        const err = await resHist.json();
        throw new Error(err.error || 'Error al guardar oferta');
      }

      // Base de notificaciones sin partner
      const notifyBase = {
        type: 'offer',
        cards: payloadHistory.cards,
        amount: payloadHistory.amount
      };

      // Notifica al receptor de la oferta (partner = emisor)
      await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          userId: friendId,
          partner: storedUser.id,
          message: `Has recibido una oferta de ${storedUser.apodo}`,
          ...notifyBase
        })
      });

      // Notifica al emisor que espera respuesta (partner = receptor)
      await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          userId: storedUser.id,
          partner: friendId,
          message: `Esperando respuesta de ${friendName}`,
          ...notifyBase
        })
      });

      // Redirige a la lista de notificaciones
      router.push(`/notifications?userId=${storedUser.id}`);
    } catch (error: any) {
      console.error('Error en sendOffer:', error);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Título y destino de oferta */}
      <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Enviar oferta a {friendName}</Text>

      {/* Lista de cartas con contadores */}
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
              {/* Imagen de carta */}
              {c.images?.small ? (
                <Image source={{ uri: c.images.small }} style={styles.cardImage} />
              ) : null}
              {/* Nombre y precio total */}
              <Text style={[styles.cardText, { color: isDarkMode ? '#fff' : '#000' }]}>{c.name}</Text>
              <Text style={[styles.priceText, { color: isDarkMode ? '#fff' : '#000' }]}>Precio: ${totalPrice}</Text>

              {/* Controles de incremento/decremento */}
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

      {/* Botones para cambiar modo de cálculo */}
      <View style={styles.modeButtons}>
        <TouchableOpacity style={[styles.modeButton, mode==='trend' && styles.modeButtonSelected]} onPress={()=>setMode('trend')}>
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