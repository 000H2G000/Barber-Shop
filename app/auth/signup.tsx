import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Alert, ActivityIndicator, Switch } from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { router } from 'expo-router';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (name === '' || email === '' || password === '' || confirmPassword === '') {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // Check admin code if user is trying to register as admin
    if (isAdmin && adminCode !== 'barber123') {
      Alert.alert('Error', 'Invalid admin code');
      return;
    }

    setLoading(true);
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with name
      await updateProfile(user, { displayName: name });

      const role = isAdmin ? 'admin' : 'client';
      
      // Store additional user data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        createdAt: new Date().toISOString(),
        role,
      });

      // On successful signup, navigate to the appropriate home screen based on role
      if (isAdmin) {
        router.replace('/admin');
      } else {
        router.replace('/client');
      }
    } catch (error: any) {
      let errorMessage = 'An error occurred during sign up';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email address is already in use';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }
      Alert.alert('Sign Up Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Barber Shop</Text>
      <Text style={styles.subtitle}>Create your account</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
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
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Register as Admin</Text>
          <Switch
            value={isAdmin}
            onValueChange={setIsAdmin}
            trackColor={{ false: '#DDD', true: '#2D3748' }}
            thumbColor={'#fff'}
          />
        </View>
        
        {isAdmin && (
          <TextInput
            style={styles.input}
            placeholder="Admin Code"
            value={adminCode}
            onChangeText={setAdminCode}
            secureTextEntry
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.signUpButton}
        onPress={handleSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/auth/login')}>
          <Text style={styles.linkText}>Login</Text>
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
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  signUpButton: {
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