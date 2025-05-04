import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (email === '' || password === '') {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user data from Firestore to check role
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Redirect based on user role
        if (userData.role === 'admin') {
          router.replace('/admin');
        } else {
          router.replace('/client');
        }
      } else {
        // If user document doesn't exist, create one with client role
        router.replace('/client');
      }
    } catch (error: any) {
      let errorMessage = 'An error occurred during login';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
      Alert.alert('Login Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Barber Shop</Text>
      <Text style={styles.subtitle}>Login to your account</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/auth/signup')}>
          <Text style={styles.linkText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  loginButton: {
    backgroundColor: '#2D3748',
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 16,
    color: '#333',
  },
  linkText: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '600',
  },
});