import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Modal,
  Animated
} from 'react-native';
import { useLocalSearchParams, router, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  Timestamp,
  doc,
  getDoc 
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { cacheFirebaseData, getFirebaseCache, getCacheKey } from '../../utils/firebaseCache';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type BarberType = {
  id: string;
  name: string;
  specialty?: string;
  image?: string;
};

type ServiceType = {
  id: string;
  name: string;
  price: string;
  icon: string;
  description: string;
};

export default function BookScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [barbers, setBarbers] = useState<BarberType[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<BarberType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [barbersLoaded, setBarbersLoaded] = useState(false);
  const [slotsCache, setSlotsCache] = useState<Record<string, {time: string, available: boolean}[]>>({});
  const [allSlots, setAllSlots] = useState<{time: string, available: boolean}[]>([]);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [checkmarkOpacity] = useState(new Animated.Value(0));
  const [checkmarkScale] = useState(new Animated.Value(0.5));

  const services = useMemo(() => [
    { id: '1', name: 'Haircut', price: '$25', icon: '✂️', description: 'Professional haircut with styling' },
    { id: '2', name: 'Beard Trim', price: '$15', icon: '🧔', description: 'Clean up your beard' },
    { id: '3', name: 'Hair & Beard', price: '$35', icon: '💈', description: 'Complete haircut and beard trim package' },
    { id: '4', name: 'Hair Color', price: '$45+', icon: '🎨', description: 'Professional hair coloring service' },
    { id: '5', name: 'Kids Cut', price: '$20', icon: '👶', description: 'Haircuts for children under 12' },
  ], []);

  const nextDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      // Only add today or future dates
      if (date >= today) {
        days.push(date);
      }
    }
    return days;
  }, []);

  const formatDate = useCallback((date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }, []);

  const formatTimeSlot = useCallback((hour: number, minutes: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${formattedHour}:${formattedMinutes} ${period}`;
  }, []);

  const allTimeSlots = useMemo(() => {
    const slots = [];
    const startHour = 9;
    const endHour = 17;
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minutes = 0; minutes < 60; minutes += 30) {
        const timeString = formatTimeSlot(hour, minutes);
        slots.push({
          time: timeString,
          available: true
        });
      }
    }
    return slots;
  }, [formatTimeSlot]);

  const generateTimeSlots = useCallback(async (barberId: string, date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const cacheKey = `${barberId}_${dateString}`;
    
    // Check cache first
    if (slotsCache[cacheKey]) {
      const cachedResults = slotsCache[cacheKey];
      // Extract just the available times for the old state variable
      setAvailableSlots(cachedResults.filter(slot => slot.available).map(slot => slot.time));
      // Set all slots for UI display
      setAllSlots(cachedResults);
      return cachedResults.filter(slot => slot.available).map(slot => slot.time);
    }
    
    try {
      const appointmentsRef = collection(db, 'appointments');
      const q = query(appointmentsRef, 
        where('barberId', '==', barberId),
        where('date', '==', dateString),
        // Only consider confirmed and pending appointments as booked
        where('status', 'in', ['confirmed', 'pending'])
      );
      
      const querySnapshot = await getDocs(q);
      const bookedSlotTimes = querySnapshot.docs.map(doc => doc.data().time);
      
      // Mark each time slot as available or booked
      const slotsWithAvailability = allTimeSlots.map(slot => ({
        time: slot.time,
        available: !bookedSlotTimes.includes(slot.time)
      }));
      
      // Cache results
      setSlotsCache(prev => ({
        ...prev,
        [cacheKey]: slotsWithAvailability
      }));
      
      // Set state for both all slots and available slots
      setAllSlots(slotsWithAvailability);
      
      // Return only the available slot times for backward compatibility
      const availableSlotTimes = slotsWithAvailability
        .filter(slot => slot.available)
        .map(slot => slot.time);
        
      return availableSlotTimes;
    } catch (error) {
      console.error('Error fetching appointments:', error);
      // On error, just return all slots as available
      setAllSlots(allTimeSlots);
      return allTimeSlots.map(slot => slot.time);
    }
  }, [allTimeSlots, slotsCache]);

  const loadBarbers = useCallback(async () => {
    try {
      const cacheKey = getCacheKey('barbers');
      
      // Try to get barbers from cache first
      const cachedBarbers = await getFirebaseCache<BarberType[]>(cacheKey);
      
      if (cachedBarbers && cachedBarbers.length > 0) {
        setBarbers(cachedBarbers);
        setBarbersLoaded(true);
        return;
      }
      
      // If not in cache, get from Firestore
      const barbersRef = collection(db, 'barbers');
      const snapshot = await getDocs(barbersRef);
      
      if (snapshot.empty) {
        // If no barbers exist, create some dummy data
        const dummyBarbers = [
          { name: 'John Doe', specialty: 'Classic Cuts' },
          { name: 'Mike Smith', specialty: 'Fades & Designs' },
          { name: 'Robert Johnson', specialty: 'Beard Grooming' }
        ];
        
        const createdBarbers = [];
        
        for (const barber of dummyBarbers) {
          const docRef = await addDoc(collection(db, 'barbers'), barber);
          createdBarbers.push({ id: docRef.id, ...barber });
        }
        
        setBarbers(createdBarbers);
        // Cache the barbers for future use
        await cacheFirebaseData(cacheKey, createdBarbers);
      } else {
        const barbersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BarberType[];
        
        setBarbers(barbersData);
        // Cache the barbers for future use
        await cacheFirebaseData(cacheKey, barbersData);
      }
      
      setBarbersLoaded(true);
    } catch (error) {
      console.error('Error loading barbers:', error);
    }
  }, []);

  const animateCheckmark = () => {
    Animated.sequence([
      Animated.timing(checkmarkOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(checkmarkScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCreateBooking = async () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedSlot || !user) {
      Alert.alert('Error', 'Please select all booking details');
      return;
    }

    try {
      setLoading(true);
      const dateString = selectedDate.toISOString().split('T')[0];
      
      // Check if the slot is still available right before booking
      const appointmentsRef = collection(db, 'appointments');
      const checkQuery = query(
        appointmentsRef,
        where('barberId', '==', selectedBarber.id),
        where('date', '==', dateString),
        where('time', '==', selectedSlot),
        where('status', 'in', ['confirmed', 'pending'])
      );
      
      const checkSnapshot = await getDocs(checkQuery);
      
      if (!checkSnapshot.empty) {
        // This slot has been booked by someone else in the meantime
        Alert.alert(
          'Slot no longer available',
          'This time slot has just been reserved by someone else. Please select another time slot.',
          [{ text: 'OK', onPress: () => {
            // Refresh the time slots to show updated availability
            generateTimeSlots(selectedBarber.id, selectedDate);
            setSelectedSlot(null);
          }}]
        );
        setLoading(false);
        return;
      }
      
      // Extract price as a number from the string (e.g. "$25" -> 25)
      const priceValue = parseInt(selectedService.price.replace(/[^0-9]/g, ''));
      
      // Calculate approximate service duration (30 min default)
      const serviceDuration = 30;
      
      // Create the appointment data object
      const appointmentData = {
        userId: user.uid,
        userName: user.displayName || "User",
        userEmail: user.email,
        barberId: selectedBarber.id,
        barber: selectedBarber.name,
        serviceId: selectedService.id,
        service: selectedService.name,
        servicePrice: priceValue,
        serviceDuration: serviceDuration,
        date: dateString,
        time: selectedSlot,
        status: 'confirmed',
        createdAt: Timestamp.now(),
        timestamp: Timestamp.now()
      };
      
      // Add the appointment to Firestore
      const appointmentRef = await addDoc(collection(db, 'appointments'), appointmentData);
      
      // Get the newly created appointment with its ID
      const newAppointment = {
        id: appointmentRef.id,
        ...appointmentData
      };
      
      // Store the appointment in AsyncStorage for immediate access in the appointments screen
      try {
        await AsyncStorage.setItem('new_appointment', JSON.stringify(newAppointment));
        console.log('New appointment saved to AsyncStorage');
      } catch (error) {
        console.error('Failed to save appointment to AsyncStorage:', error);
      }
      
      // Update the local cache to mark this slot as booked
      if (selectedBarber && selectedDate) {
        const cacheKey = `${selectedBarber.id}_${dateString}`;
        setSlotsCache(prev => {
          const currentCache = prev[cacheKey] || [];
          const updatedCache = currentCache.map(slot => 
            slot.time === selectedSlot ? {...slot, available: false} : slot
          );
          return {
            ...prev,
            [cacheKey]: updatedCache
          };
        });
      }
      
      // Reset all selections after successful booking
      const resetSelections = () => {
        setSelectedService(null);
        setSelectedBarber(null);
        setSelectedDate(null);
        setSelectedSlot(null);
        setAvailableSlots([]);
        setAllSlots([]);
      };
      
      // Show success animation
      setBookingSuccess(true);
      animateCheckmark();
      
      // After a delay, navigate to appointments screen with the new appointment data
      setTimeout(() => {
        setBookingSuccess(false);
        resetSelections(); // Reset selections before navigation
        // Navigate to appointments screen and pass the new appointment as a parameter
        router.replace({
          pathname: '/client/appointments',
          params: { 
            refresh: 'true',
            newBooking: JSON.stringify(newAppointment)
          }
        });
      }, 2000);
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadBarbers();
      if (params.serviceId) {
        const service = services.find(s => s.id === params.serviceId);
        if (service) {
          setSelectedService(service);
        }
      }
      setLoading(false);
    };
    init();
  }, [params.serviceId]);

  useEffect(() => {
    const loadSlots = async () => {
      if (selectedBarber && selectedDate) {
        setFetchingSlots(true);
        const slots = await generateTimeSlots(selectedBarber.id, selectedDate);
        setAvailableSlots(slots);
        setSelectedSlot(null);
        setFetchingSlots(false);
      }
    };
    loadSlots();
  }, [selectedBarber, selectedDate]);

  if (loading && !barbers.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D3748" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Step 1: Select Service */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Select Service</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.servicesRow}>
            {services.map(service => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  selectedService?.id === service.id && styles.selectedCard
                ]}
                onPress={() => setSelectedService(service)}
              >
                <Text style={styles.serviceIcon}>{service.icon}</Text>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.servicePrice}>{service.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Step 2: Select Barber */}
      {selectedService && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Select Barber</Text>
          <View style={styles.barbersContainer}>
            {barbers.map(barber => (
              <TouchableOpacity
                key={barber.id}
                style={[
                  styles.barberCard,
                  selectedBarber?.id === barber.id && styles.selectedCard
                ]}
                onPress={() => setSelectedBarber(barber)}
              >
                <View style={styles.barberAvatar}>
                  <Text style={styles.barberAvatarText}>
                    {barber.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.barberInfo}>
                  <Text style={styles.barberName}>{barber.name}</Text>
                  {barber.specialty && (
                    <Text style={styles.barberSpecialty}>{barber.specialty}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Step 3: Select Date */}
      {selectedBarber && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Select Date</Text>
          {nextDays.length === 0 ? (
            <Text style={styles.noSlotsText}>No available dates</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.datesRow}>
                {nextDays.map((date, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateCard,
                      selectedDate && date.toDateString() === selectedDate.toDateString() && styles.selectedCard
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={styles.dateDay}>{date.getDate()}</Text>
                    <Text style={styles.dateMonth}>{date.toLocaleDateString('en-US', { month: 'short' })}</Text>
                    <Text style={styles.dateWeekday}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* Step 4: Select Time */}
      {selectedDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Select Time</Text>
          {fetchingSlots ? (
            <ActivityIndicator size="small" color="#2D3748" />
          ) : allSlots.length > 0 ? (
            <View style={styles.timeSlotContainer}>
              {allSlots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.timeSlot,
                    slot.available ? 
                      (selectedSlot === slot.time && styles.selectedTimeSlot) : 
                      styles.reservedTimeSlot
                  ]}
                  onPress={() => slot.available ? setSelectedSlot(slot.time) : null}
                  disabled={!slot.available}
                >
                  <Text style={[
                    styles.timeSlotText,
                    selectedSlot === slot.time && styles.selectedTimeSlotText,
                    !slot.available && styles.reservedTimeSlotText
                  ]}>
                    {slot.time}
                  </Text>
                  {!slot.available && (
                    <Text style={styles.reservedBadge}>Reserved</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noSlotsText}>No available slots for this date</Text>
          )}
        </View>
      )}

      {/* Booking Summary */}
      {selectedService && selectedBarber && selectedDate && selectedSlot && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service:</Text>
            <Text style={styles.summaryValue}>{selectedService.name} ({selectedService.price})</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Barber:</Text>
            <Text style={styles.summaryValue}>{selectedBarber.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date:</Text>
            <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time:</Text>
            <Text style={styles.summaryValue}>{selectedSlot}</Text>
          </View>
        </View>
      )}

      {/* Confirm Booking Button */}
      {selectedService && selectedBarber && selectedDate && selectedSlot && (
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={handleCreateBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Success modal */}
      <Modal
        transparent={true}
        visible={bookingSuccess}
        animationType="fade"
        onRequestClose={() => setBookingSuccess(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Animated.View style={[
              styles.checkmarkContainer,
              { 
                opacity: checkmarkOpacity,
                transform: [{ scale: checkmarkScale }]
              }
            ]}>
              <FontAwesome name="check-circle" size={80} color="#48BB78" />
            </Animated.View>
            <Text style={styles.successText}>Booking Confirmed!</Text>
            <Text style={styles.successSubtext}>
              Your appointment has been successfully scheduled
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#2D3748',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backButton: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2D3748',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#2D3748',
  },
  servicesRow: {
    flexDirection: 'row',
  },
  serviceCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    padding: 15,
    marginRight: 15,
    width: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedCard: {
    borderColor: '#2D3748',
    backgroundColor: '#EDF2F7',
  },
  serviceIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    textAlign: 'center',
  },
  servicePrice: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '600',
  },
  barbersContainer: {
    marginBottom: 10,
  },
  barberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  barberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2D3748',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  barberAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  barberInfo: {
    flex: 1,
  },
  barberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  barberSpecialty: {
    fontSize: 14,
    color: '#718096',
  },
  datesRow: {
    flexDirection: 'row',
  },
  dateCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    padding: 15,
    marginRight: 15,
    width: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '600',
  },
  dateMonth: {
    fontSize: 14,
  },
  dateWeekday: {
    fontSize: 14,
    color: '#718096',
    marginTop: 5,
  },
  timeSlotContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeSlot: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 90,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#2D3748',
    borderColor: '#2D3748',
  },
  reservedTimeSlot: {
    backgroundColor: '#E2E8F0',
    borderColor: '#A0AEC0',
    opacity: 0.8,
  },
  timeSlotText: {
    fontSize: 14,
  },
  selectedTimeSlotText: {
    color: '#FFFFFF',
  },
  reservedTimeSlotText: {
    color: '#A0AEC0',
    textDecorationLine: 'line-through',
  },
  reservedBadge: {
    fontSize: 10,
    color: '#E53E3E',
    fontWeight: '500',
    marginTop: 3,
  },
  noSlotsText: {
    fontSize: 16,
    color: '#718096',
    fontStyle: 'italic',
  },
  summaryContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#718096',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#2D3748',
    margin: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  successModal: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  checkmarkContainer: {
    marginBottom: 20,
  },
  successText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 10,
  },
  successSubtext: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
});