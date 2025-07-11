import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  Image,
  ImageBackground,
  PanResponder,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/utils/apiFetch';

// Logo de liga (asset local)
const leagueLogo = require('@/assets/images/letterformats/formato-liga.png');
const CARD_CACHE_KEY = 'cardDetailsCache';

export default function LibraryScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  const [userObj, setUserObj] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [showLowSum, setShowLowSum] = useState<boolean>(true);

  useEffect(() => {
    AsyncStorage.getItem('user')
      .then(data => data && setUserObj(JSON.parse(data)))
      .catch(() => Alert.alert('Error', 'No se pudo leer usuario'));
  }, []);

  useEffect(() => {
    if (!userObj) return;
    (async () => {
      try {
        const res = await apiFetch(`/library?userId=${userObj.id}`);
        const { library } = await res.json();
        const raw = await AsyncStorage.getItem(CARD_CACHE_KEY);
        const cache = raw ? JSON.parse(raw) : {};
        const newCache: any = { ...cache };

        const details = await Promise.all(
          library.filter(e => e.quantity > 0).map(async e => {
            let data = newCache[e.cardId];
            if (!data) {
              const r = await fetch(`https://api.pokemontcg.io/v2/cards/${e.cardId}`);
              const { data: cardData } = await r.json();
              data = cardData;
              newCache[e.cardId] = data;
            }
            return { ...data, quantity: e.quantity };
          })
        );

        setCards(details);
        await AsyncStorage.setItem(CARD_CACHE_KEY, JSON.stringify(newCache));
      } catch (err: any) {
        Alert.alert('Error', err.message);
      }
    })();
  }, [userObj]);

  const updateLibrary = async (cardId: string, action: 'add' | 'remove') => {
    if (!userObj) return Alert.alert('Error', 'Usuario no disponible');
    const ep = action === 'add' ? 'library/add' : 'library/remove';
    try {
      const res = await apiFetch(`/${ep}`, {
        method: 'POST',
        body: JSON.stringify({ userId: userObj.id, cardId }),
      });
      const { library } = await res.json();
      setCards(prev =>
        prev
          .map(c => ({ ...c, quantity: library.find((e: any) => e.cardId === c.id)?.quantity || 0 }))
          .filter(c => c.quantity > 0)
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // Componente logo draggable
  const DraggableLogo = () => {
    const pan = useRef(new Animated.ValueXY()).current;
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false }
        ),
        onPanResponderRelease: () => {},
      })
    ).current;

    return (
      <Animated.Image
        source={leagueLogo}
        style={[styles.leagueLogo, { transform: pan.getTranslateTransform() }]}
        resizeMode="contain"
        {...panResponder.panHandlers}
      />
    );
  };

  const goHome = () => router.replace('/home');
  const sumText = showLowSum
    ? `Total Low: $${cards.reduce((sum, c) => sum + (c.cardmarket?.prices.lowPrice || 0) * c.quantity, 0).toFixed(2)}`
    : `Total Trend: $${cards.reduce((sum, c) => sum + (c.cardmarket?.prices.trendPrice || 0) * c.quantity, 0).toFixed(2)}`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.searchContainer} keyboardShouldPersistTaps="handled">
        {cards.map(card => (
          <View key={card.id} style={styles.cardBox}>
            <TouchableOpacity style={styles.iconCircleLeft} onPress={() => updateLibrary(card.id, 'remove')}>
              <Ionicons name="remove" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle} onPress={() => updateLibrary(card.id, 'add')}>
              <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>

            <ImageBackground
              source={{ uri: card.images.small }}
              style={styles.cardImage}
              resizeMode="contain"
            />

            <DraggableLogo />
            <Text style={[styles.cardName, { color: isDarkMode ? '#fff' : '#000' }]}>{card.name}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={() => setShowLowSum(prev => !prev)} style={styles.iconButton}>
          <Text style={styles.sumText}>{sumText}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goHome} style={styles.iconButton}>
          <Image source={require('@/assets/images/pokeball.png')} style={styles.homeIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDarkMode ? '#121212' : '#fff' },
    searchContainer: { padding: 24, paddingTop: 40, paddingBottom: 100, alignItems: 'center' },
    cardBox: {
      width: '100%',
      padding: 12,
      marginBottom: 16,
      backgroundColor: isDarkMode ? '#1e1e1e' : '#f9f9f9',
      borderRadius: 6,
      position: 'relative',
      overflow: 'visible',
    },
    cardImage: {
      width: '100%',
      height: 200,
      borderRadius: 6,
      overflow: 'visible',
    },
    leagueLogo: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      width: 30,
      aspectRatio: 1,
      opacity: 0.7,             
      zIndex: 10,
    },
    cardName: { fontSize: 16, fontWeight: '500', alignSelf: 'center', marginTop: 8 },
    iconCircle: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#6A0DAD',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    iconCircleLeft: {
      position: 'absolute',
      top: 8,
      left: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#6A0DAD',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      height: 60,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#333' : '#ccc',
    },
    iconButton: { padding: 8 },
    homeIcon: { width: 28, height: 28, tintColor: isDarkMode ? '#fff' : '#000' },
    sumText: { fontSize: 14, fontWeight: '600', color: isDarkMode ? '#fff' : '#000' },
  });
