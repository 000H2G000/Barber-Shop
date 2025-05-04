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
  Image,
  ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { db } from '../../firebaseConfig';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';

export default function BarbersScreen() {
  const { user } = useAuth();
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    bio: '',
    phone: '',
    email: '',
    image: '👨🏻‍💼' // Default emoji as image placeholder
  });

  // Fetch barbers from Firestore
  const fetchBarbers = async () => {
    setLoading(true);
    try {
      const barbersQuery = query(collection(db, 'barbers'));
      const querySnapshot = await getDocs(barbersQuery);
      
      const barbersList: any[] = [];
      querySnapshot.forEach((doc) => {
        barbersList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setBarbers(barbersList);
    } catch (error) {
      console.error('Error fetching barbers:', error);
      Alert.alert('Error', 'Failed to load barbers');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchBarbers();
  }, []);
  
  // Handle adding a new barber
  const handleAddBarber = async () => {
    if (!formData.name || !formData.specialty) {
      Alert.alert('Error', 'Please fill out required fields');
      return;
    }
    
    setProcessing(true);
    try {
      // Add a new barber document
      const barberRef = await addDoc(collection(db, 'barbers'), {
        name: formData.name,
        specialty: formData.specialty,
        bio: formData.bio || '',
        phone: formData.phone || '',
        email: formData.email || '',
        image: formData.image || '👨🏻‍💼',
        createdAt: new Date().toISOString(),
        availability: {
          monday: { available: true, hours: '9:00 AM - 5:00 PM' },
          tuesday: { available: true, hours: '9:00 AM - 5:00 PM' },
          wednesday: { available: true, hours: '9:00 AM - 5:00 PM' },
          thursday: { available: true, hours: '9:00 AM - 5:00 PM' },
          friday: { available: true, hours: '9:00 AM - 5:00 PM' },
          saturday: { available: true, hours: '9:00 AM - 3:00 PM' },
          sunday: { available: false, hours: '' }
        }
      });
      
      // Add the new barber to the local state
      const newBarber = {
        id: barberRef.id,
        name: formData.name,
        specialty: formData.specialty,
        bio: formData.bio || '',
        phone: formData.phone || '',
        email: formData.email || '',
        image: formData.image || '👨🏻‍💼',
        createdAt: new Date().toISOString()
      };
      
      setBarbers([...barbers, newBarber]);
      resetFormAndCloseModal();
      Alert.alert('Success', 'Barber added successfully');
    } catch (error) {
      console.error('Error adding barber:', error);
      Alert.alert('Error', 'Failed to add barber');
    } finally {
      setProcessing(false);
    }
  };
  
  // Handle updating an existing barber
  const handleUpdateBarber = async () => {
    if (!selectedBarber || !formData.name || !formData.specialty) {
      Alert.alert('Error', 'Please fill out required fields');
      return;
    }
    
    setProcessing(true);
    try {
      // Update the barber document
      await updateDoc(doc(db, 'barbers', selectedBarber.id), {
        name: formData.name,
        specialty: formData.specialty,
        bio: formData.bio || '',
        phone: formData.phone || '',
        email: formData.email || '',
        image: formData.image || '👨🏻‍💼',
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setBarbers(prevBarbers =>
        prevBarbers.map(barber =>
          barber.id === selectedBarber.id
            ? {
                ...barber,
                name: formData.name,
                specialty: formData.specialty,
                bio: formData.bio || '',
                phone: formData.phone || '',
                email: formData.email || '',
                image: formData.image || '👨🏻‍💼',
                updatedAt: new Date().toISOString()
              }
            : barber
        )
      );
      
      resetFormAndCloseModal();
      Alert.alert('Success', 'Barber updated successfully');
    } catch (error) {
      console.error('Error updating barber:', error);
      Alert.alert('Error', 'Failed to update barber');
    } finally {
      setProcessing(false);
    }
  };
  
  // Handle deleting a barber
  const handleDeleteBarber = async (barberId: string) => {
    Alert.alert(
      'Delete Barber',
      'Are you sure you want to delete this barber? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              // Delete the barber document
              await deleteDoc(doc(db, 'barbers', barberId));
              
              // Update local state
              setBarbers(prevBarbers =>
                prevBarbers.filter(barber => barber.id !== barberId)
              );
              
              resetFormAndCloseModal();
              Alert.alert('Success', 'Barber deleted successfully');
            } catch (error) {
              console.error('Error deleting barber:', error);
              Alert.alert('Error', 'Failed to delete barber');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };
  
  const resetFormAndCloseModal = () => {
    setModalVisible(false);
    setSelectedBarber(null);
    setIsEditing(false);
    setFormData({
      name: '',
      specialty: '',
      bio: '',
      phone: '',
      email: '',
      image: '👨🏻‍💼'
    });
  };
  
  const openAddBarberModal = () => {
    resetFormAndCloseModal();
    setModalVisible(true);
  };
  
  const openEditBarberModal = (barber: any) => {
    setSelectedBarber(barber);
    setFormData({
      name: barber.name || '',
      specialty: barber.specialty || '',
      bio: barber.bio || '',
      phone: barber.phone || '',
      email: barber.email || '',
      image: barber.image || '👨🏻‍💼'
    });
    setIsEditing(true);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D3748" />
        <Text style={styles.loadingText}>Loading barbers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Barbers</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={openAddBarberModal}
        >
          <FontAwesome name="plus" size={16} color="#fff" />
          <Text style={styles.addButtonText}>Add Barber</Text>
        </TouchableOpacity>
      </View>
      
      {barbers.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="users" size={60} color="#A0AEC0" />
          <Text style={styles.emptyText}>No barbers found</Text>
          <Text style={styles.emptySubtext}>Add barbers to your team</Text>
          <TouchableOpacity 
            style={styles.emptyAddButton}
            onPress={openAddBarberModal}
          >
            <Text style={styles.emptyAddButtonText}>Add Your First Barber</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={barbers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.barbersList}
          renderItem={({ item }) => (
            <View style={styles.barberCard}>
              <View style={styles.barberHeader}>
                <Text style={styles.barberImage}>{item.image}</Text>
                <View style={styles.barberInfo}>
                  <Text style={styles.barberName}>{item.name}</Text>
                  <Text style={styles.barberSpecialty}>{item.specialty}</Text>
                </View>
              </View>
              
              {item.bio && (
                <Text style={styles.barberBio}>{item.bio}</Text>
              )}
              
              <View style={styles.barberContact}>
                {item.phone && (
                  <View style={styles.contactItem}>
                    <FontAwesome name="phone" size={14} color="#718096" />
                    <Text style={styles.contactText}>{item.phone}</Text>
                  </View>
                )}
                
                {item.email && (
                  <View style={styles.contactItem}>
                    <FontAwesome name="envelope" size={14} color="#718096" />
                    <Text style={styles.contactText}>{item.email}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.barberActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditBarberModal(item)}
                >
                  <FontAwesome name="edit" size={14} color="#4A5568" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteBarber(item.id)}
                >
                  <FontAwesome name="trash" size={14} color="#E53E3E" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
      
      {/* Add/Edit Barber Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={resetFormAndCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Barber' : 'Add New Barber'}
              </Text>
              <TouchableOpacity
                onPress={resetFormAndCloseModal}
                style={styles.closeButton}
              >
                <FontAwesome name="times" size={20} color="#718096" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Enter barber name"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Specialty *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.specialty}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, specialty: text }))}
                  placeholder="E.g., Classic Cuts, Hair Coloring"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Profile Icon</Text>
                <View style={styles.emojiSelector}>
                  {['👨🏻‍💼', '👩🏼‍💼', '👨🏽‍💼', '👩🏾‍💼', '👨🏿‍💼'].map(emoji => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiOption,
                        formData.image === emoji && styles.selectedEmoji
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, image: emoji }))}
                    >
                      <Text style={styles.emoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.bio}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
                  placeholder="Short bio about the barber"
                  multiline
                  numberOfLines={4}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={resetFormAndCloseModal}
                  disabled={processing}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.saveButton, processing && styles.disabledButton]}
                  onPress={isEditing ? handleUpdateBarber : handleAddBarber}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {isEditing ? 'Update' : 'Add Barber'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#2D3748',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A5568',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#718096',
    marginTop: 5,
    marginBottom: 20,
  },
  emptyAddButton: {
    backgroundColor: '#2D3748',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  barbersList: {
    padding: 15,
    paddingBottom: 30,
  },
  barberCard: {
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
  barberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  barberImage: {
    fontSize: 40,
    marginRight: 15,
  },
  barberInfo: {
    flex: 1,
  },
  barberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  barberSpecialty: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  barberBio: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  barberContact: {
    marginBottom: 15,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  contactText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4A5568',
  },
  barberActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  editButtonText: {
    marginLeft: 5,
    color: '#4A5568',
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButtonText: {
    marginLeft: 5,
    color: '#E53E3E',
    fontWeight: '500',
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
  formContainer: {
    maxHeight: '80%',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  emojiSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  emojiOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
  },
  selectedEmoji: {
    borderWidth: 2,
    borderColor: '#2D3748',
  },
  emoji: {
    fontSize: 30,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#2D3748',
  },
  disabledButton: {
    backgroundColor: '#A0AEC0',
  },
  cancelButtonText: {
    color: '#4A5568',
    fontWeight: '500',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});