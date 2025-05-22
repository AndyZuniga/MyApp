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
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const CARD_CACHE_KEY = 'cardDetailsCache';
const API_URL = 'https://myappserve-go.onrender.com';

// Filtros
const categoryOptions = [
  { label: 'Pokémon', value: 'Pokémon' },
  { label: 'Entrenador', value: 'Trainer' },
  { label: 'Objeto', value: 'Item' },
  { label: 'Herramienta', value: 'Pokémon Tool' },
  { label: 'Estadio', value: 'Stadium' },
];
const energyTypes = [
  { type: 'Water', icon: require('@/assets/images/energies/Energía_agua.png') },
  { type: 'Fire', icon: require('@/assets/images/energies/Energía_fuego.png') },
  { type: 'Fairy', icon: require('@/assets/images/energies/Energía_hada.png') },
  { type: 'Colorless', icon: require('@/assets/images/energies/Energía_incolora.png') },
  { type: 'Fighting', icon: require('@/assets/images/energies/Energía_lucha.png') },
  { type: 'Metal', icon: require('@/assets/images/energies/Energía_metálica.png') },
  { type: 'Darkness', icon: require('@/assets/images/energies/Energía_oscura.png') },
  { type: 'Grass', icon: require('@/assets/images/energies/Energía_planta.png') },
  { type: 'Psychic', icon: require('@/assets/images/energies/Energía_psíquica.png') },
  { type: 'Lightning', icon: require('@/assets/images/energies/Energía_rayo.png') },
];

type CardEntry = {
  id: string;
  name: string;
  images: { small: string };
  quantity: number;
  supertype: string;
  subtypes?: string[];
  set?: { id: string };
  types?: string[];
};

