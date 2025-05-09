import React, { useState, useEffect } from 'react';
import {View,Text,TextInput,ScrollView,TouchableOpacity,StyleSheet,useColorScheme,Alert,Image,} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 🔴 para logout
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const { usuario } = useLocalSearchParams<{ usuario: string }>();
  const userObj = usuario ? JSON.parse(usuario) : null;

  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  // 🔴 estados de búsqueda y filtros
  const [searchTerm, setSearchTerm]             = useState('');
  const [cards, setCards]                       = useState<any[]>([]);
  const [loading, setLoading]                   = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSet, setSelectedSet]           = useState<string | null>(null);
  const [selectedType, setSelectedType]         = useState<string | null>(null);

  // 🔴 opciones de categoría (+ Estadio agregado)
  const categoryOptions = [
    { label: 'Objeto',     value: 'Item'    },
    { label: 'Entrenador', value: 'Trainer' },
    { label: 'Herramienta',value: "Pokémon Tool"    },
    { label: 'Estadio',    value: 'Stadium' }, // 🔴 nuevo filtro Estadio
  ];

  // 🔴 carga de sets desde API
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

  // 🔴 definición estática de tipos de energía
  const energyTypes = [
    { type: 'Water',     icon: require('@/assets/images/energies/Energía_agua.png') },
    { type: 'Fire',      icon: require('@/assets/images/energies/Energía_fuego.png') },
    { type: 'Fairy',     icon: require('@/assets/images/energies/Energía_hada.png') },
    { type: 'Colorless', icon: require('@/assets/images/energies/Energía_incolora.png') },
    { type: 'Fighting',  icon: require('@/assets/images/energies/Energía_lucha.png') },
    { type: 'Metal',     icon: require('@/assets/images/energies/Energía_metálica.png') },
    { type: 'Darkness',  icon: require('@/assets/images/energies/Energía_oscura.png') },
    { type: 'Grass',     icon: require('@/assets/images/energies/Energía_planta.png') },
    { type: 'Psychic',   icon: require('@/assets/images/energies/Energía_psíquica.png') },
    { type: 'Lightning', icon: require('@/assets/images/energies/Energía_rayo.png') },
  ];
  useEffect(() => {
  if (!userObj) return;
  fetch(`https://myappserve-go.onrender.com/library?userId=${userObj.id}`)
    .then(r => r.json())
    .then(data => setLibrary(data.library))
    .catch(console.error);
}, [userObj]);


  // limpiar filtros y resultados si la búsqueda queda en blanco
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSelectedCategory(null);
      setSelectedType(null);
      setCards([]);
    }
  }, [searchTerm]);

  // cargar todas las cartas de un set cuando no hay término de búsqueda
  useEffect(() => {
    if (!searchTerm.trim() && selectedSet) {
      setLoading(true);
      fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${selectedSet}`)
        .then(res => res.json())
        .then(json => setCards(json.data || []))
        .catch(err => console.error('Error fetching set cards:', err))
        .finally(() => setLoading(false));
    }
    if (!searchTerm.trim() && !selectedSet) {
      setCards([]);
    }
  }, [selectedSet]);

  // 🔴 NUEVO: manejar siempre la categoría, independientemente de searchTerm
  useEffect(() => {
    if (selectedCategory) {
      setLoading(true);
      let query = '';
      if (selectedCategory === 'Trainer') {
        query = 'supertype:Trainer';
      } else {
        // Item, Tool, Stadium: subtypes bajo Trainer
        query = `supertype:Trainer subtypes:${selectedCategory}`;
      }
      fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(json => setCards(json.data || []))
        .catch(err => console.error('Error fetching category cards:', err))
        .finally(() => setLoading(false));

      // 🔴 limpiar otros filtros
      setSelectedSet(null);
      setSelectedType(null);
      // 🔴 limpiar búsqueda al aplicar categoría
      setSearchTerm('');
    } else if (!searchTerm.trim()) {
      // si deselecciona categoría y no hay búsqueda, limpiar resultados
      setCards([]);
    }
  }, [selectedCategory]);

// búsqueda de cartas por nombre, cubriendo espacios, guiones y nada
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
    // 🔴 Generamos 3 variantes:
    const withSpaces  = raw;                       // "Charizard V Max"
    const withHyphens = raw.replace(/\s+/g, '-');  // "Charizard-V-Max"
    const noSpaces    = raw.replace(/\s+/g, '');   // "CharizardVMax"

    // 🔴 Construimos un OR en la query para las 3 formas
    const query = 
      `name:"${withSpaces}" OR ` +
      `name:"${withHyphens}" OR ` +
      `name:"${noSpaces}"`;

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


  // logout y menú usuario
  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    router.replace('/login');
  };
  const showOptions = () => {
    Alert.alert('Opciones', undefined, [
      { text: 'Mis datos', onPress: () => {
          if (userObj) {
            Alert.alert(
              'Datos de usuario',
              `Apodo: ${userObj.apodo}\nCorreo: ${userObj.correo}\nNombre: ${userObj.nombre}\nID: ${userObj.id}`
            );
          } else Alert.alert('Usuario no disponible');
        }
      },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: handleLogout },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  // filtros dinámicos según resultados
  const availableSets = !searchTerm.trim()
    ? sets
    : sets.filter(s => cards.some(c => c.set?.id === s.id));
  const availableTypes = !searchTerm.trim()
    ? energyTypes
    : energyTypes.filter(et =>
        cards.some(c => Array.isArray(c.types) && c.types.includes(et.type))
      );

  // aplicar filtros finales sobre cards
  const filteredCards = cards
    .filter(c =>
      !selectedCategory
        ? true
        : selectedCategory === 'Trainer'
        ? c.supertype === 'Trainer'
        : Array.isArray(c.subtypes) && c.subtypes.includes(selectedCategory)
    )
    .filter(c => (!selectedSet ? true : c.set?.id === selectedSet))
    .filter(c =>
      !selectedType ? true : Array.isArray(c.types) && c.types.includes(selectedType)
    );
  const [library, setLibrary] = useState<{cardId:string,quantity:number}[]>([]);


  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.searchContainer} keyboardShouldPersistTaps="handled">
        {/* filtro categoría */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilterContainer}>
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

        {/* filtro sets */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.setFilterContainer}>
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

        {/* filtro tipos */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFilterContainer}>
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

        <TextInput
          style={styles.input}
          placeholder="Nombre de la carta"
          placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <TouchableOpacity style={styles.loginButton} onPress={buscarCarta} disabled={loading}>
          <Text style={styles.loginText}>{loading ? 'Buscando...' : 'Buscar'}</Text>
        </TouchableOpacity>

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
        <View style={styles.iconButton} />
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/library')}>
          <Ionicons name="book" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={showOptions}>
          <Ionicons name="person" size={28} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDarkMode ? '#121212' : '#fff' },
    searchContainer: { padding: 24, paddingTop: 40,paddingBottom: 100, alignItems: 'center' },
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
    input: { width: '100%', borderWidth: 1, borderColor: isDarkMode ? '#333' : '#ccc', backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', color: isDarkMode ? '#fff' : '#000', borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 16 },
    loginButton: { width: '100%', backgroundColor: '#6A0DAD', paddingVertical: 14, borderRadius: 6, alignItems: 'center', marginBottom: 16 },
    loginText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    cardBox: { width: '100%', alignItems: 'center', padding: 12, marginBottom: 16, backgroundColor: isDarkMode ? '#1e1e1e' : '#f9f9f9', borderRadius: 6 },
    cardImage: { width: '100%', height: 200, resizeMode: 'contain', borderRadius: 6, marginBottom: 8 },
    cardName: { fontSize: 12, fontWeight: '500' },
    bottomBar: { position: 'absolute', bottom: 0, width: '100%', height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderTopWidth: 1, borderTopColor: isDarkMode ? '#333' : '#ccc' },
    iconButton: { padding: 8 },
    iconCircle: {
      position: 'absolute',      // para superponerlo sobre la tarjeta
      top: 8,                    // separación del borde superior
      right: 8,                  // separación del borde derecho
      width: 32,                 // tamaño del círculo
      height: 32,
      borderRadius: 16,          // forma circular
      backgroundColor: '#6A0DAD',// mismo morado de tus botones
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,                 // para que siempre quede encima
    },
      iconCircleLeft: {
          position: 'absolute',
          top: 8,
          left: 8,           // en lugar de right
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#6A0DAD',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1,
        },
        counterBadge: {
  position: 'absolute',
  top: 8,
  right: 48,          // junto al botón “+”
  backgroundColor: '#6A0DAD',
  borderRadius: 8,
  paddingHorizontal: 6,
  paddingVertical: 2,
},
counterText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
},
  });