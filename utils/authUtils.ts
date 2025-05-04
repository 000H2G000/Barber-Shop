import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const logout = async () => {
  try {
    if (typeof window !== 'undefined') {
      await signOut(auth);
      // Clear any stored user data
      await AsyncStorage.removeItem('user');
      // Navigate to the login screen
      router.replace('/auth/login');
    }
  } catch (error) {
    console.error('Error signing out:', error);
  }
};