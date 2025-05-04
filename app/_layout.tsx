import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from './context/AuthContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, userRole, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    
    if (!user && !inAuthGroup) {
      // Redirect to the login page if not logged in
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      // Redirect based on user role
      if (userRole === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/client');
      }
    }
    
    SplashScreen.hideAsync();
  }, [user, userRole, segments, isLoading]);

  if (isLoading) {
    return null; // Still showing splash screen
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="client" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
