import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const [userObj, setUserObj] = useState<any>(null);
  useEffect(() => {
    AsyncStorage.getItem('user').then(data => {
      if (data) setUserObj(JSON.parse(data));
    });
  }, []);

  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  // Estados de búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Opciones de categoría
  const categoryOptions = [
    { label: 'Objeto', value: 'Item' },
    { label: 'Entrenador', value: 'Trainer' },
    { label: 'Herramienta', value: 'Pokémon Tool' },
    { label: 'Estadio', value: 'Stadium' },
  ];

  // Carga de sets desde API
  const [sets, setSets] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('https://api.pokemontcg.io/v2/sets');
        const json = await resp.json();
        setSets(json.data || []);
      } catch (e) {
        console.error('Error al cargar sets:', e);
      }
    })();
  }, []);

  // Definición estática de tipos de energía
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

  // Carga biblioteca para contador
  const [library, setLibrary] = useState<{ cardId: string; quantity: number }[]>([]);
  useEffect(() => {
    if (!userObj) return;
    fetch(`https://myappserve-go.onrender.com/library?userId=${userObj.id}`)
      .then(r => r.json())
      .then(data => setLibrary(data.library))
      .catch(console.error);
  }, [userObj]);

  // Función de búsqueda
  const buscarCarta = async () => {
    const raw = searchTerm.trim();
    if (!raw) {
      setSelectedCategory(null);
      setSelectedSet(null);
      setSelectedType(null);
      setCards([]);
      return;
    }
    setLoading(true);
    try {
      const withSpaces = raw;
      const withHyphens = raw.replace(/\s+/g, '-');
      const noSpaces = raw.replace(/\s+/g, '');
      const query = `name:"${withSpaces}" OR name:"${withHyphens}" OR name:"${noSpaces}"`;
      const q = encodeURIComponent(query);
      const resp = await fetch(`https://api.pokemontcg.io/v2/cards?q=${q}`);
      const json = await resp.json();
      setCards(json.data || []);
      setSelectedSet(null);
      setSelectedType(null);
      setSelectedCategory(null);
    } catch (e) {
      Alert.alert('Error', 'No se pudo obtener las cartas.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Lógica filtros dinámicos
  const availableSets = !searchTerm.trim()
    ? sets
    : sets.filter(s => cards.some(c => c.set?.id === s.id));
  const availableTypes = !searchTerm.trim()
    ? energyTypes
    : energyTypes.filter(et => cards.some(c => Array.isArray(c.types) && c.types.includes(et.type)));

  const filteredCards = cards
    .filter(c =>
      !selectedCategory
        ? true
        : selectedCategory === 'Trainer'
        ? c.supertype === 'Trainer'
        : Array.isArray(c.subtypes) && c.subtypes.includes(selectedCategory)
    )
    .filter(c => (!selectedSet ? true : c.set?.id === selectedSet))
    .filter(c => (!selectedType ? true : Array.isArray(c.types) && c.types.includes(selectedType)));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.searchContainer} keyboardShouldPersistTaps="handled">
        {/* Filtro Categoría */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilterContainer} nestedScrollEnabled>
          {categoryOptions.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.categoryButton, selectedCategory === opt.value && styles.categoryButtonSelected]}
              onPress={() => setSelectedCategory(prev => (prev === opt.value ? null : opt.value))}
            >
              <Text style={[styles.categoryLabel, { color: isDarkMode ? '#fff' : '#000' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* Filtro Sets */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.setFilterContainer} nestedScrollEnabled>
          {availableSets.map(set => (
            <TouchableOpacity
              key={set.id}
              style={[styles.setButton, selectedSet === set.id && styles.setButtonSelected]}
              onPress={() => setSelectedSet(prev => (prev === set.id ? null : set.id))}
            >
              <Image source={{ uri: set.images.logo }} style={styles.setIcon} />
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* Filtro Tipos */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFilterContainer} nestedScrollEnabled>
          {availableTypes.map(({ type, icon }) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, selectedType === type && styles.typeButtonSelected]}
              onPress={() => setSelectedType(prev => (prev === type ? null : type))}
            >
              <Image source={icon} style={styles.typeIcon} />
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* Nueva barra de búsqueda */}
        <View style={styles.searchLocalContainer}>
          <TextInput
            style={styles.inputLocal}
            placeholder="Buscar en mi biblioteca"
            placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            onSubmitEditing={buscarCarta}
          />
          <TouchableOpacity onPress={buscarCarta} style={styles.searchIconButton}>
            <Ionicons name="search-outline" size={24} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>
        </View>
        {/* Cartas filtradas */}
        {filteredCards.map(card => {
          const qty = library.find(e => e.cardId === card.id)?.quantity || 0;
          return (
            <View key={card.id} style={styles.cardBox}>
              {qty > 0 && (
                <View style={styles.counterBadge}>
                  <Text style={styles.counterText}>{qty}</Text>
                </View>
              )}
              {/* – */}
              <TouchableOpacity
                style={styles.iconCircleLeft}
                onPress={async () => {
                  try {
                    const res = await fetch('https://myappserve-go.onrender.com/library/remove', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: userObj.id, cardId: card.id })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    setLibrary(data.library);
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  }
                }}
              >
                <Ionicons name="remove" size={16} color="#fff" />
              </TouchableOpacity>
              {/* + */}
              <TouchableOpacity
                style={styles.iconCircle}
                onPress={async () => {
                  try {
                    const res = await fetch('https://myappserve-go.onrender.com/library/add', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: userObj.id, cardId: card.id })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    setLibrary(data.library);
                    Alert.alert(
                      'Añadido',
                      `Ahora tienes ${data.library.find((e: any) => e.cardId === card.id).quantity} de esta carta.`
                    );
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  }
                }}
              >
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
              <Image source={{ uri: card.images.small }} style={styles.cardImage} />
              <Text style={[styles.cardName, { color: isDarkMode ? '#fff' : '#000' }]}>
                {card.name}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      {/* barra inferior */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => {
          if (!userObj) return Alert.alert('Usuario no disponible');
          const usuarioParam = encodeURIComponent(JSON.stringify(userObj));
          router.push({ pathname: '/library', params: { usuario: usuarioParam } });
        }}>
          <Ionicons name="book" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/friends')}>
          <Ionicons name="people-outline" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={28} color={isDarkMode ? '#fff' : '#000'} />
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
  container: { flex: 1, backgroundColor: isDarkMode ? '#121212' : '#fff' },
  searchContainer: { padding: 24, paddingTop: 40, paddingBottom: 100, alignItems: 'center' },
  categoryFilterContainer: { marginBottom: 12, paddingHorizontal: 4 },
  categoryButton: { marginHorizontal: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: isDarkMode ? '#1e1e1e' : '#f0f0f0' },
  categoryButtonSelected: { borderWidth: 2, borderColor: '#6A0DAD' },
  categoryLabel: { fontSize: 14, fontWeight: '500' },
  setFilterContainer: { marginBottom: 12, paddingHorizontal: 4 },
  setButton: { marginHorizontal: 6, padding: 4, borderRadius: 6, backgroundColor: isDarkMode ? '#1e1e1e' : '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  setButtonSelected: { borderWidth: 2, borderColor: '#6A0DAD' },
  setIcon: { width: 40, height: 40, resizeMode: 'contain' },
  typeFilterContainer: { marginBottom: 16, paddingHorizontal: 4 },
  typeButton: { alignItems: 'center', marginHorizontal: 8, padding: 4, borderRadius: 6, backgroundColor: isDarkMode ? '#1e1e1e' : '#f0f0f0' },
  typeButtonSelected: { borderWidth: 2, borderColor: '#6A0DAD' },
  typeIcon: { width: 25, height: 25, resizeMode: 'contain' },
  searchLocalContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, marginBottom: 16, backgroundColor: isDarkMode ? '#1e1e1e' : '#f0f0f0', borderRadius: 6, width: '100%', paddingHorizontal: 12 },
  inputLocal: { flex: 1, height: 40, color: isDarkMode ? '#fff' : '#000' },
  searchIconButton: { marginLeft: 8 },
  cardBox: { width: '100%', alignItems: 'center', padding: 12, marginBottom: 16, backgroundColor: isDarkMode ? '#1e1e1e' : '#f9f9f9', borderRadius: 6 },
  cardImage: { width: '100%', height: 200, resizeMode: 'contain', borderRadius: 6, marginBottom: 8 },
  cardName: { fontSize: 12, fontWeight: '500' },
  iconCircle: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#6A0DAD', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  iconCircleLeft: { position: 'absolute', top: 8, left: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#6A0DAD', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  counterBadge: { position: 'absolute', top: 8, right: 48, backgroundColor: '#6A0DAD', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, zIndex: 1 },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  bottomBar: { position: 'absolute', bottom: 0, width: '100%', height: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderTopWidth: 1, borderTopColor: isDarkMode ? '#333' : '#ccc' },
  iconButton: { padding: 8 },
  sumText: { fontSize: 14, fontWeight: '600', color: isDarkMode ? '#fff' : '#000' },
});
