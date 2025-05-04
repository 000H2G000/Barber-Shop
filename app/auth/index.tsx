import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function AuthLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="signup" options={{ title: 'Sign Up' }} />
      </Stack>
    </View>
  );
}