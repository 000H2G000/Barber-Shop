import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { db } from '../../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  deleteDoc,
  updateDoc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Updated Appointment type definition to match the booking data structure
interface Appointment {
  id: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  status: string;
  servicePrice?: number;
  serviceDuration?: number;
  userId: string;
  timestamp?: Timestamp;
}

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  
  // Icons for service types
  const serviceIcons: Record<string, string> = {
    'Haircut': '✂️',
    'Beard Trim': '🧔',
    'Hair & Beard': '💈',
    'Hair Color': '🎨',
    'Kids Cut': '👶',
    'default': '💇‍♂️'
  };

  // Get status color based on appointment status
  const getStatusColor = (status: string = 'confirmed') => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return '#48BB78'; // green
      case 'pending':
        return '#ED8936'; // orange
      case 'cancelled':
        return '#E53E3E'; // red
      case 'completed':
        return '#3182CE'; // blue
      default:
        return '#718096'; // gray
    }
  };

  // Check for new booking from AsyncStorage
  const checkNewBooking = async () => {
    try {
      const newAppointmentString = await AsyncStorage.getItem('new_appointment');
      if (newAppointmentString) {
        const newAppointment = JSON.parse(newAppointmentString) as Appointment;
        console.log('Found new appointment in AsyncStorage:', newAppointment);
        
        // Add to the appointments list if it's not already there
        setAppointments(prevAppointments => {
          const exists = prevAppointments.some(app => app.id === newAppointment.id);
          if (!exists) {
            return [newAppointment, ...prevAppointments];
          }
          return prevAppointments;
        });
        
        // Clear from storage after using
        await AsyncStorage.removeItem('new_appointment');
      }
    } catch (error) {
      console.error('Error checking for new appointment:', error);
    }
  };

  // Fetch user's appointments
  const fetchAppointments = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Query appointments for current user
      const appointmentsRef = collection(db, 'appointments');
      let appointmentsQuery;
      
      // Try to query with timestamp first
      try {
        appointmentsQuery = query(
          appointmentsRef,
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc') // Sort by timestamp descending
        );
        
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        
        if (!appointmentsSnapshot.empty) {
          const appointmentsList: Appointment[] = appointmentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data() as Omit<Appointment, 'id'>
          }));
          
          setAppointments(appointmentsList);
          setLoading(false);
          setRefreshing(false);
          
          // Check for any newly created appointment
          await checkNewBooking();
          return;
        }
      } catch (error) {
        console.log('Error querying by timestamp, falling back to date ordering');
      }
      
      // Fallback to just filtering by userId if timestamp ordering fails
      appointmentsQuery = query(
        appointmentsRef,
        where('userId', '==', user.uid)
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      const appointmentsList: Appointment[] = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Appointment, 'id'>
      }));
      
      // Sort manually by date if there's no timestamp
      appointmentsList.sort((a, b) => {
        // Compare dates first
        const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateComparison !== 0) return dateComparison;
        
        // If dates are the same, compare times
        return b.time.localeCompare(a.time);
      });
      
      setAppointments(appointmentsList);
      
      // Check for any newly created appointment after fetching
      await checkNewBooking();
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Failed to load your appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Check for refresh params and new appointment
  useEffect(() => {
    // Check for refresh parameter
    if (params.refresh === 'true') {
      console.log('Refresh param detected, fetching appointments');
      fetchAppointments();
    }
    
    // Check for direct new booking data passed as parameter
    if (params.newBooking) {
      try {
        const newAppointment = JSON.parse(params.newBooking as string) as Appointment;
        console.log('New appointment received from params:', newAppointment);
        
        // Add to the appointments list if it's not already there
        setAppointments(prevAppointments => {
          const exists = prevAppointments.some(app => app.id === newAppointment.id);
          if (!exists) {
            return [newAppointment, ...prevAppointments];
          }
          return prevAppointments;
        });
      } catch (error) {
        console.error('Error parsing new appointment data:', error);
      }
    }
  }, [params.refresh, params.newBooking]);
  
  useEffect(() => {
    fetchAppointments();
  }, [user]);
  
  // Handle refreshing the appointment list
  const handleRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };
  
  // Open confirmation modal for cancellation
  const openCancelConfirmation = (appointmentId: string) => {
    setAppointmentToCancel(appointmentId);
    setConfirmModalVisible(true);
  };
  
  // Cancel an appointment with custom modal confirmation
  const cancelAppointment = () => {
    if (!appointmentToCancel) return;
    
    // Show loading
    setLoading(true);
    
    // Get reference to the document
    const appointmentRef = doc(db, 'appointments', appointmentToCancel);
    
    // Update the document status
    updateDoc(appointmentRef, { status: 'cancelled' })
      .then(() => {
        // Update the local state immediately
        setAppointments(prev => 
          prev.map(app => 
            app.id === appointmentToCancel ? {...app, status: 'cancelled'} : app
          )
        );
        
        // Show success message
        Alert.alert(
          'Success',
          'Your appointment has been cancelled successfully.'
        );
      })
      .catch(error => {
        Alert.alert('Error', 'Failed to cancel appointment. Please try again.');
      })
      .finally(() => {
        setLoading(false);
        setConfirmModalVisible(false);
        setAppointmentToCancel(null);
      });
  };
  
  // Delete an appointment with simpler implementation
  const deleteAppointment = (appointmentId: string) => {
    Alert.alert(
      "Delete Appointment",
      "Are you sure you want to delete this appointment from your history?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Delete", 
          style: "destructive",
          onPress: () => {
            // Show loading
            setLoading(true);
            
            // Delete the document
            deleteDoc(doc(db, 'appointments', appointmentId))
              .then(() => {
                // Remove from local state
                setAppointments(prev => 
                  prev.filter(app => app.id !== appointmentId)
                );
                
                // Show success message
                Alert.alert(
                  'Success',
                  'The appointment has been removed from your history.'
                );
              })
              .catch(error => {
                console.error('Error deleting appointment:', error);
                Alert.alert(
                  'Error',
                  'Failed to delete appointment. Please try again.'
                );
              })
              .finally(() => {
                setLoading(false);
              });
          } 
        }
      ]
    );
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    };
    return date.toLocaleDateString(undefined, options);
  };
  
  // Simplified canCancel function
  const canCancel = (status: string, dateString: string) => {
    if (status === 'cancelled') return false;
    
    const appointmentDate = new Date(dateString);
    const now = new Date();
    
    // Set times to midnight for date comparison
    appointmentDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Can cancel if appointment is today or in the future
    return appointmentDate >= today;
  };
  
  // Render each appointment item
  const renderAppointmentItem = ({ item }: { item: Appointment }) => {
    const isPastAppointment = new Date(item.date) < new Date();
    const isCancellable = canCancel(item.status, item.date);
    const isCancelled = item.status === 'cancelled';
    
    // Get icon for service
    const serviceIcon = serviceIcons[item.service] || serviceIcons.default;
    
    return (
      <View style={[
        styles.appointmentCard,
        isCancelled && styles.cancelledCard
      ]}>
        <View style={[
          styles.appointmentHeader,
          isCancelled && styles.cancelledHeader
        ]}>
          <View style={[
            styles.serviceIconContainer,
            isCancelled && styles.cancelledIconContainer
          ]}>
            <Text style={styles.serviceIconText}>{serviceIcon}</Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={[
              styles.serviceName,
              isCancelled && styles.cancelledText
            ]}>{item.service}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status || 'confirmed'}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <FontAwesome name="calendar" size={16} color={isCancelled ? "#E53E3E" : "#4A5568"} />
              <Text style={[
                styles.detailText,
                isCancelled && styles.cancelledDetailText
              ]}>{formatDate(item.date)}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <FontAwesome name="clock-o" size={16} color={isCancelled ? "#E53E3E" : "#4A5568"} />
              <Text style={[
                styles.detailText,
                isCancelled && styles.cancelledDetailText
              ]}>{item.time}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <FontAwesome name="user" size={16} color={isCancelled ? "#E53E3E" : "#4A5568"} />
              <Text style={[
                styles.detailText,
                isCancelled && styles.cancelledDetailText
              ]}>{item.barber}</Text>
            </View>
            
            {item.servicePrice && (
              <View style={styles.detailItem}>
                <FontAwesome name="dollar" size={16} color={isCancelled ? "#E53E3E" : "#4A5568"} />
                <Text style={[
                  styles.detailText,
                  isCancelled && styles.cancelledDetailText
                ]}>${item.servicePrice}</Text>
              </View>
            )}
          </View>
          
          {item.serviceDuration && (
            <View style={styles.detailItem}>
              <FontAwesome name="scissors" size={16} color={isCancelled ? "#E53E3E" : "#4A5568"} />
              <Text style={[
                styles.detailText,
                isCancelled && styles.cancelledDetailText
              ]}>{item.serviceDuration} min</Text>
            </View>
          )}
        </View>
        
        <View style={styles.actionButtonsContainer}>
          {/* Only show cancel button if not already cancelled */}
          {isCancellable && !isCancelled && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => openCancelConfirmation(item.id)}
            >
              <FontAwesome name="times" size={14} color="#E53E3E" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          
          {/* Show delete button for past or cancelled appointments */}
          {(isPastAppointment || isCancelled) && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => deleteAppointment(item.id)}
            >
              <FontAwesome name="trash" size={14} color="#718096" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
          
          {/* Show upcoming badge for non-cancelled future appointments that are within cancellation window */}
          {!isPastAppointment && !isCancelled && !isCancellable && (
            <View style={styles.upcomingBadge}>
              <FontAwesome name="clock-o" size={14} color="#3182CE" />
              <Text style={styles.upcomingText}>Upcoming</Text>
            </View>
          )}
          
          {/* Show rebook button for past non-cancelled appointments */}
          {isPastAppointment && !isCancelled && (
            <TouchableOpacity
              style={[styles.actionButton, styles.rebookButton]}
              onPress={() => {
                router.push({
                  pathname: '/client/book',
                  params: { serviceId: item.serviceId }
                });
              }}
            >
              <FontAwesome name="repeat" size={14} color="#48BB78" />
              <Text style={styles.rebookButtonText}>Rebook</Text>
            </TouchableOpacity>
          )}
          
          {/* Show cancelled badge for cancelled appointments */}
          {isCancelled && (
            <View style={styles.cancelledBadge}>
              <FontAwesome name="ban" size={14} color="#E53E3E" />
              <Text style={styles.cancelledBadgeText}>Cancelled</Text>
            </View>
          )}
        </View>
        
        {isPastAppointment && !isCancelled && item.status !== 'completed' && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>Past Appointment</Text>
          </View>
        )}
      </View>
    );
  };
  
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
      {/* Custom Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setConfirmModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Cancel Appointment</Text>
                <Text style={styles.modalText}>Are you sure you want to cancel this appointment?</Text>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.modalButtonCancel}
                    onPress={() => setConfirmModalVisible(false)}
                  >
                    <Text style={styles.modalButtonCancelText}>No</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.modalButtonConfirm}
                    onPress={cancelAppointment}
                  >
                    <Text style={styles.modalButtonConfirmText}>Yes, Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Appointments</Text>
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={() => router.push('/client/book')}
        >
          <FontAwesome name="plus" size={14} color="white" />
          <Text style={styles.bookButtonText}>Book New</Text>
        </TouchableOpacity>
      </View>
      
      {!appointments || appointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="calendar-o" size={60} color="#A0AEC0" />
          <Text style={styles.emptyTitle}>No Appointments</Text>
          <Text style={styles.emptyText}>You haven't booked any appointments yet.</Text>
          <TouchableOpacity
            style={styles.bookEmptyButton}
            onPress={() => router.push('/client/book')}
          >
            <Text style={styles.bookEmptyButtonText}>Book an Appointment</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointmentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.appointmentList}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              colors={["#2D3748"]} 
            />
          }
        />
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2D3748',
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  bookButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '500',
  },
  appointmentList: {
    padding: 15,
    paddingBottom: 80,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 15,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cancelledCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    opacity: 0.9,
  },
  appointmentHeader: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F7FAFC',
  },
  cancelledHeader: {
    backgroundColor: '#FEE2E2',
    borderBottomColor: '#FCA5A5',
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cancelledIconContainer: {
    backgroundColor: '#FCA5A5',
  },
  serviceIconText: {
    fontSize: 20,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  serviceName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 5,
  },
  cancelledText: {
    color: '#B91C1C',
    textDecorationLine: 'line-through',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  appointmentDetails: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 10,
    color: '#4A5568',
    fontSize: 15,
  },
  cancelledDetailText: {
    color: '#B91C1C',
    fontStyle: 'italic',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#FED7D7',
  },
  cancelButtonText: {
    marginLeft: 5,
    color: '#E53E3E',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#EDF2F7',
  },
  deleteButtonText: {
    marginLeft: 5,
    color: '#718096',
    fontWeight: '600',
  },
  rebookButton: {
    backgroundColor: '#C6F6D5',
  },
  rebookButtonText: {
    marginLeft: 5,
    color: '#48BB78',
    fontWeight: '600',
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  upcomingText: {
    marginLeft: 5,
    color: '#3182CE',
    fontSize: 14,
    fontWeight: '600',
  },
  completedBadge: {
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
  },
  completedText: {
    color: '#718096',
    fontSize: 13,
  },
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  cancelledBadgeText: {
    marginLeft: 5,
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 30,
  },
  bookEmptyButton: {
    backgroundColor: '#2D3748',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  bookEmptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#EDF2F7',
    paddingVertical: 10,
    borderRadius: 5,
    marginRight: 10,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    color: '#718096',
    fontWeight: '600',
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: '#FED7D7',
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    color: '#E53E3E',
    fontWeight: '600',
  },
});