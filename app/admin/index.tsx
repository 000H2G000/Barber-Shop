import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { db } from '../../firebaseConfig';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';

// Summary card component
const SummaryCard = ({ title, value, icon, color }: { 
  title: string, 
  value: string | number, 
  icon: string, 
  color: string 
}) => {
  return (
    <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.cardContent}>
        <View>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardValue}>{value}</Text>
        </View>
        <View style={[styles.iconContainer, { backgroundColor: color }]}>
          <FontAwesome name={icon} size={20} color="#fff" />
        </View>
      </View>
    </View>
  );
};

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingAppointments: 0,
    totalCustomers: 0,
    totalRevenue: 0,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get all appointments
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        orderBy('timestamp', 'asc')
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointments = appointmentsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      // Count today's appointments
      const todayAppointments = appointments.filter(appt => {
        const apptDate = new Date(appt.timestamp);
        const apptDateMidnight = new Date(apptDate);
        apptDateMidnight.setHours(0, 0, 0, 0);
        return apptDateMidnight.getTime() === today.getTime();
      }).length;
      
      // Count pending appointments
      const pendingAppointments = appointments.filter(appt => 
        appt.status === 'pending'
      ).length;
      
      // Calculate total revenue (only from completed appointments)
      const totalRevenue = appointments
        .filter(appt => appt.status === 'completed')
        .reduce((sum, appt) => sum + (appt.servicePrice || 0), 0);
      
      // Get all customers (unique user IDs from appointments)
      const customerIds = new Set(appointments.map(appt => appt.userId));
      
      // Get upcoming appointments (next 5)
      const now = new Date();
      const upcoming = appointments
        .filter(appt => new Date(appt.timestamp) > now && appt.status !== 'cancelled')
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(0, 5);
      
      setStats({
        todayAppointments,
        pendingAppointments,
        totalCustomers: customerIds.size,
        totalRevenue,
      });
      
      setUpcomingAppointments(upcoming);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchDashboardData();
  }, [user]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D3748" />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Welcome Back</Text>
        <Text style={styles.headerSubtitle}>
          Here's what's happening in your shop today.
        </Text>
      </View>
      
      <View style={styles.statsContainer}>
        <SummaryCard
          title="Today's Appointments"
          value={stats.todayAppointments}
          icon="calendar"
          color="#4299E1"
        />
        
        <SummaryCard
          title="Pending Approvals"
          value={stats.pendingAppointments}
          icon="clock-o"
          color="#ED8936"
        />
        
        <SummaryCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon="users"
          color="#48BB78"
        />
        
        <SummaryCard
          title="Total Revenue"
          value={`$${stats.totalRevenue}`}
          icon="dollar"
          color="#9F7AEA"
        />
      </View>
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        <TouchableOpacity onPress={() => router.push('/admin/appointments')}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      
      {upcomingAppointments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No upcoming appointments</Text>
        </View>
      ) : (
        upcomingAppointments.map((appointment) => (
          <TouchableOpacity
            key={appointment.id}
            style={styles.appointmentCard}
            onPress={() => router.push({
              pathname: '/admin/appointments',
              params: { id: appointment.id }
            })}
          >
            <View style={styles.appointmentCardHeader}>
              <Text style={styles.appointmentService}>{appointment.service}</Text>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: appointment.status === 'confirmed' ? '#48BB78' : '#ED8936' }
              ]}>
                <Text style={styles.statusText}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </Text>
              </View>
            </View>
            
            <View style={styles.appointmentDetails}>
              <View style={styles.detailItem}>
                <FontAwesome name="user" size={14} color="#718096" />
                <Text style={styles.detailText}>{appointment.userName}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <FontAwesome name="calendar" size={14} color="#718096" />
                <Text style={styles.detailText}>{appointment.date}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <FontAwesome name="clock-o" size={14} color="#718096" />
                <Text style={styles.detailText}>{appointment.time}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <FontAwesome name="user-md" size={14} color="#718096" />
                <Text style={styles.detailText}>{appointment.barber}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>
      
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/admin/appointments')}
        >
          <FontAwesome name="list" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Manage Appointments</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/admin/barbers')}
        >
          <FontAwesome name="users" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Manage Barbers</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#718096',
    marginTop: 5,
  },
  statsContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4A5568',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#718096',
  },
  appointmentCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  appointmentService: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  appointmentDetails: {
    marginBottom: 5,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4A5568',
  },
  actionButtonsContainer: {
    padding: 20,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  },
});