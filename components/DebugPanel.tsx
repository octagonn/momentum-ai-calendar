import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSubscription } from '../providers/SubscriptionProvider';
import { useTheme } from '../providers/ThemeProvider';
import { Trash2, Crown, RotateCcw } from 'lucide-react-native';

/**
 * DebugPanel - For testing subscription functionality
 * Only shows in development mode
 * 
 * Usage: Add <DebugPanel /> to any screen for testing controls
 */
export default function DebugPanel() {
  const { isPremium, resetPremiumStatus } = useSubscription();
  const { colors } = useTheme();

  // Only show in development
  if (!__DEV__) {
    return null;
  }

  const handleResetPremium = () => {
    Alert.alert(
      'Reset Premium Status',
      'This will reset your premium status to free tier. Use this for testing the upgrade flow.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetPremiumStatus();
            Alert.alert('Reset Complete', 'Premium status reset to free tier.');
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>🛠️ Debug Panel</Text>
      <View style={styles.statusRow}>
        <Crown size={16} color={isPremium ? colors.success : colors.textSecondary} />
        <Text style={[styles.statusText, { color: colors.text }]}>
          Status: {isPremium ? 'Premium' : 'Free'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.danger }]}
        onPress={handleResetPremium}
      >
        <RotateCcw size={16} color="white" />
        <Text style={styles.buttonText}>Reset Premium Status</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});
