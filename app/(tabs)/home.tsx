import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/utils/apiFetch';
import { useRouter } from 'expo-router';
import { io } from 'socket.io-client';

export type Task = {
  id: string;
  title: string;
  dueDate: string;
  assigneeName: string;
  assigneeId?: string;
  createdBy: string;
  status: 'no_realizada' | 'incompleta' | 'completada';
};

type Filter = 'all' | 'today' | 'upcoming' | 'completed';

const filterLabels: Record<Filter, string> = {
  all: 'Todas',
  today: 'Hoy',
  upcoming: 'Próximas',
  completed: 'Completadas',
};

const statusLabels: Record<Task['status'], string> = {
  no_realizada: 'No realizada',
  incompleta: 'Incompleta',
  completada: 'Completada',
};

const Home: React.FC = () => {
  const router = useRouter();
  const [userObj, setUserObj] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('user')
      .then(raw => {
        if (raw) {
          const parsed = JSON.parse(raw);
          const userWithId = {
        ...parsed,
        _id: parsed._id || parsed.id // garantiza que tenga ._id
      };
      setUserObj(userWithId);
    }
  })
  .catch(err => console.error('[AsyncStorage user]', err));

    fetchTasks();

    const newSocket = io('https://myappserve-go.onrender.com');
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('newTask', (task: any) => {
      const newTask: Task = {
        id: task._id,
        title: task.title,
        dueDate: task.dueDate,
        assigneeName: task.assignee ? `${task.assignee.nombre} ${task.assignee.apellido}` : 'Sin asignar',
        assigneeId: typeof task.assignee === 'object' ? task.assignee._id : task.assignee,
        createdBy: task.createdBy,
        status: task.status || 'no_realizada',
      };
      setTasks(prev => [newTask, ...prev]);
    });
    socket.on('taskUpdated', (task: any) => {
      const updatedTask: Task = {
        id: task._id,
        title: task.title,
        dueDate: task.dueDate,
        assigneeName: task.assignee ? `${task.assignee.nombre} ${task.assignee.apellido}` : 'Sin asignar',
        assigneeId: typeof task.assignee === 'object' ? task.assignee._id : task.assignee,
        createdBy: task.createdBy,
        status: task.status || 'no_realizada',
      };
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    });
    socket.on('taskDeleted', ({ id }: { id: string }) => {
      setTasks(prev => prev.filter(t => t.id !== id));
    });
    socket.on('statusUpdated', (task: any) => {
      setTasks(prev => prev.map(t => t.id === task._id ? { ...t, status: task.status } : t));
    });
  }, [socket]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/tasks');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { tasks: serverTasks } = await res.json();
      setTasks(serverTasks.map((t: any) => ({
        id: t._id,
        title: t.title,
        dueDate: t.dueDate,
        assigneeName: typeof t.assignee === 'object' && t.assignee !== null
          ? `${t.assignee.nombre} ${t.assignee.apellido}`
          : 'Sin asignar',
        assigneeId: typeof t.assignee === 'object' && t.assignee !== null
          ? t.assignee._id?.toString()
          : t.assignee?.toString(),
        createdBy: t.createdBy,
        status: t.status || 'no_realizada',
      })));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      Alert.alert('Error', 'No se pudieron cargar las tareas');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: Task['status']) => {
    try {
      const res = await apiFetch(`/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setExpandedTaskId(null);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedTaskId(prev => (prev === id ? null : id));
  };

  const filteredTasks = tasks.filter(t => {
    const today = new Date();
    const due = new Date(t.dueDate);
    const isSameDay = due.toDateString() === today.toDateString();
    if (filter === 'today') return isSameDay;
    if (filter === 'upcoming') return due > today;
    if (filter === 'completed') return t.status === 'completada';
    return true;
  });

  const renderItem = ({ item }: { item: Task }) => {
    console.log('TASK ID:', item.id);
    console.log('assigneeId:', item.assigneeId);
    console.log('userObj._id:', userObj?._id);
    console.log('es encargado:', item.assigneeId?.toString() === userObj?._id?.toString());


    const isAssignee = userObj && item.assigneeId?.toString() === userObj._id?.toString();
    const expanded = item.id === expandedTaskId;
    return (
      <View>
        <TouchableOpacity
          style={styles.taskItem}
          onPress={() => toggleExpand(item.id)}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.assignee}>Encargado: {item.assigneeName}</Text>
          <Text style={styles.date}>{new Date(item.dueDate).toLocaleDateString()}</Text>
        </TouchableOpacity>
        {expanded && (
          <View style={styles.expandContainer}>
            <Text style={styles.statusText}>Estado: {statusLabels[item.status]}</Text>
            {isAssignee && (
              <View style={styles.statusButtonsRow}>
                {(['no_realizada','incompleta','completada'] as Task['status'][]).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusButton,
                      item.status === s && styles.statusButtonActive
                    ]}
                    onPress={() => updateStatus(item.id, s)}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        item.status === s && styles.statusButtonTextActive
                      ]}
                    >
                      {statusLabels[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Mis Tareas</Text>
        <TouchableOpacity onPress={() => {
          if (!userObj) return;
          Alert.alert(
            `${userObj.nombre} ${userObj.apellido}`,
            `Apodo: ${userObj.apodo}\nCorreo: ${userObj.correo}`,
            [
              { text: 'Cerrar sesión', style: 'destructive', onPress: async () => {
                await AsyncStorage.removeItem('user');
                router.replace('/login');
              }},
              { text: 'Cancelar', style: 'cancel' }
            ]
          );
        }}>
          <Ionicons name="person-circle-outline" size={32} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {Object.entries(filterLabels).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setFilter(key as Filter)}
            style={[
              styles.filterBtn,
              filter === key && styles.filterBtnActive
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === key && styles.filterTextActive
              ]}
            >{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={filteredTasks.length === 0 && styles.emptyContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay tareas</Text>}
          refreshing={loading}
          onRefresh={fetchTasks}
        />
      )}

      <View style={styles.bottomBar}>
        <View style={{ width: 32 }} />
        <TouchableOpacity onPress={() => router.push('/task-form')} style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={56} color="#007AFF" />
        </TouchableOpacity>
        <View style={{ width: 32 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, padding: 16, paddingBottom: 80, backgroundColor: '#fff' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading:        { fontSize: 24, fontWeight: 'bold' },
  filterRow:      { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  filterBtn:      { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  filterBtnActive:{ backgroundColor: '#007AFF' },
  filterText:     { fontSize: 14, color: '#007AFF' },
  filterTextActive:{ color: '#fff' },
  taskItem:       { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  title:          { fontSize: 16 },
  assignee:       { fontSize: 12, color: '#555', marginTop: 4 },
  date:           { fontSize: 12, color: '#666', marginTop: 2 },
  expandContainer:{ padding: 12, backgroundColor: '#f9f9f9' },
  statusText:     { fontSize: 12, color: '#007AFF', marginBottom: 8 },
  statusButtonsRow:{ flexDirection: 'row', justifyContent: 'space-around' },
  statusButton:    { paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#007AFF', borderRadius: 4 },
  statusButtonActive:{ backgroundColor: '#007AFF' },
  statusButtonText:{ fontSize: 12, color: '#007AFF' },
  statusButtonTextActive:{ color: '#fff' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText:      { fontSize: 16, color: '#999' },
  bottomBar:      {
    position: 'absolute', bottom: 0, width: '100%', height: 72,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#ccc'
  },
  addButton:      { marginTop: -28, alignItems: 'center', justifyContent: 'center' }
});

export default Home;
