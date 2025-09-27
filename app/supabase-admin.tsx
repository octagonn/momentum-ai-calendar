import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useSupabase } from '@/providers/SupabaseProvider';
import { testConnection, upsert, fromTable } from '@/lib/supabase';

export default function SupabaseAdmin() {
  const router = useRouter();
  const { url, anonKey, isReady, setKeys } = useSupabase();
  const [newUrl, setNewUrl] = useState<string>(url || '');
  const [newAnonKey, setNewAnonKey] = useState<string>(anonKey || '');
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tables, setTables] = useState<string[]>([]);

  const fetchTables = useCallback(async () => {
    try {
      // This is a simplified approach - in a real app you might want to query pg_catalog
      // Here we're just checking for our known tables
      const knownTables = ['tasks', 'goals', 'users', 'profiles'];
      const existingTables: string[] = [];
      
      for (const table of knownTables) {
        try {
          await fromTable(table, 'count(*)');
          existingTables.push(table);
        } catch (error) {
          // Table doesn't exist or can't be accessed
          console.log(`Table ${table} not found or inaccessible`);
        }
      }
      
      setTables(existingTables);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    if (!isReady) {
      setConnectionStatus({ connected: false, message: 'Supabase not configured' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await testConnection();
      setConnectionStatus(result);
      if (result.connected) {
        fetchTables();
      }
    } catch (error) {
      setConnectionStatus({
        connected: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isReady, fetchTables]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const saveConnection = async () => {
    if (!newUrl || !newAnonKey) {
      Alert.alert('Error', 'Both URL and Anon Key are required');
      return;
    }

    setKeys(newUrl, newAnonKey);
    await checkConnection();
  };

  const resetDatabase = async () => {
    Alert.alert(
      'Reset Database',
      'This will create or reset the necessary tables in your Supabase database. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: performReset },
      ]
    );
  };

  const performReset = async () => {
    if (!connectionStatus?.connected) {
      Alert.alert('Error', 'Not connected to Supabase');
      return;
    }

    setIsLoading(true);
    try {
      // Create or reset tasks table
      await createTasksTable();
      
      // Create or reset goals table
      await createGoalsTable();
      
      // Seed with default data
      await seedDefaultData();
      
      Alert.alert('Success', 'Database tables have been created and seeded with default data');
      fetchTables();
    } catch (error) {
      Alert.alert('Error', `Failed to reset database: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createTasksTable = async () => {
    // In a real app, you would use Supabase migrations or SQL queries
    // For this demo, we'll just try to insert data and let Supabase handle it
    // This assumes your Supabase instance has RLS policies set up correctly
    console.log('Creating tasks table...');
    
    // We're using upsert which will create entries if they don't exist
    // This is a simplified approach for demo purposes
    const defaultTasks: Record<string, unknown>[] = [
      {
        id: "1",
        title: "Morning workout - Upper body",
        time: "7:00 AM - 8:00 AM",
        priority: "high",
        completed: true,
      },
      {
        id: "2",
        title: "Project review meeting",
        time: "10:00 AM - 11:00 AM",
        priority: "medium",
        completed: false,
      },
    ];
    
    await upsert('tasks', defaultTasks);
  };

  const createGoalsTable = async () => {
    console.log('Creating goals table...');
    
    const defaultGoals: Record<string, unknown>[] = [
      {
        id: "1",
        title: "Bench Press 225 lbs",
        description: "185 lbs / 225 lbs",
        current: 185,
        target: 225,
        unit: "lbs",
        status: "active",
        progress: 75,
      },
      {
        id: "2",
        title: "Read 24 Books This Year",
        description: "14 books / 24 books",
        current: 14,
        target: 24,
        unit: "books",
        status: "active",
        progress: 58,
      },
    ];
    
    await upsert('goals', defaultGoals);
  };

  const seedDefaultData = async () => {
    console.log('Seeding default data...');
    
    const defaultTasks: Record<string, unknown>[] = [
      {
        id: "3",
        title: 'Read 20 pages of "Atomic Habits"',
        time: "2:00 PM - 2:30 PM",
        priority: "low",
        completed: false,
      },
      {
        id: "4",
        title: "Weekly meal prep",
        time: "6:00 PM - 7:30 PM",
        priority: "medium",
        completed: true,
      },
      {
        id: "5",
        title: "Evening meditation",
        time: "9:00 PM - 9:15 PM",
        priority: "low",
        completed: true,
      },
    ];
    
    const defaultGoals: Record<string, unknown>[] = [
      {
        id: "3",
        title: "Learn Spanish",
        description: "90 days / 300 days",
        current: 90,
        target: 300,
        unit: "days",
        status: "paused",
        progress: 30,
      },
      {
        id: "4",
        title: "Run First Marathon",
        description: "26.2 miles completed!",
        current: 26.2,
        target: 26.2,
        unit: "miles",
        status: "completed",
        progress: 100,
      },
    ];
    
    await upsert('tasks', defaultTasks);
    await upsert('goals', defaultGoals);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Supabase Admin',
        headerShown: true,
      }} />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Settings</Text>
          
          <Text style={styles.label}>Supabase URL</Text>
          <TextInput
            style={styles.input}
            value={newUrl}
            onChangeText={setNewUrl}
            placeholder="https://your-project.supabase.co"
            autoCapitalize="none"
          />
          
          <Text style={styles.label}>Anon Key</Text>
          <TextInput
            style={styles.input}
            value={newAnonKey}
            onChangeText={setNewAnonKey}
            placeholder="your-anon-key"
            autoCapitalize="none"
          />
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={saveConnection}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Save Connection</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          
          {isLoading ? (
            <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />
          ) : connectionStatus ? (
            <View style={styles.statusContainer}>
              <View style={[styles.statusIndicator, { backgroundColor: connectionStatus.connected ? '#22c55e' : '#ef4444' }]} />
              <Text style={styles.statusText}>{connectionStatus.message}</Text>
            </View>
          ) : null}
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={checkConnection}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Connection</Text>
          </TouchableOpacity>
        </View>
        
        {connectionStatus?.connected && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Database Management</Text>
            
            <View style={styles.tableList}>
              <Text style={styles.label}>Detected Tables:</Text>
              {tables.length > 0 ? (
                tables.map(table => (
                  <Text key={table} style={styles.tableItem}>• {table}</Text>
                ))
              ) : (
                <Text style={styles.noTablesText}>No tables detected</Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={[styles.button, styles.dangerButton]} 
              onPress={resetDatabase}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Reset Database</Text>
            </TouchableOpacity>
            
            <Text style={styles.warningText}>
              Warning: This will create or reset the necessary tables in your Supabase database.
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={() => router.back()}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Back to App</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  label: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 8,
    fontFamily: 'Inter_500Medium',
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
    fontFamily: 'Inter_400Regular',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  secondaryButton: {
    backgroundColor: '#4b5563',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    color: '#ffffff',
    flex: 1,
    fontFamily: 'Inter_400Regular',
  },
  loader: {
    marginVertical: 20,
  },
  tableList: {
    marginBottom: 16,
  },
  tableItem: {
    color: '#a1a1aa',
    marginLeft: 8,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  noTablesText: {
    color: '#71717a',
    fontStyle: 'italic',
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
  },
});