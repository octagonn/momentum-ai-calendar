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
  Image,
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
    premiumIconContainer: {
      width: 104,
      height: 104,
      borderRadius: 52,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      marginBottom: 12,
    },
    premiumIcon: {
      width: 80,
      height: 80,
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
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    themeOption: {
      width: '48%',
      paddingVertical: 14,
      paddingHorizontal: 16,
      minHeight: 44,
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
      gap: 12,
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
              <Image
                source={require('@/assets/images/premium-icon-1.png')}
                style={{ width: 72, height: 72 }}
                resizeMode="contain"
              />
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
              <View style={styles.premiumIconContainer}>
                <Image
                  source={require('@/assets/images/premium-icon-1.png')}
                  style={styles.premiumIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.subscriptionTitle}>Momentum Premium</Text>
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
              <Text style={styles.modalLastUpdated}>Last updated: October 25, 2025</Text>

              <Text style={[styles.modalSectionTitle, styles.modalFirstSectionTitle]}>PRIVACY POLICY</Text>
              <Text style={styles.modalParagraph}>
                USE AT YOUR OWN RISK: By using Momentum: AI Calendar, you acknowledge that you use the Services at your own risk. While we implement security measures to protect your information, we cannot guarantee absolute security. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
              </Text>
              <Text style={styles.modalParagraph}>
                This Privacy Notice for Momentum: AI Calendar ("we", "us", or "our") describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our Services, including when you use our mobile application.
              </Text>
              <Text style={styles.modalParagraph}>
                Questions or concerns? Reading this Privacy Notice will help you understand your privacy rights and choices. If you do not agree with our policies and practices, please do not use our Services. If you still have questions or concerns, contact us at app.momentum.mobile@gmail.com.
              </Text>

              <Text style={styles.modalSectionTitle}>SUMMARY OF KEY POINTS</Text>
              <Text style={styles.modalBulletPoint}>• What personal information do we process? It depends on how you use the Services.</Text>
              <Text style={styles.modalBulletPoint}>• Do we process any sensitive information? Only with your consent or as permitted by law.</Text>
              <Text style={styles.modalBulletPoint}>• Do we collect information from third parties? We do not collect from third parties.</Text>
              <Text style={styles.modalBulletPoint}>• How do we process your information? To provide, improve, secure, and comply with law.</Text>
              <Text style={styles.modalBulletPoint}>• With whom do we share? Service providers and in business transfers, as needed.</Text>
              <Text style={styles.modalBulletPoint}>• How do we keep information safe? Organizational/technical safeguards (no method is 100% secure).</Text>
              <Text style={styles.modalBulletPoint}>• Your rights: You may have rights to access, correct, delete, restrict, object, and portability.</Text>

              <Text style={styles.modalSectionTitle}>TABLE OF CONTENTS</Text>
              <Text style={styles.modalBulletPoint}>1. WHAT INFORMATION DO WE COLLECT?</Text>
              <Text style={styles.modalBulletPoint}>2. HOW DO WE PROCESS YOUR INFORMATION?</Text>
              <Text style={styles.modalBulletPoint}>3. WHAT LEGAL BASES DO WE RELY ON?</Text>
              <Text style={styles.modalBulletPoint}>4. WHEN AND WITH WHOM DO WE SHARE?</Text>
              <Text style={styles.modalBulletPoint}>5. DO WE OFFER AI-BASED PRODUCTS?</Text>
              <Text style={styles.modalBulletPoint}>6. HOW LONG DO WE KEEP YOUR INFORMATION?</Text>
              <Text style={styles.modalBulletPoint}>7. HOW DO WE KEEP YOUR INFORMATION SAFE?</Text>
              <Text style={styles.modalBulletPoint}>8. WHAT ARE YOUR PRIVACY RIGHTS?</Text>
              <Text style={styles.modalBulletPoint}>9. CONTROLS FOR DO-NOT-TRACK FEATURES</Text>
              <Text style={styles.modalBulletPoint}>10. US RESIDENTS: SPECIFIC PRIVACY RIGHTS</Text>
              <Text style={styles.modalBulletPoint}>11. DO WE MAKE UPDATES TO THIS NOTICE?</Text>
              <Text style={styles.modalBulletPoint}>12. HOW TO CONTACT US</Text>
              <Text style={styles.modalBulletPoint}>13. HOW TO REVIEW/UPDATE/DELETE DATA</Text>

              <Text style={styles.modalSectionTitle}>1. WHAT INFORMATION DO WE COLLECT?</Text>
              <Text style={styles.modalParagraph}>Personal information you provide, including: names, email addresses, usernames, passwords, calendar data/events, tasks/reminders, time zone and location preferences, and device information. Sensitive information (e.g., biometric) only with consent or as permitted. Google API use adheres to the Google API Services User Data Policy (Limited Use).</Text>

              <Text style={styles.modalSectionTitle}>2. HOW DO WE PROCESS YOUR INFORMATION?</Text>
              <Text style={styles.modalParagraph}>We process information to provide, improve, and administer our Services, communicate with you, ensure security/fraud prevention, and comply with law. Examples: account creation/authentication, service delivery, vital interests.</Text>

              <Text style={styles.modalSectionTitle}>3. WHAT LEGAL BASES DO WE RELY ON?</Text>
              <Text style={styles.modalParagraph}>We rely on consent, performance of a contract, legal obligations, vital interests, or legitimate interests (depending on your region, e.g., EU/UK/Canada).</Text>

              <Text style={styles.modalSectionTitle}>4. WHEN AND WITH WHOM DO WE SHARE?</Text>
              <Text style={styles.modalParagraph}>With service providers under contract and in business transfers (e.g., mergers/acquisitions). We do not sell personal information.</Text>

              <Text style={styles.modalSectionTitle}>5. DO WE OFFER AI-BASED PRODUCTS?</Text>
              <Text style={styles.modalParagraph}>We offer AI features for analysis/scheduling. AI-generated content may be inaccurate and must be verified by you. Third-party AI providers process data under their terms.</Text>

              <Text style={styles.modalSectionTitle}>6. HOW LONG DO WE KEEP YOUR INFORMATION?</Text>
              <Text style={styles.modalParagraph}>As long as necessary for the purposes in this Notice (e.g., while your account is active) or as required/permitted by law, after which we delete/anonymize where feasible.</Text>

              <Text style={styles.modalSectionTitle}>7. HOW DO WE KEEP YOUR INFORMATION SAFE?</Text>
              <Text style={styles.modalParagraph}>We implement appropriate technical/organizational measures. No method is 100% secure. Transmission is at your own risk; safeguard your credentials.</Text>

              <Text style={styles.modalSectionTitle}>8. WHAT ARE YOUR PRIVACY RIGHTS?</Text>
              <Text style={styles.modalParagraph}>Depending on your location, you may have rights to access, correct, delete, restrict, object, and portability. You can withdraw consent at any time (will not affect prior processing).</Text>

              <Text style={styles.modalSectionTitle}>9. CONTROLS FOR DO-NOT-TRACK FEATURES</Text>
              <Text style={styles.modalParagraph}>We do not currently respond to DNT signals due to lack of a uniform standard. If one is adopted, we will update this Notice.</Text>

              <Text style={styles.modalSectionTitle}>10. US RESIDENTS: SPECIFIC PRIVACY RIGHTS</Text>
              <Text style={styles.modalParagraph}>Some US states grant additional rights. Categories processed (last 12 months) may include identifiers, account records, commercial information, internet activity, geolocation (limited), inferences, and sensitive data (limited/optional).</Text>

              <Text style={styles.modalSectionTitle}>11. DO WE MAKE UPDATES TO THIS NOTICE?</Text>
              <Text style={styles.modalParagraph}>Yes. We update as necessary to stay compliant with relevant laws. Updated versions will reflect a revised date; material changes may be communicated.</Text>

              <Text style={styles.modalSectionTitle}>12. HOW TO CONTACT US</Text>
              <Text style={styles.modalParagraph}>Email: app.momentum.mobile@gmail.com</Text>
              <Text style={styles.modalParagraph}>Momentum: AI Calendar</Text>
              <Text style={styles.modalParagraph}>Ladera Ranch</Text>
              <Text style={styles.modalParagraph}>Ladera Ranch, CA 92694</Text>
              <Text style={styles.modalParagraph}>United States</Text>

              <Text style={styles.modalSectionTitle}>13. HOW TO REVIEW, UPDATE, OR DELETE YOUR DATA</Text>
              <Text style={styles.modalParagraph}>You may request access, correction, deletion, or portability of your data. Send a data subject access request (DSAR) to app.momentum.mobile@gmail.com.</Text>
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
              <Text style={styles.modalLastUpdated}>Last updated: October 25, 2025</Text>

              <Text style={[styles.modalSectionTitle, styles.modalFirstSectionTitle]}>⚠️ IMPORTANT NOTICE - USE AT YOUR OWN RISK</Text>
              <Text style={styles.modalParagraph}>BY USING MOMENTUM: AI CALENDAR, YOU ACKNOWLEDGE AND AGREE THAT:</Text>
              <Text style={styles.modalBulletPoint}>1) You use the Services entirely at your own risk</Text>
              <Text style={styles.modalBulletPoint}>2) AI-generated content may be inaccurate, incomplete, or unreliable</Text>
              <Text style={styles.modalBulletPoint}>3) You are solely responsible for verifying all calendar entries, appointments, reminders, and suggestions</Text>
              <Text style={styles.modalBulletPoint}>4) We are not liable for missed appointments, scheduling errors, or consequences arising from your use</Text>
              <Text style={styles.modalBulletPoint}>5) No warranties are provided — the Services are provided "AS IS" and "AS AVAILABLE"</Text>
              <Text style={styles.modalBulletPoint}>6) Our liability is limited to the maximum extent permitted by law</Text>

              <Text style={styles.modalSectionTitle}>AGREEMENT TO OUR LEGAL TERMS</Text>
              <Text style={styles.modalParagraph}>We are Momentum: AI Calendar ("Company," "we," "us," "our") located in Ladera Ranch, CA 92694, United States. We operate the Momentum: AI Calendar mobile application and related services ("Services"). By accessing the Services, you agree to these Legal Terms. IF YOU DO NOT AGREE, DO NOT USE THE SERVICES.</Text>
              <Text style={styles.modalParagraph}>These terms may change; we will update the “Last updated” date. Continued use means you accept changes. The Services are for users at least 13 years of age; minors must have parental permission and supervision.</Text>

              <Text style={styles.modalSectionTitle}>TABLE OF CONTENTS</Text>
              <Text style={styles.modalBulletPoint}>1. OUR SERVICES</Text>
              <Text style={styles.modalBulletPoint}>2. INTELLECTUAL PROPERTY RIGHTS</Text>
              <Text style={styles.modalBulletPoint}>3. USER REPRESENTATIONS</Text>
              <Text style={styles.modalBulletPoint}>4. USER REGISTRATION</Text>
              <Text style={styles.modalBulletPoint}>5. PURCHASES AND PAYMENT</Text>
              <Text style={styles.modalBulletPoint}>6. SUBSCRIPTIONS</Text>
              <Text style={styles.modalBulletPoint}>7. PROHIBITED ACTIVITIES</Text>
              <Text style={styles.modalBulletPoint}>8. AI SERVICES AND LIMITATIONS</Text>
              <Text style={styles.modalBulletPoint}>9. USER GENERATED CONTRIBUTIONS</Text>
              <Text style={styles.modalBulletPoint}>10. CONTRIBUTION LICENSE</Text>
              <Text style={styles.modalBulletPoint}>11. GUIDELINES FOR REVIEWS</Text>
              <Text style={styles.modalBulletPoint}>12. MOBILE APPLICATION LICENSE</Text>
              <Text style={styles.modalBulletPoint}>13. SERVICES MANAGEMENT</Text>
              <Text style={styles.modalBulletPoint}>14. PRIVACY POLICY</Text>
              <Text style={styles.modalBulletPoint}>15. TERM AND TERMINATION</Text>
              <Text style={styles.modalBulletPoint}>16. MODIFICATIONS AND INTERRUPTIONS</Text>
              <Text style={styles.modalBulletPoint}>17. GOVERNING LAW</Text>
              <Text style={styles.modalBulletPoint}>18. DISPUTE RESOLUTION</Text>
              <Text style={styles.modalBulletPoint}>19. CORRECTIONS</Text>
              <Text style={styles.modalBulletPoint}>20. DISCLAIMER</Text>
              <Text style={styles.modalBulletPoint}>21. LIMITATIONS OF LIABILITY</Text>
              <Text style={styles.modalBulletPoint}>22. INDEMNIFICATION</Text>
              <Text style={styles.modalBulletPoint}>23. USER DATA</Text>
              <Text style={styles.modalBulletPoint}>24. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES</Text>
              <Text style={styles.modalBulletPoint}>25. CALIFORNIA USERS AND RESIDENTS</Text>
              <Text style={styles.modalBulletPoint}>26. MISCELLANEOUS</Text>
              <Text style={styles.modalBulletPoint}>27. CONTACT US</Text>

              <Text style={styles.modalSectionTitle}>1. OUR SERVICES</Text>
              <Text style={styles.modalParagraph}>Use of the Services may not be lawful in every jurisdiction. You are responsible for compliance with local laws. The Services are not tailored for industry-specific regulations (e.g., HIPAA, FISMA) and must not be used in ways that violate GLBA.</Text>

              <Text style={styles.modalSectionTitle}>2. INTELLECTUAL PROPERTY RIGHTS</Text>
              <Text style={styles.modalParagraph}>We (or our licensors) own all intellectual property rights in the Services, including source code, software, designs, text, and graphics ("Content") and marks ("Marks"). Content and Marks are provided "AS IS" for personal, non-commercial use or internal business purposes only. For permissions, contact app.momentum.mobile@gmail.com.</Text>

              <Text style={styles.modalSectionTitle}>3. USER REPRESENTATIONS</Text>
              <Text style={styles.modalParagraph}>You represent that your registration information is accurate and current; you have legal capacity; you are not under 13; you won’t use automated means to access the Services; and your use is lawful.</Text>

              <Text style={styles.modalSectionTitle}>4. USER REGISTRATION</Text>
              <Text style={styles.modalParagraph}>You may be required to register. Keep your password confidential and accept responsibility for account use. We may reclaim usernames that are inappropriate.</Text>

              <Text style={styles.modalSectionTitle}>5. PURCHASES AND PAYMENT</Text>
              <Text style={styles.modalParagraph}>Payments are processed by platform providers (e.g., Apple). Provide accurate account and payment information. Prices may change. All payments are in US dollars.</Text>

              <Text style={styles.modalSectionTitle}>6. SUBSCRIPTIONS</Text>
              <Text style={styles.modalParagraph}>Subscriptions renew automatically unless canceled via iOS App Store Subscriptions. Free trial: 7 days for new users. Purchases are non-refundable. Fee changes may occur and will be communicated as required by law.</Text>

              <Text style={styles.modalSectionTitle}>7. PROHIBITED ACTIVITIES</Text>
              <Text style={styles.modalParagraph}>Examples (non-exhaustive): data scraping; defrauding users; bypassing security; harmful content; unauthorized automation; IP infringement; unlawful use; reverse engineering; spam; impersonation; overburdening networks; and competing services not permitted.</Text>

              <Text style={styles.modalSectionTitle}>8. AI SERVICES AND LIMITATIONS</Text>
              <Text style={styles.modalParagraph}>AI-generated content may be inaccurate or unreliable. You must verify all outputs. We use third-party AI providers under their terms. No professional advice is provided. You agree to hold us harmless for consequences arising from AI errors.</Text>

              <Text style={styles.modalSectionTitle}>9–11. USER CONTENT, LICENSE, AND REVIEWS</Text>
              <Text style={styles.modalParagraph}>If enabled, contributions and reviews must be lawful and non-infringing. You grant us rights to use suggestions/feedback. We may moderate or remove content at our discretion.</Text>

              <Text style={styles.modalSectionTitle}>12. MOBILE APPLICATION LICENSE</Text>
              <Text style={styles.modalParagraph}>We grant a limited, revocable, non-transferable license to install and use the App per these terms. Additional conditions apply for Apple/Google distributors.</Text>

              <Text style={styles.modalSectionTitle}>13. SERVICES MANAGEMENT</Text>
              <Text style={styles.modalParagraph}>We may monitor violations, take legal action, restrict access, and manage Services to protect rights and ensure proper functioning.</Text>

              <Text style={styles.modalSectionTitle}>14. PRIVACY POLICY</Text>
              <Text style={styles.modalParagraph}>See our Privacy Policy. By using the Services, you agree to it. Services are hosted in the US; by accessing from other regions, you consent to processing in the US. We do not knowingly collect data from children under 13.</Text>

              <Text style={styles.modalSectionTitle}>15–16. TERM; MODIFICATIONS & INTERRUPTIONS</Text>
              <Text style={styles.modalParagraph}>We may terminate or suspend access without notice. We may change, modify, or remove content and have no obligation to update information. Downtime may occur.</Text>

              <Text style={styles.modalSectionTitle}>17. GOVERNING LAW</Text>
              <Text style={styles.modalParagraph}>These terms are governed by the laws of the State of California, without regard to conflict-of-law principles.</Text>

              <Text style={styles.modalSectionTitle}>18. DISPUTE RESOLUTION</Text>
              <Text style={styles.modalParagraph}>Informal negotiations (30 days) followed by binding arbitration (AAA rules) in Orange County, CA, unless otherwise required. No class actions. Certain IP or injunctive matters are excluded.</Text>

              <Text style={styles.modalSectionTitle}>19. CORRECTIONS</Text>
              <Text style={styles.modalParagraph}>We may correct errors or omissions at any time without prior notice.</Text>

              <Text style={styles.modalSectionTitle}>20. DISCLAIMER</Text>
              <Text style={styles.modalParagraph}>THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE". YOU USE THEM AT YOUR OWN RISK. We disclaim all warranties to the fullest extent permitted by law. AI-generated content may be inaccurate; verify all information independently.</Text>

              <Text style={styles.modalSectionTitle}>21. LIMITATIONS OF LIABILITY</Text>
              <Text style={styles.modalParagraph}>We are not liable for direct/indirect/consequential/special/punitive damages including missed appointments, scheduling errors, data loss, or reliance on information. Liability is limited to the lesser of amounts paid in the prior 6 months or $100.</Text>

              <Text style={styles.modalSectionTitle}>22. INDEMNIFICATION</Text>
              <Text style={styles.modalParagraph}>You agree to defend, indemnify, and hold us harmless from claims arising from your use, breach of these terms, or violations of third-party rights or law.</Text>

              <Text style={styles.modalSectionTitle}>23. USER DATA</Text>
              <Text style={styles.modalParagraph}>We may maintain data for performance management. You are responsible for your transmitted data. We are not liable for loss or corruption of such data.</Text>

              <Text style={styles.modalSectionTitle}>24. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES</Text>
              <Text style={styles.modalParagraph}>You consent to electronic communications and agree that electronic signatures and records satisfy legal requirements for written communications.</Text>

              <Text style={styles.modalSectionTitle}>25. CALIFORNIA USERS AND RESIDENTS</Text>
              <Text style={styles.modalParagraph}>For unresolved complaints, you may contact the California Department of Consumer Affairs, 1625 North Market Blvd., Suite N-112, Sacramento, CA 95834; (800) 952-5210 or (916) 445-1254.</Text>

              <Text style={styles.modalSectionTitle}>26. MISCELLANEOUS</Text>
              <Text style={styles.modalParagraph}>These terms constitute the entire agreement. Our failure to enforce any right is not a waiver. We may assign rights/obligations at any time. If any provision is unlawful or unenforceable, the remainder remains in effect.</Text>

              <Text style={styles.modalSectionTitle}>27. CONTACT US</Text>
              <Text style={styles.modalParagraph}>Momentum: AI Calendar</Text>
              <Text style={styles.modalParagraph}>Ladera Ranch</Text>
              <Text style={styles.modalParagraph}>Ladera Ranch, CA 92694</Text>
              <Text style={styles.modalParagraph}>United States</Text>
              <Text style={styles.modalParagraph}>Phone: 949-533-8013</Text>
              <Text style={styles.modalParagraph}>Email: app.momentum.mobile@gmail.com</Text>
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