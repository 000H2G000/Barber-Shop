import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function AdminLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#2D3748',
      tabBarInactiveTintColor: '#A0AEC0',
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerShown: true,
          headerTitle: 'Admin Dashboard',
          tabBarIcon: ({ color }) => <FontAwesome name="dashboard" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          headerShown: true,
          tabBarIcon: ({ color }) => <FontAwesome name="calendar" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="barbers"
        options={{
          title: 'Barbers',
          headerShown: true,
          tabBarIcon: ({ color }) => <FontAwesome name="users" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          headerShown: true,
          tabBarIcon: ({ color }) => <FontAwesome name="cog" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}