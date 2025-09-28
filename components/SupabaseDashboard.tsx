import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Database, Users, Target, CheckSquare, Activity, Settings, Download, Trash2 } from 'lucide-react-native';
import { supabaseManager, DatabaseStats, UserManagement } from '@/lib/supabase-manager';

interface SupabaseDashboardProps {
  onClose: () => void;
}

export const SupabaseDashboard: React.FC<SupabaseDashboardProps> = ({ onClose }) => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [users, setUsers] = useState<UserManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, usersData, healthData] = await Promise.all([
        supabaseManager.getDatabaseStats(),
        supabaseManager.getAllUsers(),
        supabaseManager.healthCheck()
      ]);
      
      setStats(statsData);
      setUsers(usersData);
      setHealthStatus(healthData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCleanup = async () => {
    Alert.alert(
      'Cleanup Old Data',
      'This will delete completed tasks older than 30 days. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cleanup',
          style: 'destructive',
          onPress: async () => {
            const result = await supabaseManager.cleanupOldData();
            Alert.alert(
              result.success ? 'Success' : 'Error',
              result.message
            );
            loadData();
          }
        }
      ]
    );
  };

  const handleExport = async () => {
    const data = await supabaseManager.exportData();
    if (data) {
      Alert.alert(
        'Export Complete',
        `Exported ${data.totalRecords} records successfully. Check console for data.`
      );
      console.log('Exported data:', data);
    } else {
      Alert.alert('Export Failed', 'Failed to export data');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading Supabase Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Database size={24} color="white" />
          <Text style={styles.headerTitle}>Supabase Dashboard</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Health Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Health</Text>
          <View style={[
            styles.healthCard,
            { backgroundColor: healthStatus?.status === 'healthy' ? '#d4edda' : '#f8d7da' }
          ]}>
            <Activity size={20} color={healthStatus?.status === 'healthy' ? '#155724' : '#721c24'} />
            <View style={styles.healthInfo}>
              <Text style={[
                styles.healthStatus,
                { color: healthStatus?.status === 'healthy' ? '#155724' : '#721c24' }
              ]}>
                {healthStatus?.status === 'healthy' ? 'Healthy' : 'Error'}
              </Text>
              <Text style={styles.healthMessage}>{healthStatus?.message}</Text>
            </View>
          </View>
        </View>

        {/* Database Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Database Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Users size={24} color="#667eea" />
              <Text style={styles.statNumber}>{stats?.totalUsers || 0}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statCard}>
              <Target size={24} color="#667eea" />
              <Text style={styles.statNumber}>{stats?.totalGoals || 0}</Text>
              <Text style={styles.statLabel}>Goals</Text>
            </View>
            <View style={styles.statCard}>
              <CheckSquare size={24} color="#667eea" />
              <Text style={styles.statNumber}>{stats?.totalTasks || 0}</Text>
              <Text style={styles.statLabel}>Tasks</Text>
            </View>
          </View>
        </View>

        {/* User Management */}
        {users && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Management</Text>
            <View style={styles.userStats}>
              <View style={styles.userStat}>
                <Text style={styles.userStatNumber}>{users.totalUsers}</Text>
                <Text style={styles.userStatLabel}>Total Users</Text>
              </View>
              <View style={styles.userStat}>
                <Text style={styles.userStatNumber}>{users.activeUsers}</Text>
                <Text style={styles.userStatLabel}>Active Users</Text>
              </View>
            </View>
          </View>
        )}

        {/* Management Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Management Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCleanup}>
              <Trash2 size={20} color="#e74c3c" />
              <Text style={styles.actionButtonText}>Cleanup Old Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleExport}>
              <Download size={20} color="#27ae60" />
              <Text style={styles.actionButtonText}>Export Data</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Connection Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Info</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Supabase URL:</Text>
            <Text style={styles.infoValue}>
              {process.env.EXPO_PUBLIC_SUPABASE_URL ? 'Connected' : 'Not configured'}
            </Text>
            <Text style={styles.infoLabel}>API Key:</Text>
            <Text style={styles.infoValue}>
              {process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'Configured' : 'Not configured'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    marginLeft: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  healthInfo: {
    marginLeft: 12,
    flex: 1,
  },
  healthStatus: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  healthMessage: {
    fontSize: 14,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userStat: {
    alignItems: 'center',
  },
  userStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#667eea',
  },
  userStatLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