export default function FriendsLibraryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ friendId: string; friendName?: string }>();
  const { friendId, friendName } = params;
  const displayName = friendName ?? 'Amigo';
  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  const [cards, setCards] = useState<CardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sets, setSets] = useState<any[]>([]);
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [selectedCards, setSelectedCards] = useState<CardEntry[]>([]);

  // Carga sets
  useEffect(() => {
    fetch('https://api.pokemontcg.io/v2/sets')
      .then(res => res.json())
      .then(json => setSets(json.data || []))
      .catch(() => {});
  }, []);

  // Carga biblioteca del amigo
  useEffect(() => {
    if (!friendId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/library?userId=${friendId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { library } = await res.json();
        const raw = await AsyncStorage.getItem(CARD_CACHE_KEY);
        const cache = raw ? JSON.parse(raw) : {};
        const newCache = { ...cache };
        const details = await Promise.all(
          library.filter((e: any) => e.quantity > 0).map(async (e: any) => {
            let data = newCache[e.cardId];
            if (!data) {
              const r = await fetch(`https://api.pokemontcg.io/v2/cards/${e.cardId}`);
              const json = await r.json();
              data = json.data;
              newCache[e.cardId] = data;
            }
            return { ...data, quantity: e.quantity };
          })
        );
        setCards(details);
        await AsyncStorage.setItem(CARD_CACHE_KEY, JSON.stringify(newCache));
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [friendId]);

  // Helpers para filtros...
  const matchesCategory = (c: CardEntry, cat: string) =>
    cat === 'Pokémon'
      ? c.supertype === 'Pokémon'
      : cat === 'Trainer'
      ? c.supertype === 'Trainer'
      : Array.isArray(c.subtypes) && c.subtypes.includes(cat);

  const filteredCat = cards.filter(c => !selectedCategory || matchesCategory(c, selectedCategory));
  const availableCategories = categoryOptions.filter(opt =>
    cards.some(c => matchesCategory(c, opt.value))
  );
  const filteredSet = filteredCat.filter(c => !selectedSet || c.set?.id === selectedSet);
  const availableSets = sets.filter(s =>
    filteredCat.some(c => c.set?.id === s.id)
  );
  const filteredType = filteredSet.filter(c =>
    !selectedType || (Array.isArray(c.types) && c.types.includes(selectedType))
  );
  const availableTypes = energyTypes.filter(et =>
    filteredSet.some(c => Array.isArray(c.types) && c.types.includes(et.type))
  );
  const finalList = filteredType.filter(c =>
    c.name.toLowerCase().includes(localSearch.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.searchContainer} nestedScrollEnabled>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : '#000' }]}>            
          {displayName} - Biblioteca
        </Text>
        {loading ? (
          <ActivityIndicator style={styles.loading} />
        ) : finalList.length === 0 ? (
          <Text style={[styles.emptyText, { color: isDarkMode ? '#fff' : '#000' }]}>No hay cartas</Text>
        ) : (
          finalList.map(card => {
            const selectedCount = selectedCards.filter(sc => sc.id === card.id).length;
            return (
              <View key={card.id} style={styles.cardBox}>
                <View style={styles.counterBadge}>
                  <Text style={styles.counterText}>{card.quantity}</Text>
                </View>
                <Image source={{ uri: card.images.small }} style={styles.cardImage} />
                <Text style={[styles.cardName, { color: isDarkMode ? '#fff' : '#000' }]}>{card.name}</Text>
                {/* Botón reducir / seleccionar */}
                <TouchableOpacity
                  style={[
                    styles.iconCircle,
                    card.quantity === 0 && styles.iconCircleDisabled
                  ]}
                  onPress={() => {
                    if (card.quantity > 0) {
                      setCards(prev => prev.map(c => c.id === card.id ? { ...c, quantity: c.quantity - 1 } : c));
                      setSelectedCards(prev => [...prev, card]);
                    }
                  }}
                  disabled={card.quantity === 0}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                </TouchableOpacity>
                {/* Botón volver */}
                <TouchableOpacity
                  style={[
                    styles.iconCircleLeft,
                    selectedCount === 0 && styles.iconCircleDisabled
                  ]}
                  onPress={() => {
                    if (selectedCount > 0) {
                      // eliminar una instancia de selectedCards
                      const idx = selectedCards.findIndex(sc => sc.id === card.id);
                      const newSel = [...selectedCards]; newSel.splice(idx, 1);
                      setSelectedCards(newSel);
                      // restaurar cantidad
                      setCards(prev => prev.map(c => c.id === card.id ? { ...c, quantity: c.quantity + 1 } : c));
                    }
                  }}
                  disabled={selectedCount === 0}
                >
                  <Ionicons name="refresh" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
      {/* Botón Aceptar */}
      {selectedCards.length > 0 && (
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => router.push({ pathname: '/offer', params: {friendId: friendId,friendName: displayName, cards: JSON.stringify(selectedCards) } })}
        >
          <Text style={styles.acceptText}>Aceptar</Text>
        </TouchableOpacity>
      )}
      {/* Barra inferior */}
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
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}


const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDarkMode ? '#121212' : '#fff' },
  searchContainer: { padding: 24, paddingTop: 40, paddingBottom: 100, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  categoryFilterContainer: { marginBottom: 12, paddingHorizontal: 4 },
  categoryButton: { marginHorizontal: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: isDarkMode ? '#1e1e1e' : '#f0f0f0' },
  categoryButtonSelected: { borderWidth: 2, borderColor: '#6A0DAD' },
  categoryLabel: { fontSize: 14, fontWeight: '500' },
  setFilterContainer: { marginBottom: 12, paddingHorizontal: 4 },
  setButton: { marginHorizontal: 6, padding: 4, borderRadius: 6, backgroundColor: isDarkMode ? '#1e1e1e' : '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  setButtonSelected: { borderWidth: 2, borderColor: '#6A0DAD' },
  setIcon: { width: 40, height: 40, resizeMode: 'contain' },
  typeFilterContainer: { marginBottom: 12, paddingHorizontal: 4 },
  typeButton: { alignItems: 'center', marginHorizontal: 8, padding: 4, borderRadius: 6, backgroundColor: isDarkMode ? '#1e1e1e' : '#f0f0f0' },
  typeButtonSelected: { borderWidth: 2, borderColor: '#6A0DAD' },
  typeIcon: { width: 25, height: 25, resizeMode: 'contain' },
  searchLocalContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', padding: 8, backgroundColor: isDarkMode ? '#1e1e1e' : '#f0f0f0', borderRadius: 6, marginBottom: 16 },
  inputLocal: { flex: 1, height: 40, color: isDarkMode ? '#fff' : '#000', paddingHorizontal: 12 },
  loading: { marginTop: 20 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16 },
  cardBox: { width: '100%', padding: 12, marginBottom: 16, backgroundColor: isDarkMode ? '#1e1e1e' : '#f9f9f9', borderRadius: 6, position: 'relative' },
  cardImage: { width: '100%', height: 200, resizeMode: 'contain', borderRadius: 6, marginTop: 8 },
  cardName: { fontSize: 16, fontWeight: '500', alignSelf: 'center', marginTop: 8 },
  cardLowPrice: { position: 'absolute', top: 48, left: 48, fontSize: 12, fontWeight: '500' },
  cardTrendPrice: { position: 'absolute', top: 64, left: 48, fontSize: 12, fontWeight: '500' },
  counterBadge: { position: 'absolute', top: 8, right: 48, backgroundColor: '#6A0DAD', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, zIndex: 1 },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  iconCircle: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#6A0DAD', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  acceptButton: { position: 'absolute', bottom: 80, right: 20, backgroundColor: '#6A0DAD', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, zIndex: 2 },
  acceptText: { color: '#fff', fontWeight: '600' },
  bottomBar: { position: 'absolute', bottom: 0, width: '100%', height: 60, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderTopWidth: 1, borderTopColor: isDarkMode ? '#333' : '#ccc' },
  iconButton: { padding: 8 },
  iconCircleDisabled: {
  backgroundColor: '#888',},  
  //iconCircleLeft: {backgroundColor: '#888',},
  iconCircleLeft: { position: 'absolute', top: 8, left: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#6A0DAD', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  

});
