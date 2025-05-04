import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';

type UserRole = 'admin' | 'customer';

type AuthContextType = {
  user: User | null;
  userRole: UserRole | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userRole: null, 
  isLoading: true 
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user role from Firestore
  const fetchUserRole = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole(userData.role as UserRole);
        await AsyncStorage.setItem('userRole', userData.role);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  useEffect(() => {
    let unsubscribe: () => void;
    
    // Check if we're in a browser environment before using onAuthStateChanged
    if (typeof window !== 'undefined') {
      try {
        // Listen for authentication state changes
        unsubscribe = onAuthStateChanged(auth, async (authUser) => {
          setUser(authUser);
          
          // Store the authentication state
          try {
            if (authUser) {
              await AsyncStorage.setItem('user', JSON.stringify(authUser));
              fetchUserRole(authUser.uid);
            } else {
              await AsyncStorage.removeItem('user');
              await AsyncStorage.removeItem('userRole');
              setUserRole(null);
            }
          } catch (storageError) {
            console.error('Failed to update user in storage:', storageError);
          }
          
          setIsLoading(false);
        });

        // Check if user exists in AsyncStorage
        const bootstrapAsync = async () => {
          try {
            const userJSON = await AsyncStorage.getItem('user');
            const storedRole = await AsyncStorage.getItem('userRole');
            
            if (userJSON) {
              const userData = JSON.parse(userJSON);
              setUser(userData);
              if (storedRole) {
                setUserRole(storedRole as UserRole);
              } else if (userData.uid) {
                fetchUserRole(userData.uid);
              }
            }
          } catch (e) {
            console.error('Failed to load user from storage:', e);
          } finally {
            setIsLoading(false);
          }
        };

        bootstrapAsync();
      } catch (error) {
        console.error('Auth error:', error);
        setIsLoading(false);
      }
    } else {
      // If we're not in a browser environment, just set loading to false
      setIsLoading(false);
    }

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRole, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}