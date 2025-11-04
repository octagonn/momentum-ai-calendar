import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { X, Sparkles, Target, Lock } from 'lucide-react-native';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useUser } from '../../providers/UserProvider';
import { useSubscription } from '../../providers/SubscriptionProvider';
import { shadowSm, insetTopLight, insetBottomDark } from '@/ui/depth';

interface GoalCreationChoiceModalProps {
  visible: boolean;
  onClose: () => void;
  onChooseAI: () => void;
  onChooseManual: () => void;
}

export default function GoalCreationChoiceModal({ 
  visible, 
  onClose, 
  onChooseAI, 
  onChooseManual 
}: GoalCreationChoiceModalProps) {
  const { colors, isDark } = useTheme();
  const { user: userProfile } = useUser();
  const { isPremium: subscriptionPremium, showUpgradeModal } = useSubscription();
  const insets = useSafeAreaInsets();
  
  // Use both sources of premium status for maximum compatibility
  const isPremium = userProfile?.isPremium || subscriptionPremium || false;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 0 }]}>
            <View style={styles.headerContent}>
              <Target size={24} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Create Goal
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Choose how you'd like to create your goal:
            </Text>

            {/* AI Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                { backgroundColor: colors.card, opacity: isPremium ? 1 : 0.8 },
                shadowSm(isDark),
              ]}
              onPress={() => {
                if (isPremium) {
                  onChooseAI();
                } else {
                  onClose();
                  showUpgradeModal('ai_goal');
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: `${colors.primary}15` }]}> 
                <Image source={require('@/assets/images/ai-assistant-icon-2.png')} style={{ width: 28, height: 28 }} resizeMode="contain" />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  AI-Powered Creation
                </Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  Chat with AI to create a personalized goal with automatic task planning
                </Text>
                <View style={styles.optionBadge}>
                  {isPremium ? (
                    <>
                      <Sparkles size={12} color={colors.primary} />
                      <Text style={[styles.badgeText, { color: colors.primary }]}>
                        Recommended
                      </Text>
                    </>
                  ) : (
                    <>
                      <Lock size={12} color={colors.primary} />
                      <Text style={[styles.badgeText, { color: colors.primary }]}>
                        Premium
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <View pointerEvents="none" style={insetTopLight(colors as any, isDark, 0.06)} />
              <View pointerEvents="none" style={insetBottomDark(colors as any, isDark, 0.06)} />
            </TouchableOpacity>

            {/* Manual Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                { backgroundColor: colors.card },
                shadowSm(isDark),
              ]}
              onPress={onChooseManual}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: `${colors.info}15` }]}>
                <Image source={require('@/assets/images/edit-utensil-icon.png')} style={{ width: 26, height: 26 }} resizeMode="contain" />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  Manual Creation
                </Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  Create your goal manually and add tasks as needed
                </Text>
              </View>
              <View pointerEvents="none" style={insetTopLight(colors as any, isDark, 0.06)} />
              <View pointerEvents="none" style={insetBottomDark(colors as any, isDark, 0.06)} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 0,
    marginBottom: 16,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  optionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
