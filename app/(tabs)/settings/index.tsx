import React, { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  Animated,
  StatusBar,
  Modal,
  Alert,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Crown, Shield, FileText, X, Lock, Sun, Moon, Monitor, Sparkles, Calendar } from "lucide-react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useNotifications } from "@/providers/NotificationProvider";
import { useSubscription } from "@/providers/SubscriptionProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase-client";
import { subscriptionService } from "@/services/subscriptionService";
import SubscriptionManagementModal from "@/app/components/SubscriptionManagementModal";

export default function SettingsScreen() {
  const { colors, isDark, isGalaxy, themeMode, setThemeMode } = useTheme();
  const { user, updateUser } = useUser();
  const { signOut } = useAuth();
  const { isPremium, subscriptionTier, showUpgradeModal } = useSubscription();
  const { 
    hasPermission, 
    permissionStatus, 
    settings: notificationSettings, 
    preferences: notificationPreferences,
    requestPermission,
    updateSettings: updateNotificationSettings,
    updatePreferences: updateNotificationPreferences,
    sendTestNotification,
    cancelAllNotifications
  } = useNotifications();
  
  const [taskReminderMinutes, setTaskReminderMinutes] = useState(notificationPreferences.taskReminderMinutes);
  const [showDobPicker, setShowDobPicker] = useState<boolean>(false);
  
  // Handle case where user is still loading or null
  if (!user) {
    return null; // This will be handled by ProtectedRoute
  }
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [privacyModalVisible, setPrivacyModalVisible] = useState<boolean>(false);
  const [termsModalVisible, setTermsModalVisible] = useState<boolean>(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState<boolean>(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);

  const handleToggle = async (setting: string, value: boolean) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (setting === "theme") {
      toggleTheme();
    } else {
      updateUser({
        settings: {
          ...user.settings,
          [setting]: value,
        },
      });
    }
  };

  const handleUpgradeToPro = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    showUpgradeModal('general');
  };
  
  const handleManageSubscription = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSubscriptionModalVisible(true);
  };

  const handleChangePassword = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setChangePasswordModalVisible(true);
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', 'Password updated successfully');
      setChangePasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePrivacyPolicy = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPrivacyModalVisible(true);
  };

  const handleTermsConditions = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTermsModalVisible(true);
  };


  const handleLogout = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const { error } = await signOut();
    if (error) {
      console.error('Logout error:', error);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0a0a1a' : '#f8fafc',
    },
    patternLine: {
      position: 'absolute',
      width: 150,
      height: 2,
      backgroundColor: 'white',
      transform: [{ rotate: '45deg' }],
    },
    patternCircle: {
      position: 'absolute',
      borderRadius: 50,
      borderWidth: 2,
      borderColor: 'white',
      opacity: 0.15,
    },
    patternDot: {
      position: 'absolute',
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'white',
      opacity: 0.2,
    },
    patternTriangle: {
      position: 'absolute',
      width: 0,
      height: 0,
      borderLeftWidth: 10,
      borderRightWidth: 10,
      borderBottomWidth: 20,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: 'white',
      opacity: 0.15,
    },
    patternSquare: {
      position: 'absolute',
      width: 15,
      height: 15,
      backgroundColor: 'white',
      opacity: 0.15,
      transform: [{ rotate: '45deg' }],
    },
    headerContainer: {
      position: 'relative',
      overflow: 'hidden',
      zIndex: 1,
      marginBottom: 20,
    },
    headerBackground: {
      position: 'absolute',
      top: -insets.top,
      left: 0,
      right: 0,
      height: 180 + insets.top,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      zIndex: 1,
      overflow: 'hidden',
    },
    patternOverlay: {
      position: 'absolute',
      top: -insets.top,
      left: 0,
      right: 0,
      height: 180 + insets.top,
      opacity: 0.15,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      zIndex: 2,
      overflow: 'hidden',
    },
    gradientOverlay: {
      position: 'absolute',
      top: -insets.top,
      left: 0,
      right: 0,
      height: 180 + insets.top,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      zIndex: 1,
      opacity: 0.7,
    },
    headerContent: {
      paddingHorizontal: 24,
      paddingTop: Math.max(20, insets.top + 10),
      paddingBottom: 20,
      zIndex: 5,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700" as const,
      fontFamily: 'Poppins_700Bold',
      color: '#ffffff',
      marginBottom: 6,
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      letterSpacing: 0.5,
    },
    headerSubtitle: {
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.9)',
      fontWeight: "500" as const,
      fontFamily: 'Inter_500Medium',
      letterSpacing: 0.3,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    subscriptionCard: {
      margin: 20,
      borderRadius: 24,
      overflow: "hidden",
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 5,
    },
    gradientContent: {
      padding: 24,
      alignItems: "center",
    },
    subscriptionTitle: {
      fontSize: 24,
      fontWeight: "700" as const,
      color: "white",
      marginBottom: 8,
    },
    subscriptionDescription: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.9)",
      textAlign: "center",
      marginBottom: 20,
    },
    featuresList: {
      width: "100%",
      marginBottom: 20,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    featureBullet: {
      fontSize: 16,
      color: "white",
      marginRight: 8,
    },
    featureText: {
      fontSize: 15,
      color: "white",
    },
    upgradeButton: {
      backgroundColor: "white",
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 25,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    upgradeButtonText: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.primary,
    },
    section: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 24,
      padding: 20,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600" as const,
      color: colors.primary,
      marginBottom: 16,
    },
    settingItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    },
    settingItemLast: {
      borderBottomWidth: 0,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    settingInfo: {
      flex: 1,
      marginRight: 12,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: "500" as const,
      color: colors.text,
      marginBottom: 2,
    },
    settingDescription: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    textInput: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 16,
      color: colors.text,
      minWidth: 150,
      fontFamily: 'Inter_500Medium',
    },
    smallInput: {
      width: 100,
      textAlign: 'right' as const,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap' as const,
      gap: 8,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    chip: {
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    actionButton: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: "500" as const,
      color: colors.text,
    },
    dangerButton: {
      borderColor: colors.danger,
    },
    dangerButtonText: {
      color: colors.danger,
    },
    logoutButton: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logoutButtonText: {
      color: colors.text,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
      borderRadius: 24,
      margin: 20,
      maxHeight: '80%',
      width: '90%',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.3)',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600' as const,
      color: colors.text,
    },
    closeButton: {
      padding: 4,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    },
    modalContent: {
      padding: 20,
    },
    modalSectionTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.primary,
      marginBottom: 12,
      marginTop: 20,
    },
    modalFirstSectionTitle: {
      marginTop: 0,
    },
    modalParagraph: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
      marginBottom: 12,
    },
    modalBulletPoint: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
      marginBottom: 6,
      paddingLeft: 12,
    },
    modalLastUpdated: {
      fontSize: 13,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginBottom: 16,
    },
    themeOptions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    themeOption: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
      alignItems: 'center',
    },
    themeOptionActive: {
      borderWidth: 2,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)',
    },
    themeOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    themeOptionText: {
      fontSize: 14,
      fontWeight: '600' as const,
      fontFamily: 'Inter_600SemiBold',
    },
  });

  const features = [
    "Unlimited active goals",
    "Advanced AI coaching",
    "Priority support",
    "Custom themes",
    "Detailed analytics",
  ];

  return (
    <View style={styles.container} testID="settings-screen">
      {isGalaxy && (
        <ImageBackground 
          source={require('@/assets/images/background.png')} 
          style={StyleSheet.absoluteFillObject} 
          resizeMode="cover"
        />
      )}
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <Animated.View style={styles.headerContainer}>
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBackground}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.1)']}
          locations={[0, 0.7, 1]}
          style={styles.gradientOverlay}
        />
        <View style={styles.patternOverlay}>
          {/* Pattern overlay with diagonal lines */}
          {Array.from({ length: 10 }).map((_, i) => {
            const lineStyle = {
              ...styles.patternLine,
              top: i * 22,
              left: -50 + (i % 3) * 30,
              opacity: 0.15 + (i % 3) * 0.05,
              width: 180,
            };
            return <View key={`pattern-${i}`} style={lineStyle} />;
          })}
          {Array.from({ length: 5 }).map((_, i) => {
            const circleStyle = {
              ...styles.patternCircle,
              width: 40 + (i % 4) * 20,
              height: 40 + (i % 4) * 20,
              top: 20 + (i * 40),
              right: -10 + (i % 5) * 30,
            };
            return <View key={`circle-${i}`} style={circleStyle} />;
          })}
          {/* Add dots pattern */}
          {Array.from({ length: 20 }).map((_, i) => {
            const dotStyle = {
              ...styles.patternDot,
              top: 10 + Math.random() * 140,
              left: 10 + Math.random() * 350,
              opacity: 0.1 + Math.random() * 0.2,
            };
            return <View key={`dot-${i}`} style={dotStyle} />;
          })}
          {/* Add triangles */}
          {Array.from({ length: 4 }).map((_, i) => {
            const triangleStyle = {
              ...styles.patternTriangle,
              top: 20 + Math.random() * 120,
              left: 30 + Math.random() * 320,
              transform: [{ rotate: `${Math.random() * 180}deg` }],
            };
            return <View key={`triangle-${i}`} style={triangleStyle} />;
          })}
          {/* Add squares */}
          {Array.from({ length: 5 }).map((_, i) => {
            const squareStyle = {
              ...styles.patternSquare,
              top: 15 + Math.random() * 130,
              left: 15 + Math.random() * 330,
            };
            return <View key={`square-${i}`} style={squareStyle} />;
          })}
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your Momentum experience</Text>
        </View>
      </Animated.View>
      
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >

        <View style={styles.subscriptionCard}>
          {isPremium ? (
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientContent}
            >
              <Crown size={48} color="white" />
              <Text style={styles.subscriptionTitle}>Premium Member</Text>
              <Text style={styles.subscriptionDescription}>
                You have access to all premium features
              </Text>
              
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureBullet}>✓</Text>
                  <Text style={styles.featureText}>Unlimited Goals</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureBullet}>✓</Text>
                  <Text style={styles.featureText}>AI Goal Creation</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureBullet}>✓</Text>
                  <Text style={styles.featureText}>Custom Goal Colors</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureBullet}>✓</Text>
                  <Text style={styles.featureText}>Advanced Analytics</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={[styles.upgradeButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]} 
                activeOpacity={0.8}
                onPress={handleManageSubscription}
                testID="manage-subscription-button"
              >
                <Text style={[styles.upgradeButtonText, { color: 'white' }]}>Manage Subscription</Text>
              </TouchableOpacity>
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientContent}
            >
              <Text style={styles.subscriptionTitle}>Momentum Pro</Text>
              <Text style={styles.subscriptionDescription}>
                $4.99/month • 7-day free trial for new users
              </Text>
              
              <View style={styles.featuresList}>
                {features.map((feature) => (
                  <View key={feature} style={styles.featureItem}>
                    <Text style={styles.featureBullet}>✓</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
              
              <TouchableOpacity 
                style={styles.upgradeButton} 
                activeOpacity={0.8}
                onPress={handleUpgradeToPro}
                testID="upgrade-pro-button"
              >
                <Crown size={20} color={colors.primary} />
                <Text style={styles.upgradeButtonText}>Upgrade to Pro - $4.99/month</Text>
              </TouchableOpacity>
            </LinearGradient>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Full Name</Text>
                <Text style={styles.settingDescription}>Your display name</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={user.name}
                onChangeText={(text) => updateUser({ name: text })}
                placeholder="Enter name"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Username</Text>
                <Text style={styles.settingDescription}>Your unique identifier</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={user.username || ''}
                onChangeText={(text) => updateUser({ username: text })}
                placeholder="Enter username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email</Text>
                <Text style={styles.settingDescription}>{user.email}</Text>
              </View>
            </View>
          </View>
          
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Password</Text>
                <Text style={styles.settingDescription}>Change your account password</Text>
              </View>
              <TouchableOpacity 
                style={styles.actionButton} 
                activeOpacity={0.7}
                onPress={handleChangePassword}
                testID="change-password-button"
              >
                <Lock size={16} color={colors.text} />
                <Text style={styles.actionButtonText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Theme</Text>
              <Text style={styles.settingDescription}>
                Choose your preferred appearance
              </Text>
            </View>
            <View style={styles.themeOptions}>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'light' && [styles.themeOptionActive, { borderColor: colors.primary }]
                ]}
                onPress={async () => {
                  if (Platform.OS !== "web") {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setThemeMode('light');
                }}
              >
                <View style={styles.themeOptionContent}>
                  <Sun size={20} color={themeMode === 'light' ? colors.primary : colors.text} />
                  <Text style={[
                    styles.themeOptionText,
                    { color: themeMode === 'light' ? colors.primary : colors.text }
                  ]}>
                    Light
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'dark' && [styles.themeOptionActive, { borderColor: colors.primary }]
                ]}
                onPress={async () => {
                  if (Platform.OS !== "web") {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setThemeMode('dark');
                }}
              >
                <View style={styles.themeOptionContent}>
                  <Moon size={20} color={themeMode === 'dark' ? colors.primary : colors.text} />
                  <Text style={[
                    styles.themeOptionText,
                    { color: themeMode === 'dark' ? colors.primary : colors.text }
                  ]}>
                    Dark
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'galaxy' && [styles.themeOptionActive, { borderColor: colors.primary }]
                ]}
                onPress={async () => {
                  if (Platform.OS !== "web") {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setThemeMode('galaxy');
                }}
              >
                <View style={styles.themeOptionContent}>
                  <Sparkles size={20} color={themeMode === 'galaxy' ? colors.primary : colors.text} />
                  <Text style={[
                    styles.themeOptionText,
                    { color: themeMode === 'galaxy' ? colors.primary : colors.text }
                  ]}>
                    Galaxy
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'system' && [styles.themeOptionActive, { borderColor: colors.primary }]
                ]}
                onPress={async () => {
                  if (Platform.OS !== "web") {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setThemeMode('system');
                }}
              >
                <View style={styles.themeOptionContent}>
                  <Monitor size={20} color={themeMode === 'system' ? colors.primary : colors.text} />
                  <Text style={[
                    styles.themeOptionText,
                    { color: themeMode === 'system' ? colors.primary : colors.text }
                  ]}>
                    System
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

      {/* Personalization */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personalization</Text>

        {/* Date of birth (view only) */}
        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Date of Birth</Text>
              <Text style={styles.settingDescription}>Optional, used only to personalize plans</Text>
            </View>
            <View style={[styles.actionButton, { opacity: 0.7 }]}> 
              <Calendar size={16} color={colors.text} />
              <Text style={styles.actionButtonText}>
                {user.dateOfBirth ? (() => { const p = user.dateOfBirth.split('-'); const d = new Date(parseInt(p[0],10), parseInt(p[1],10)-1, parseInt(p[2],10)); return d.toLocaleDateString(); })() : '—'}
              </Text>
            </View>
          </View>
        </View>
        {/* DOB editing disabled in settings */}

        {/* Gender */}
        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Gender</Text>
              <Text style={styles.settingDescription}>Optional, choose what fits best</Text>
            </View>
            <View style={styles.chipRow}>
              {['Female','Male','Non-binary','Prefer not to say'].map((g) => {
                const selected = (user.gender || '') === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => updateUser({ gender: selected ? '' : g })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, { color: selected ? 'white' : colors.text }]}>{g}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Height / Weight per unit preference */}
        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Height ({(user.unitSystem || 'metric') === 'imperial' ? 'ft/in' : 'cm'})</Text>
              <Text style={styles.settingDescription}>Optional</Text>
            </View>
            { (user.unitSystem || 'metric') === 'imperial' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 100 }}>
                  <Picker
                    selectedValue={(() => { const inches = user.heightCm ? Math.round(user.heightCm / 2.54) : 66; return String(Math.floor(inches / 12)); })()}
                    onValueChange={(ft) => {
                      const inches = user.heightCm ? Math.round(user.heightCm / 2.54) : 66;
                      const newInches = parseInt(ft as string, 10) * 12 + (inches % 12);
                      updateUser({ heightCm: Math.round(newInches * 2.54) });
                    }}
                    itemStyle={{ color: colors.text }}
                  >
                    {Array.from({ length: 6 }).map((_, i) => {
                      const val = 3 + i; // 3..8
                      return <Picker.Item key={val} label={`${val} ft`} value={String(val)} />
                    })}
                  </Picker>
                </View>
                <View style={{ width: 100 }}>
                  <Picker
                    selectedValue={(() => { const inches = user.heightCm ? Math.round(user.heightCm / 2.54) : 66; return String(inches % 12); })()}
                    onValueChange={(inch) => {
                      const inches = user.heightCm ? Math.round(user.heightCm / 2.54) : 66;
                      const newInches = Math.floor(inches / 12) * 12 + parseInt(inch as string, 10);
                      updateUser({ heightCm: Math.round(newInches * 2.54) });
                    }}
                    itemStyle={{ color: colors.text }}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <Picker.Item key={i} label={`${i} in`} value={String(i)} />
                    ))}
                  </Picker>
                </View>
              </View>
            ) : (
              <View style={{ width: 140 }}>
                <Picker
                  selectedValue={user.heightCm != null ? String(user.heightCm) : '170'}
                  onValueChange={(v) => updateUser({ heightCm: parseInt(String(v), 10) })}
                  itemStyle={{ color: colors.text }}
                >
                  {Array.from({ length: 201 }).map((_, i) => {
                    const val = 50 + i;
                    return <Picker.Item key={val} label={`${val} cm`} value={String(val)} />
                  })}
                </Picker>
              </View>
            )}
          </View>
        </View>

        {/* Weight */}
        <View style={[styles.settingItem, styles.settingItemLast]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Weight ({(user.unitSystem || 'metric') === 'imperial' ? 'lb' : 'kg'})</Text>
              <Text style={styles.settingDescription}>Optional</Text>
            </View>
            { (user.unitSystem || 'metric') === 'imperial' ? (
              <Text style={[styles.settingLabel, { minWidth: 80, textAlign: 'right' }]}>
                {user.weightKg ? `${Math.round(user.weightKg * 2.20462)} lb` : '—'}
              </Text>
            ) : (
              <TextInput
                style={[styles.textInput, styles.smallInput]}
                keyboardType="number-pad"
                placeholder="e.g. 70"
                placeholderTextColor={colors.textMuted}
                value={user.weightKg != null ? String(user.weightKg) : ''}
                onChangeText={(t) => {
                  const v = t.replace(/[^0-9]/g, '');
                  const num = v ? Math.max(20, Math.min(500, parseInt(v, 10))) : undefined;
                  updateUser({ weightKg: num as any });
                }}
              />
            )}
          </View>
        </View>

        <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
          This information is optional and used only to personalize your plan. It’s private, anonymous, and will never be sold.
        </Text>
      </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          {!hasPermission && (
            <View style={[styles.settingItem, { backgroundColor: colors.warning + '20', borderColor: colors.warning, borderWidth: 1 }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.warning }]}>Notifications Disabled</Text>
                  <Text style={styles.settingDescription}>
                    Enable notifications to receive reminders and updates
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: colors.warning }]} 
                  activeOpacity={0.7}
                  onPress={requestPermission}
                  testID="enable-notifications-button"
                >
                  <Text style={[styles.actionButtonText, { color: 'white' }]}>Enable</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Task Reminders</Text>
                <Text style={styles.settingDescription}>
                  Get notified about upcoming tasks
                </Text>
              </View>
              <Switch
                value={notificationSettings.taskReminders}
                onValueChange={(value) => updateNotificationSettings({ taskReminders: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={notificationSettings.taskReminders ? "white" : "#f4f3f4"}
                disabled={!hasPermission}
              />
            </View>
          </View>
          
          {notificationSettings.taskReminders && hasPermission && (
            <View style={styles.settingItem}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Reminder Time</Text>
                  <Text style={styles.settingDescription}>
                    How many minutes before task to remind you
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.actionButton, { paddingHorizontal: 8, paddingVertical: 4 }]}
                    onPress={() => {
                      const newValue = Math.max(5, taskReminderMinutes - 5);
                      setTaskReminderMinutes(newValue);
                      updateNotificationPreferences({ taskReminderMinutes: newValue });
                    }}
                    disabled={taskReminderMinutes <= 5}
                  >
                    <Text style={styles.actionButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.settingLabel, { minWidth: 40, textAlign: 'center' }]}>
                    {taskReminderMinutes}m
                  </Text>
                  <TouchableOpacity
                    style={[styles.actionButton, { paddingHorizontal: 8, paddingVertical: 4 }]}
                    onPress={() => {
                      const newValue = Math.min(60, taskReminderMinutes + 5);
                      setTaskReminderMinutes(newValue);
                      updateNotificationPreferences({ taskReminderMinutes: newValue });
                    }}
                    disabled={taskReminderMinutes >= 60}
                  >
                    <Text style={styles.actionButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Smart Goal Reminders</Text>
                <Text style={styles.settingDescription}>
                  Get intelligent reminders when tasks become overdue
                </Text>
              </View>
              <Switch
                value={notificationSettings.goalReminders}
                onValueChange={(value) => updateNotificationSettings({ goalReminders: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={notificationSettings.goalReminders ? "white" : "#f4f3f4"}
                disabled={!hasPermission}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal & Privacy</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Privacy Policy</Text>
                <Text style={styles.settingDescription}>How we protect your data</Text>
              </View>
              <TouchableOpacity 
                style={styles.actionButton} 
                activeOpacity={0.7}
                onPress={handlePrivacyPolicy}
                testID="privacy-policy-button"
              >
                <Shield size={16} color={colors.text} />
                <Text style={styles.actionButtonText}>View</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Terms & Conditions</Text>
                <Text style={styles.settingDescription}>
                  Our service agreement
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.actionButton} 
                activeOpacity={0.7}
                onPress={handleTermsConditions}
                testID="terms-conditions-button"
              >
                <FileText size={16} color={colors.text} />
                <Text style={styles.actionButtonText}>View</Text>
              </TouchableOpacity>
            </View>
          </View>
          
        </View>


        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Sign Out</Text>
                <Text style={styles.settingDescription}>
                  Sign out of your account
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.actionButton, styles.logoutButton]}
                activeOpacity={0.7}
                onPress={handleLogout}
                testID="logout-button"
              >
                <Text style={[styles.actionButtonText, styles.logoutButtonText]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Privacy Policy Modal */}
      <Modal
        visible={privacyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}> 
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy Policy</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setPrivacyModalVisible(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLastUpdated}>Last updated: October 22, 2025</Text>

              <Text style={[styles.modalSectionTitle, styles.modalFirstSectionTitle]}>Overview</Text>
              <Text style={styles.modalParagraph}>
                We collect only what we need to operate Momentum and improve your experience. We do not sell your personal data.
              </Text>

              <Text style={styles.modalSectionTitle}>Information We Collect</Text>
              <Text style={styles.modalParagraph}>We process:</Text>
              <Text style={styles.modalBulletPoint}>• Account data: name, email, authentication identifiers</Text>
              <Text style={styles.modalBulletPoint}>• App content: goals, tasks, settings</Text>
              <Text style={styles.modalBulletPoint}>• Diagnostics: crash reports, performance metrics</Text>
              <Text style={styles.modalBulletPoint}>• Device info: model, OS version, timezone</Text>

              <Text style={styles.modalSectionTitle}>How We Use Your Information</Text>
              <Text style={styles.modalParagraph}>We use data to provide the app, sync across devices, send reminders you request, secure accounts, and improve features.</Text>

              <Text style={styles.modalSectionTitle}>Sharing</Text>
              <Text style={styles.modalParagraph}>We do not sell data. We share with service providers (e.g., Supabase, Apple/Google IAP, analytics) strictly to operate the service, under contract, and only what is necessary.</Text>

              <Text style={styles.modalSectionTitle}>Security</Text>
              <Text style={styles.modalParagraph}>We use industry-standard protections in transit and at rest. No method is 100% secure; you use the app at your own risk.</Text>

              <Text style={styles.modalSectionTitle}>Your Rights</Text>
              <Text style={styles.modalParagraph}>Subject to local law, you may access, correct, export, and delete your data. Contact us to exercise these rights.</Text>

              <Text style={styles.modalSectionTitle}>Retention</Text>
              <Text style={styles.modalParagraph}>We keep data while your account is active. When you delete your account, we aim to remove personal data within 30 days, unless retention is required by law, security, or dispute resolution.</Text>

              <Text style={styles.modalSectionTitle}>International Transfers</Text>
              <Text style={styles.modalParagraph}>Your data may be processed outside your country. We use safeguards where required by law.</Text>

              <Text style={styles.modalSectionTitle}>Changes to This Policy</Text>
              <Text style={styles.modalParagraph}>We may update this policy. Continued use means you accept the updated terms.</Text>

              <Text style={styles.modalSectionTitle}>Contact Us</Text>
              <Text style={styles.modalParagraph}>privacy@momentum-app.com</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Terms & Conditions Modal */}
      <Modal
        visible={termsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}> 
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms & Conditions</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setTermsModalVisible(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLastUpdated}>Last updated: October 22, 2025</Text>

              <Text style={[styles.modalSectionTitle, styles.modalFirstSectionTitle]}>Agreement</Text>
              <Text style={styles.modalParagraph}>By using Momentum, you agree to these Terms. If you do not agree, do not use the app.</Text>

              <Text style={styles.modalSectionTitle}>Service</Text>
              <Text style={styles.modalParagraph}>Momentum is provided “as is” and “as available.” Features may change or be discontinued.</Text>

              <Text style={styles.modalSectionTitle}>Accounts</Text>
              <Text style={styles.modalParagraph}>You are responsible for your account, content, and device. You must be legally permitted to use the app.</Text>

              <Text style={styles.modalSectionTitle}>Acceptable Use</Text>
              <Text style={styles.modalParagraph}>No unlawful, harmful, or infringing activity. No reverse engineering, scraping, or unauthorized access.</Text>

              <Text style={styles.modalSectionTitle}>Subscriptions</Text>
              <Text style={styles.modalParagraph}>Purchases and trials are processed by Apple/Google. Billing is handled by those platforms. Taxes may apply. Refunds follow platform rules.</Text>

              <Text style={styles.modalSectionTitle}>Intellectual Property</Text>
              <Text style={styles.modalParagraph}>We (or our licensors) own the app and all related IP. You own your content. You grant us a limited license to process your content to provide the service.</Text>

              <Text style={styles.modalSectionTitle}>Privacy</Text>
              <Text style={styles.modalParagraph}>Our Privacy Policy explains how we handle data and is part of these Terms.</Text>

              <Text style={styles.modalSectionTitle}>Availability</Text>
              <Text style={styles.modalParagraph}>We do not guarantee uninterrupted service. We may suspend or terminate the app or features at any time.</Text>

              <Text style={styles.modalSectionTitle}>Disclaimer; Liability</Text>
              <Text style={styles.modalParagraph}>To the fullest extent permitted by law, the app is provided without warranties, and our total liability is limited to the amounts you paid us for the service in the 12 months before the claim, or $50 if none.</Text>

              <Text style={styles.modalSectionTitle}>Termination</Text>
              <Text style={styles.modalParagraph}>We may suspend or terminate your access for any reason, including violations of these Terms. You may stop using the app at any time.</Text>

              <Text style={styles.modalSectionTitle}>Changes</Text>
              <Text style={styles.modalParagraph}>We may update these Terms. Continued use after updates means you accept them.</Text>

              <Text style={styles.modalSectionTitle}>Contact</Text>
              <Text style={styles.modalParagraph}>legal@momentum-app.com</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChangePasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setChangePasswordModalVisible(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Current Password</Text>
                <TextInput
                  style={styles.textInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>New Password</Text>
                <TextInput
                  style={styles.textInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary, marginTop: 20 }]}
                onPress={handlePasswordChange}
                disabled={passwordLoading}
                activeOpacity={0.7}
              >
                {passwordLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Lock size={16} color="white" />
                    <Text style={[styles.actionButtonText, { color: 'white' }]}>
                      Update Password
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Subscription Management Modal */}
      <SubscriptionManagementModal
        visible={subscriptionModalVisible}
        onClose={() => setSubscriptionModalVisible(false)}
      />
    </View>
  );
}