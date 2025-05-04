import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function ClientLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#2D3748',
      tabBarInactiveTintColor: '#A0AEC0',
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: true,
          headerTitle: 'Barber Shop',
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'My Appointments',
          headerShown: true,
          tabBarIcon: ({ color }) => <FontAwesome name="calendar" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: 'Book',
          headerShown: true,
          headerTitle: 'Book Appointment',
          tabBarIcon: ({ color }) => <FontAwesome name="plus-circle" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: true,
          tabBarIcon: ({ color }) => <FontAwesome name="user" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}