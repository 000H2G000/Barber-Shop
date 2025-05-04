import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  TextInput
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { db } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { logout } from '../../utils/authUtils';
import { FontAwesome } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    name: '',
    phone: '',
  });

  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setEditedData({
            name: data.name || '',
            phone: data.phone || '',
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load your profile data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setUpdating(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      await updateDoc(userDocRef, {
        name: editedData.name,
        phone: editedData.phone,
      });
      
      setUserData(prev => ({
        ...prev,
        name: editedData.name,
        phone: editedData.phone,
      }));
      
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D3748" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {userData?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{userData?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Information</Text>
        
        {editing ? (
          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={editedData.name}
                onChangeText={(text) => setEditedData(prev => ({ ...prev, name: text }))}
                placeholder="Enter your name"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.staticValue}>{user?.email}</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={editedData.phone}
                onChangeText={(text) => setEditedData(prev => ({ ...prev, phone: text }))}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setEditing(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, updating && styles.disabledButton]}
                disabled={updating}
                onPress={handleUpdateProfile}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{userData?.name || 'Not set'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{userData?.phone || 'Not set'}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(true)}
            >
              <FontAwesome name="edit" size={16} color="#fff" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferences</Text>
        
        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>Notification</Text>
          <Text style={styles.preferenceValue}>Enabled</Text>
        </View>
        
        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>Dark Mode</Text>
          <Text style={styles.preferenceValue}>System Default</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <FontAwesome name="sign-out" size={20} color="#E53E3E" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      
      <Text style={styles.versionText}>Version 1.0.0</Text>
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
    backgroundColor: '#2D3748',
    padding: 30,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#E2E8F0',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 16,
    color: '#718096',
  },
  infoValue: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: '#2D3748',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
  form: {
    marginBottom: 10,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  staticValue: {
    fontSize: 16,
    color: '#A0AEC0',
    padding: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#2D3748',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#CBD5E0',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  cancelButtonText: {
    color: '#718096',
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#A0AEC0',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#718096',
  },
  preferenceValue: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    margin: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F56565',
  },
  logoutText: {
    fontSize: 16,
    color: '#E53E3E',
    fontWeight: '500',
    marginLeft: 10,
  },
  versionText: {
    textAlign: 'center',
    color: '#A0AEC0',
    marginBottom: 30,
  },
});