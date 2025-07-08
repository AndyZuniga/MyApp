import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput,
  TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '@/utils/apiFetch';
import { Ionicons } from '@expo/vector-icons';

type UserType = {
  _id: string;
  nombre: string;
  apellido: string;
  apodo: string;
};

const TaskForm: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [title, setTitle] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const [dueTime, setDueTime] = useState<string>('');
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  const [assigneeId, setAssigneeId] = useState<string>('');
  const [assigneeName, setAssigneeName] = useState<string>('Yo mismo');

  const [userId, setUserId] = useState<string>('');
  const [isEdit, setIsEdit] = useState<boolean>(false);

  useEffect(() => {
    AsyncStorage.getItem('user')
      .then(raw => {
        if (raw) {
          const u = JSON.parse(raw);
          setUserId(u._id || u.id);
        }
      })
      .catch(err => console.error('[AsyncStorage user]', err));
  }, []);

  useEffect(() => {
    if (id) {
      loadTask(id.toString());
    }
  }, [id]);

  const loadTask = async (taskId: string) => {
    try {
      const res = await apiFetch(`/tasks/${taskId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const task = await res.json();
      setTitle(task.title);
      setDueDate(task.dueDate);
      const taskTime = new Date(task.dueDate);
      setDueTime(taskTime.toISOString());
      setAssigneeId(task.assignee?._id || '');
      setAssigneeName(task.assignee ? `${task.assignee.nombre} ${task.assignee.apellido}` : 'Yo mismo');
      setIsEdit(true);
    } catch (err) {
      console.error('[loadTask]', err);
      Alert.alert('Error', 'No se pudo cargar la tarea');
    }
  };

  const searchUsers = async () => {
    const q = searchTerm.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await apiFetch(`/users/search?query=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { users } = await res.json();
      setSearchResults(users.filter((u: UserType) => u._id !== userId));
    } catch (err) {
      console.error('[searchUsers]', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const onSubmit = async () => {
    if (!title || !dueDate || !dueTime) {
      Alert.alert('Error', 'Título, fecha y hora límite son obligatorios');
      return;
    }
    try {
      const combinedDateTime = new Date(dueDate);
      const time = new Date(dueTime);
      combinedDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

      const body: any = { title, dueDate: combinedDateTime.toISOString() };
      if (assigneeId) body.assigneeId = assigneeId;

      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit ? `/tasks/${id}` : '/tasks';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      Alert.alert('Éxito', isEdit ? 'Tarea actualizada' : 'Tarea creada');
      router.back();
    } catch (err) {
      console.error('[submitTask]', err);
      Alert.alert('Error', 'No se pudo guardar la tarea');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Título</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Escribe el título"
      />

      <Text style={styles.label}>Fecha límite</Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
        <Text>{dueDate ? new Date(dueDate).toLocaleDateString() : 'Selecciona una fecha'}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={dueDate ? new Date(dueDate) : new Date()}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) setDueDate(date.toISOString());
          }}
        />
      )}

      <Text style={styles.label}>Hora límite</Text>
      <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.input}>
        <Text>{dueTime ? new Date(dueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Selecciona una hora'}</Text>
      </TouchableOpacity>
      {showTimePicker && (
        <DateTimePicker
          value={dueTime ? new Date(dueTime) : new Date()}
          mode="time"
          display="default"
          onChange={(_, time) => {
            setShowTimePicker(false);
            if (time) setDueTime(time.toISOString());
          }}
        />
      )}

      <Text style={styles.label}>Buscar encargado</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Nombre, apellido o apodo"
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={searchUsers}
        />
        <TouchableOpacity onPress={searchUsers} style={styles.searchIcon}>
          {searching
            ? <ActivityIndicator />
            : <Ionicons name="search" size={24} color="#007AFF" />}
        </TouchableOpacity>
      </View>
      {searchResults.map(u => (
        <TouchableOpacity
          key={u._id}
          style={styles.resultItem}
          onPress={() => {
            setAssigneeId(u._id);
            setAssigneeName(`${u.nombre} ${u.apellido}`);
            setSearchResults([]);
            setSearchTerm('');
          }}
        >
          <Text>{u.nombre} {u.apellido} (@{u.apodo})</Text>
        </TouchableOpacity>
      ))}
      <Text style={styles.assigneeText}>Encargado: {assigneeName}</Text>

      <TouchableOpacity onPress={onSubmit} style={styles.saveButton}>
        <Text style={styles.saveText}>{isEdit ? 'Actualizar' : 'Guardar'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, padding: 16, backgroundColor: '#fff' },
  label:          { marginTop: 12, fontSize: 16, fontWeight: '500' },
  input:          {
    marginTop: 6, padding: 10,
    borderWidth: 1, borderColor: '#ccc',
    borderRadius: 4
  },
  searchRow:      { flexDirection: 'row', alignItems: 'center' },
  searchIcon:     { marginLeft: 8, padding: 8 },
  resultItem:     {
    padding: 8, borderBottomWidth: 1,
    borderColor: '#eee'
  },
  assigneeText:   { marginTop: 8, fontStyle: 'italic' },
  saveButton:     {
    marginTop: 20, padding: 14,
    backgroundColor: '#007AFF', borderRadius: 4,
    alignItems: 'center'
  },
  saveText:       { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton:   {
    marginTop: 12, padding: 12,
    borderRadius: 4, alignItems: 'center'
  },
  cancelText:     { fontSize: 16, color: '#007AFF' },
});

export default TaskForm;
