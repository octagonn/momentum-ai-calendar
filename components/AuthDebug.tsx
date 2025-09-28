import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';

export const AuthDebug: React.FC = () => {
  const { user, session, loading } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auth Debug Info</Text>
      <Text style={styles.text}>Loading: {loading ? 'Yes' : 'No'}</Text>
      <Text style={styles.text}>User: {user ? 'Authenticated' : 'Not authenticated'}</Text>
      <Text style={styles.text}>User ID: {user?.id || 'None'}</Text>
      <Text style={styles.text}>Email: {user?.email || 'None'}</Text>
      <Text style={styles.text}>Session: {session ? 'Active' : 'None'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    marginBottom: 5,
  },
});
