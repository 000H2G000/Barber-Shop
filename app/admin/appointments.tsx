import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Alert, 
  Modal, 
  TextInput,
  RefreshControl
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { db } from '../../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

const STATUS_COLORS = {
  pending: '#ED8936',
  confirmed: '#48BB78',
  completed: '#4299E1',
  cancelled: '#E53E3E',
};

export default function AdminAppointmentsScreen() {
  const { id: selectedAppointmentId } = useLocalSearchParams();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch appointments from Firestore
  const fetchAppointments = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        orderBy('timestamp', 'asc')
      );
      
      const querySnapshot = await getDocs(appointmentsQuery);
      
      const appointmentsList: any[] = [];
      querySnapshot.forEach((doc) => {
        appointmentsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setAppointments(appointmentsList);
      applyFilters(appointmentsList, statusFilter, searchQuery);
      
      // If we have a selectedAppointmentId from params, find and show that appointment
      if (selectedAppointmentId) {
        const selected = appointmentsList.find(appt => appt.id === selectedAppointmentId);
        if (selected) {
          setSelectedAppointment(selected);
          setModalVisible(true);
        }
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Apply filters to appointments
  const applyFilters = (appts: any[], status: string, search: string) => {
    let filtered = appts;
    
    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(appt => appt.status === status);
    }
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(appt => 
        (appt.userName && appt.userName.toLowerCase().includes(searchLower)) ||
        (appt.userEmail && appt.userEmail.toLowerCase().includes(searchLower)) ||
        (appt.service && appt.service.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredAppointments(filtered);
  };
  
  useEffect(() => {
    fetchAppointments();
  }, [user, selectedAppointmentId]);
  
  // When filters change, apply them to the existing appointments
  useEffect(() => {
    applyFilters(appointments, statusFilter, searchQuery);
  }, [statusFilter, searchQuery]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };
  
  // Handle updating appointment status
  const updateAppointmentStatus = async (id: string, newStatus: string) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'appointments', id), {
        status: newStatus
      });
      
      // Update local state
      setAppointments(prevAppointments =>
        prevAppointments.map(appointment =>
          appointment.id === id
            ? { ...appointment, status: newStatus }
            : appointment
        )
      );
      
      setFilteredAppointments(prevFiltered =>
        prevFiltered.map(appointment =>
          appointment.id === id
            ? { ...appointment, status: newStatus }
            : appointment
        )
      );
      
      if (selectedAppointment?.id === id) {
        setSelectedAppointment({
          ...selectedAppointment,
          status: newStatus
        });
      }
      
      Alert.alert('Success', `Appointment status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      Alert.alert('Error', 'Failed to update appointment status');
    } finally {
      setUpdating(false);
    }
  };
  
  // Handle deleting appointment
  const handleDeleteAppointment = async (id: string) => {
    Alert.alert(
      'Delete Appointment',
      'Are you sure you want to delete this appointment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              await deleteDoc(doc(db, 'appointments', id));
              
              // Update local state
              setAppointments(prevAppointments =>
                prevAppointments.filter(appointment => appointment.id !== id)
              );
              
              setFilteredAppointments(prevFiltered =>
                prevFiltered.filter(appointment => appointment.id !== id)
              );
              
              setModalVisible(false);
              setSelectedAppointment(null);
              
              Alert.alert('Success', 'Appointment deleted successfully');
            } catch (error) {
              console.error('Error deleting appointment:', error);
              Alert.alert('Error', 'Failed to delete appointment');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };
  
  // Filter buttons
  const FilterButton = ({ title, value }: { title: string, value: string }) => {
    const isActive = statusFilter === value;
    
    return (
      <TouchableOpacity
        style={[
          styles.filterButton,
          isActive && { backgroundColor: '#2D3748' }
        ]}
        onPress={() => setStatusFilter(value)}
      >
        <Text style={[
          styles.filterButtonText,
          isActive && { color: 'white' }
        ]}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  };
  
  // Render appointment item
  const renderAppointmentItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.appointmentItem}
      onPress={() => {
        setSelectedAppointment(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.appointmentHeader}>
        <View>
          <Text style={styles.serviceName}>{item.service}</Text>
          <Text style={styles.userName}>{item.userName}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || '#718096' }
        ]}>
          <Text style={styles.statusText}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={styles.appointmentDetails}>
        <View style={styles.detailRow}>
          <FontAwesome name="calendar" size={14} color="#718096" />
          <Text style={styles.detailText}>{item.date}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <FontAwesome name="clock-o" size={14} color="#718096" />
          <Text style={styles.detailText}>{item.time}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <FontAwesome name="user-md" size={14} color="#718096" />
          <Text style={styles.detailText}>{item.barber}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D3748" />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color="#718096" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search appointments..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>
      
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <FilterButton title="All" value="all" />
          <FilterButton title="Pending" value="pending" />
          <FilterButton title="Confirmed" value="confirmed" />
          <FilterButton title="Completed" value="completed" />
          <FilterButton title="Cancelled" value="cancelled" />
        </ScrollView>
      </View>
      
      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="calendar-o" size={60} color="#A0AEC0" />
          <Text style={styles.emptyText}>No appointments found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAppointments}
          renderItem={renderAppointmentItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
      
      {/* Appointment Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAppointment && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Appointment Details</Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <FontAwesome name="times" size={20} color="#718096" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.appointmentDetail}>
                  <Text style={styles.detailLabel}>Service</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.service}</Text>
                </View>
                
                <View style={styles.appointmentDetail}>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.userName}</Text>
                </View>
                
                <View style={styles.appointmentDetail}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.userEmail}</Text>
                </View>
                
                <View style={styles.appointmentDetail}>
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailValue}>
                    {selectedAppointment.date} at {selectedAppointment.time}
                  </Text>
                </View>
                
                <View style={styles.appointmentDetail}>
                  <Text style={styles.detailLabel}>Barber</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.barber}</Text>
                </View>
                
                <View style={styles.appointmentDetail}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailValue}>${selectedAppointment.servicePrice}</Text>
                </View>
                
                <View style={styles.appointmentDetail}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_COLORS[selectedAppointment.status as keyof typeof STATUS_COLORS] || '#718096' }
                  ]}>
                    <Text style={styles.statusText}>
                      {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.modalActions}>
                  <Text style={styles.actionTitle}>Update Status:</Text>
                  
                  <View style={styles.statusButtons}>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        { backgroundColor: updating ? '#A0AEC0' : STATUS_COLORS.pending }
                      ]}
                      disabled={updating || selectedAppointment.status === 'pending'}
                      onPress={() => updateAppointmentStatus(selectedAppointment.id, 'pending')}
                    >
                      <Text style={styles.statusButtonText}>Pending</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        { backgroundColor: updating ? '#A0AEC0' : STATUS_COLORS.confirmed }
                      ]}
                      disabled={updating || selectedAppointment.status === 'confirmed'}
                      onPress={() => updateAppointmentStatus(selectedAppointment.id, 'confirmed')}
                    >
                      <Text style={styles.statusButtonText}>Confirm</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        { backgroundColor: updating ? '#A0AEC0' : STATUS_COLORS.completed }
                      ]}
                      disabled={updating || selectedAppointment.status === 'completed'}
                      onPress={() => updateAppointmentStatus(selectedAppointment.id, 'completed')}
                    >
                      <Text style={styles.statusButtonText}>Complete</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        { backgroundColor: updating ? '#A0AEC0' : STATUS_COLORS.cancelled }
                      ]}
                      disabled={updating || selectedAppointment.status === 'cancelled'}
                      onPress={() => updateAppointmentStatus(selectedAppointment.id, 'cancelled')}
                    >
                      <Text style={styles.statusButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteAppointment(selectedAppointment.id)}
                    disabled={updating}
                  >
                    <FontAwesome name="trash" size={16} color="#fff" />
                    <Text style={styles.deleteButtonText}>Delete Appointment</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#718096',
    fontSize: 16,
  },
  searchContainer: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterContainer: {
    marginBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonText: {
    color: '#2D3748',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
    marginTop: 10,
  },
  listContent: {
    padding: 15,
    paddingBottom: 30,
  },
  appointmentItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  userName: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  appointmentDetails: {
    marginBottom: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4A5568',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  closeButton: {
    padding: 5,
  },
  appointmentDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    paddingBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#718096',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3748',
  },
  modalActions: {
    marginTop: 20,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 10,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusButton: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  statusButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E53E3E',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
});