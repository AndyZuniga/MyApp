import React, { useState, useEffect, useRef } from 'react';
//import { View, TextInput, Button, FlatList, Image, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { View, TextInput, Button, FlatList, Image, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
 // ✅ Agregado SafeAreaView

// Tipos para las cartas y sets
interface Card {
  id: string;
  name: string;
  rarity: string;
  types?: string[];
  supertype: string;
  set: {
    id: string;
    name: string;
    logo: string;
  };
  images: {
    small: string;
  };
}

interface Set {
  id: string;
  name: string;
  images: {
    logo: string;
  };
}

const HomeScreen = () => {
  const [searchText, setSearchText] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [sets, setSets] = useState<Set[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [allSets, setAllSets] = useState<Set[]>([]);
  const cache = useRef<Record<string, Card[]>>({});  // Cache para evitar peticiones repetidas

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const response = await fetch('https://api.pokemontcg.io/v2/sets');
        const data = await response.json();
        setSets(data.data);
        setAllSets(data.data);
      } catch (error) {
        console.error('Error fetching sets:', error);
      }
    };

    fetchSets();
  }, []);

  const buildQueryKey = () => `${searchText}|${selectedSetId}`;

  const fetchCards = async () => {
    try {
      const queryKey = buildQueryKey();

      if (cache.current[queryKey]) {
        setCards(cache.current[queryKey]);
      } else {
        let query = '';
        const searchTextFormatted = searchText.replace(/ /g, '-');
        if (searchTextFormatted) query += `name:\"${searchTextFormatted}\"`;
        if (selectedSetId) {
          if (query) query += ' AND ';
          query += `set.id:\"${selectedSetId}\"`;
        }

        const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setCards(data.data);
        cache.current[queryKey] = data.data;
      }

      // Actualiza los sets mostrados según la búsqueda
      if (searchText) {
        if (selectedSetId) {
          const selectedSet = allSets.find(set => set.id === selectedSetId);
          setSets(selectedSet ? [selectedSet] : []);
        } else {
          const filteredSetIds = [...new Set(cache.current[queryKey].map(card => card.set.id))];
          const filteredSets = allSets.filter(set => filteredSetIds.includes(set.id));
          setSets(filteredSets);
        }
      } else {
        setSets(allSets);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (searchText || selectedSetId) {
      fetchCards();
    } else {
      setCards([]);
      setSets(allSets);
    }
  }, [selectedSetId]);

  const renderCard = ({ item }: { item: Card }) => (
    <View style={styles.cardContainer}>
      <Image source={{ uri: item.images.small }} style={styles.cardImage} />
      <Text style={styles.cardName}>{item.name}</Text>
      <Text style={styles.cardText}>Set: {item.set.name}</Text>
      <Text style={styles.cardText}>Rareza: {item.rarity}</Text>
      <Text style={styles.cardText}>Tipo: {item.types?.join(', ')}</Text>
      <Text style={styles.cardText}>Supertipo: {item.supertype}</Text>
    </View>
  );

  const renderSetCarousel = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
      {sets.map((set) => {
        const isSelected = selectedSetId === set.id;
        return (
          <TouchableOpacity
            key={set.id}
            style={[styles.setItem, isSelected && styles.selectedSet]}
            onPress={() => {
              const newSetId = selectedSetId === set.id ? '' : set.id;
              setSelectedSetId(newSetId);

              // Restaurar sets si se desmarca un set específico
              if (newSetId === '' && searchText) {
                const queryKey = `${searchText}|`;
                const cardsInSearch = cache.current[queryKey] || cards;
                const filteredSetIds = [...new Set(cardsInSearch.map(card => card.set.id))];
                const filteredSets = allSets.filter(set => filteredSetIds.includes(set.id));
                setSets(filteredSets);
              }
            }}
          >
            <View style={styles.setFixedSize}> {/* ✅ Caja con tamaño fijo */}
              <Image source={{ uri: set.images.logo }} style={styles.setLogo} />
              <Text style={[styles.setName, isSelected && styles.selectedSetText]}>{set.name}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}> {/* ✅ Evita que el input quede debajo del notch */}
      <TextInput
        placeholder="Buscar carta por nombre"
        value={searchText}
        onChangeText={setSearchText}
        onSubmitEditing={fetchCards}
        style={styles.input}
      />

      {renderSetCarousel()}

      <Button title="Buscar" onPress={fetchCards} />

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        numColumns={2}
        contentContainerStyle={styles.cardList}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 25 : 16, // ✅ respeta el notch
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 8,
    borderRadius: 8,
  },
  carousel: {
    height: 150,
    maxHeight: 150,           // ✅ asegura que nunca se reduzca
    minHeight: 150,           // ✅ asegura que nunca crezca
    width: '100%',
    marginVertical: 7,
    borderWidth: 2,
    borderColor: 'red',
    borderRadius: 10,
    paddingVertical: 4
  },
  setItem: {
    alignItems: 'center',
    marginHorizontal: 6,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#eee',
    height: '100%',        // ✅ mantiene altura consistente con el carruse
  },
  selectedSet: {
    backgroundColor: '#b28dff',
  },
  selectedSetText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  setFixedSize: {
    width: 120,
    height: 130,             // ✅ un poco más alto para nombres largos
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  setLogo: {
    width: '80%',
    height: 50,
    resizeMode: 'contain',    // ✅ Mantiene proporciones
  },
  setName: {
    fontSize: 11,
    marginTop: 5,
    textAlign: 'center',
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  cardList: {
    paddingTop: 16,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    marginBottom: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#f9f9f9'
  },
  cardImage: {
    width: 120,
    height: 170,
    resizeMode: 'contain',
  },
  cardName: {
    marginTop: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardText: {
    textAlign: 'center',
    fontSize: 12,
  }
});

export default HomeScreen;
