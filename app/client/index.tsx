import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { logout } from '../../utils/authUtils';
import { router } from 'expo-router';

export default function ClientHomeScreen() {
  const { user } = useAuth();

  const services = [
    { id: '1', name: 'Haircut', price: '$25', icon: '✂️', description: 'Professional haircut with styling' },
    { id: '2', name: 'Beard Trim', price: '$15', icon: '🧔', description: 'Clean up your beard' },
    { id: '3', name: 'Hair & Beard', price: '$35', icon: '💈', description: 'Complete haircut and beard trim package' },
    { id: '4', name: 'Hair Color', price: '$45+', icon: '🎨', description: 'Professional hair coloring service' },
    { id: '5', name: 'Kids Cut', price: '$20', icon: '👶', description: 'Haircuts for children under 12' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user?.displayName || 'Client'}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.heroContainer}>
        <Text style={styles.heroTitle}>Professional Barber Services</Text>
        <Text style={styles.heroSubtitle}>Book your next appointment with us!</Text>
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={() => router.push('/client/book')}
        >
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Our Services</Text>
      
      <View style={styles.servicesContainer}>
        {services.map(service => (
          <TouchableOpacity 
            key={service.id} 
            style={styles.serviceCard}
            onPress={() => router.push({
              pathname: '/client/book',
              params: { serviceId: service.id }
            })}
          >
            <Text style={styles.serviceIcon}>{service.icon}</Text>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.servicePrice}>{service.price}</Text>
            <Text style={styles.serviceDescription}>{service.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.viewAppointmentsButton}
        onPress={() => router.push('/client/appointments')}
      >
        <Text style={styles.viewAppointmentsText}>View My Appointments</Text>
      </TouchableOpacity>
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
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  heroContainer: {
    padding: 20,
    backgroundColor: '#2D3748',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#E2E8F0',
    marginBottom: 20,
  },
  bookButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bookButtonText: {
    color: '#2D3748',
    fontWeight: '600',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  servicesContainer: {
    paddingHorizontal: 20,
  },
  serviceCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  servicePrice: {
    fontSize: 16,
    color: '#4A5568',
    fontWeight: '600',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#718096',
  },
  viewAppointmentsButton: {
    marginVertical: 20,
    marginHorizontal: 20,
    backgroundColor: '#2D3748',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAppointmentsText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});