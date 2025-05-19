import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CARD_CACHE_KEY = 'cardDetailsCache';

export default function LibraryScreen() {
  const router = useRouter();
  const isDarkMode = useColorScheme() === 'dark';
  const styles = getStyles(isDarkMode);

  // Usuario y cartas
  const [userObj, setUserObj] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);

  // Filtros: categoría, set, tipo
  const categoryOptions = [
    { label: 'Entrenador', value: 'Trainer' },
    { label: 'Objeto', value: 'Item' },
    { label: 'Herramienta', value: 'Pokémon Tool' },
    { label: 'Estadio', value: 'Stadium' },
  ];
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sets, setSets] = useState<any[]>([]);
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Búsqueda local
  const [localSearch, setLocalSearch] = useState<string>('');

  // Mostrar Low/Trend
  const [showLowSum, setShowLowSum] = useState<boolean>(true);

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

  // Recuperar usuario
  useEffect(() => {
    AsyncStorage.getItem('user')
      .then(data => data && setUserObj(JSON.parse(data)))
      .catch(() => Alert.alert('Error', 'No se pudo leer usuario'));
  }, []);

  // Cargar sets
  useEffect(() => {
    fetch('https://api.pokemontcg.io/v2/sets')
      .then(res => res.json())
      .then(json => setSets(json.data || []))
      .catch(() => {});
  }, []);

  // Cargar biblioteca y detalles cache
  useEffect(() => {
    if (!userObj) return;
    (async () => {
      try {
        const res = await fetch(`https://myappserve-go.onrender.com/library?userId=${userObj.id}`);
        const { library } = await res.json();
        const raw = await AsyncStorage.getItem(CARD_CACHE_KEY);
        const cache = raw ? JSON.parse(raw) : {};
        const newCache: any = { ...cache };
        const details = await Promise.all(
          library
            .filter(e => e.quantity > 0)
            .map(async e => {
              let cardData = newCache[e.cardId];
              if (!cardData) {
                const r = await fetch(`https://api.pokemontcg.io/v2/cards/${e.cardId}`);
                const { data } = await r.json();
                cardData = data;
                newCache[e.cardId] = data;
              }
              return { ...cardData, quantity: e.quantity };
            })
        );
        setCards(details);
        await AsyncStorage.setItem(CARD_CACHE_KEY, JSON.stringify(newCache));
      } catch (err: any) {
        Alert.alert('Error', err.message);
      }
    })();
  }, [userObj]);

  // Actualizar biblioteca y filtrar quantity=0
  const updateLibrary = async (cardId: string, action: 'add' | 'remove') => {
    if (!userObj) return Alert.alert('Error', 'Usuario no disponible');
    const ep = action === 'add' ? 'library/add' : 'library/remove';
    try {
      const res = await fetch(`https://myappserve-go.onrender.com/${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userObj.id, cardId }),
      });
      const { library } = await res.json();
      setCards(prev => prev
        .map(c => ({ ...c, quantity: library.find((e:any)=>e.cardId===c.id)?.quantity||0 }))
        .filter(c=>c.quantity>0)
      );
    } catch (e:any) {
      Alert.alert('Error', e.message);
    }
  };

  // Helper para categoria
  const matchesCategory = (c:any, cat:string) =>
    cat === 'Pokémon' ? c.supertype === 'Pokémon' :
    cat === 'Trainer' ? c.supertype === 'Trainer' :
    Array.isArray(c.subtypes) && c.subtypes.includes(cat);

  // Filtrados dinámicos
  const availableCategories = categoryOptions.filter(opt =>
    cards.some(c => matchesCategory(c, opt.value))
  );
  const filteredByCategory = cards.filter(c =>
    !selectedCategory || matchesCategory(c, selectedCategory)
  );
  const availableSets = sets.filter(s =>
    filteredByCategory.some(c => c.set?.id === s.id)
  );
  const filteredBySet = filteredByCategory.filter(c =>
    !selectedSet || c.set?.id === selectedSet
  );
  const availableTypes = energyTypes.filter(et =>
    filteredBySet.some(c => Array.isArray(c.types) && c.types.includes(et.type))
  );
  const filteredByType = filteredBySet.filter(c =>
    !selectedType || (Array.isArray(c.types) && c.types.includes(selectedType))
  );
  const localFiltered = filteredByType.filter(c =>
    c.name.toLowerCase().includes(localSearch.toLowerCase())
  );

  // Suma Low/Trend
  const sumLow = localFiltered.reduce((s,c)=>s+(c.cardmarket?.prices?.lowPrice||0)*c.quantity,0);
  const sumTrend = localFiltered.reduce((s,c)=>s+(c.cardmarket?.prices?.trendPrice||0)*c.quantity,0);
  const sumText = showLowSum
    ? `Total Low: $${sumLow.toFixed(2)}`
    : `Total Trend: $${sumTrend.toFixed(2)}`;

  // Funciones de navegación y menú inferior
  const goHome = () => router.replace('/home');
  const showHelp = () => Alert.alert('Ayuda', 'Aquí puedes ver tu biblioteca. Usa + / - para ajustar.');
  const showOptions = () => Alert.alert('Opciones', undefined, [
    { text: 'Mis datos', onPress: () => userObj && Alert.alert('Datos de usuario', `Apodo: ${userObj.apodo}
Correo: ${userObj.correo}`) },
    { text: 'Cerrar Sesión', style: 'destructive', onPress: async () => { await AsyncStorage.removeItem('user'); router.replace('/login'); } },
    { text: 'Cancelar', style: 'cancel' },
  ]);


  return (
    <View style={styles.container}>
      {/* Filtro Categoría */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
        {availableCategories.map(opt=> (
          <TouchableOpacity key={opt.value} style={[styles.catButton, selectedCategory===opt.value&&styles.catButtonSelected]} onPress={()=>setSelectedCategory(prev=>prev===opt.value?null:opt.value)}>
            <Text style={[styles.catLabel, {color:isDarkMode?'#fff':'#000'}]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Filtro Sets */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.setContentContainer}>
        {availableSets.map(set=> (
          <TouchableOpacity key={set.id} style={[styles.setButton, selectedSet===set.id&&styles.setButtonSelected]} onPress={()=>setSelectedSet(prev=>prev===set.id?null:set.id)}>
            <Image source={{uri:set.images.logo}} style={styles.setIcon}/>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Filtro Tipos */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeContentContainer}>
        {availableTypes.map(({type,icon})=> (
          <TouchableOpacity key={type} style={[styles.typeButton, selectedType===type&&styles.typeButtonSelected]} onPress={()=>setSelectedType(prev=>prev===type?null:type)}>
            <Image source={icon} style={styles.typeIcon}/>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Búsqueda */}
      <View style={styles.searchLocalContainer}>
        <TextInput style={styles.inputLocal} placeholder="Buscar en mi biblioteca" placeholderTextColor={isDarkMode?'#aaa':'#999'} value={localSearch} onChangeText={setLocalSearch}/>
        <Ionicons name="search-outline" size={20} color={isDarkMode?'#fff':'#000'} />
      </View>
      {/* Listado cartas */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {localFiltered.map(card=> (
          <View key={card.id} style={styles.cardBox}>
            {card.quantity>0&&<View style={styles.counterBadge}><Text style={styles.counterText}>{card.quantity}</Text></View>}
            <TouchableOpacity style={styles.iconCircleLeft} onPress={()=>updateLibrary(card.id,'remove')}><Ionicons name="remove" size={16} color="#fff"/></TouchableOpacity>
            {card.cardmarket?.prices.lowPrice!=null&&<Text style={styles.cardLowPrice}>Low: ${card.cardmarket.prices.lowPrice.toFixed(2)}</Text>}
            {card.cardmarket?.prices.trendPrice!=null&&<Text style={styles.cardTrendPrice}>Trend: ${card.cardmarket.prices.trendPrice.toFixed(2)}</Text>}
            <TouchableOpacity style={styles.iconCircle} onPress={()=>updateLibrary(card.id,'add')}><Ionicons name="add" size={16} color="#fff"/></TouchableOpacity>
            <Image source={{uri:card.images.small}} style={styles.cardImage}/>
            <Text style={[styles.cardName,{color:isDarkMode?'#fff':'#000'}]}>{card.name}</Text>
          </View>
        ))}
      </ScrollView>
      {/* Barra inferior */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.iconButton} onPress={()=>setShowLowSum(prev=>!prev)}><Text style={styles.sumText}>{sumText}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={showHelp}><Ionicons name="help-circle-outline" size={28} color={isDarkMode?'#fff':'#000'} /></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={goHome}><Image source={require('@/assets/images/pokeball.png')} style={styles.homeIcon}/></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={showOptions}><Ionicons name="person" size={28} color={isDarkMode?'#fff':'#000'} /></TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (isDarkMode:boolean)=>StyleSheet.create({
  container:{flex:1,backgroundColor:isDarkMode?'#121212':'#fff'},
  filterContainer:{paddingHorizontal:4,marginVertical:8},
  catButton:{marginHorizontal:6,paddingHorizontal:12,paddingVertical:6,borderRadius:6,backgroundColor:isDarkMode?'#1e1e1e':'#f0f0f0'},
  catButtonSelected:{borderWidth:2,borderColor:'#6A0DAD'},
  catLabel:{fontSize:14,fontWeight:'500'},
  setContentContainer:{paddingHorizontal:4,alignItems:'center'},
  setButton:{marginHorizontal:6,padding:4,borderRadius:6,backgroundColor:isDarkMode?'#1e1e1e':'#f0f0f0'},
  setButtonSelected:{borderWidth:2,borderColor:'#6A0DAD'},
  setIcon:{width:40,height:40,resizeMode:'contain'},
  typeContentContainer:{paddingHorizontal:4,alignItems:'center',marginBottom:16},
  typeButton:{alignItems:'center',marginHorizontal:8,padding:4,borderRadius:6,backgroundColor:isDarkMode?'#1e1e1e':'#f0f0f0'},
  typeButtonSelected:{borderWidth:2,borderColor:'#6A0DAD'},
  typeIcon:{width:25,height:25,resizeMode:'contain'},
  searchLocalContainer:{flexDirection:'row',alignItems:'center',padding:8,marginHorizontal:4,backgroundColor:isDarkMode?'#1e1e1e':'#f0f0f0',borderRadius:6,marginBottom:8},
  inputLocal:{flex:1,height:40,color:isDarkMode?'#fff':'#000',paddingHorizontal:12,borderWidth:1,borderColor:isDarkMode?'#333':'#ccc',borderRadius:4},
  listContainer:{padding:24,paddingBottom:100},
  cardBox:{width:'100%',padding:12,marginBottom:16,backgroundColor:isDarkMode?'#1e1e1e':'#f9f9f9',borderRadius:6,position:'relative'},
  cardImage:{width:'100%',height:200,resizeMode:'contain',borderRadius:6,marginTop:8},
  cardName:{fontSize:16,fontWeight:'500',alignSelf:'center',marginTop:8},
  cardLowPrice:{position:'absolute',top:48,left:48,fontSize:12,fontWeight:'500',color:isDarkMode?'#fff':'#000'},
  cardTrendPrice:{position:'absolute',top:64,left:48,fontSize:12,fontWeight:'500',color:isDarkMode?'#fff':'#000'},
  counterBadge:{position:'absolute',top:8,right:48,backgroundColor:'#6A0DAD',borderRadius:8,paddingHorizontal:6,paddingVertical:2,zIndex:1},
  counterText:{color:'#fff',fontSize:12,fontWeight:'600'},
  iconCircle:{position:'absolute',top:8,right:8,width:32,height:32,borderRadius:16,backgroundColor:'#6A0DAD',justifyContent:'center',alignItems:'center',zIndex:1},
  iconCircleLeft:{position:'absolute',top:8,left:8,width:32,height:32,borderRadius:16,backgroundColor:'#6A0DAD',justifyContent:'center',alignItems:'center',zIndex:1},
  bottomBar:{position:'absolute',bottom:0,width:'100%',height:60,flexDirection:'row',justifyContent:'space-around',alignItems:'center',backgroundColor:isDarkMode?'#1e1e1e':'#fff',borderTopWidth:1,borderTopColor:isDarkMode?'#333':'#ccc'},
  iconButton:{padding:8},
  homeIcon:{width:28,height:28,tintColor:isDarkMode?'#fff':'#000'},
  sumText:{fontSize:14,fontWeight:'600',color:isDarkMode?'#fff':'#000'},
});
