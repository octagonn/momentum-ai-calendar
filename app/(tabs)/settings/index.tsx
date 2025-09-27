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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Crown, Shield, FileText, Trash2, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, updateUser } = useUser();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [privacyModalVisible, setPrivacyModalVisible] = useState<boolean>(false);
  const [termsModalVisible, setTermsModalVisible] = useState<boolean>(false);

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
    console.log('Upgrade to Pro pressed');
    // Could navigate to subscription screen or open payment modal
  };

  const handleChangeEmail = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    console.log('Change email pressed');
    // Could open email change modal
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

  const handleDeleteAccount = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    console.log('Delete account pressed');
    // Could show confirmation dialog
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
      top: 0,
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
      top: 0,
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
      top: 0,
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
      backgroundColor: colors.card,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: colors.card,
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
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientContent}
          >
            <Text style={styles.subscriptionTitle}>Momentum Pro</Text>
            <Text style={styles.subscriptionDescription}>
              Unlock unlimited goals and advanced features
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
              <Text style={styles.upgradeButtonText}>Upgrade to Pro - $9.99/month</Text>
            </TouchableOpacity>
          </LinearGradient>
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
          
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email</Text>
                <Text style={styles.settingDescription}>{user.email}</Text>
              </View>
              <TouchableOpacity 
                style={styles.actionButton} 
                activeOpacity={0.7}
                onPress={handleChangeEmail}
                testID="change-email-button"
              >
                <Text style={styles.actionButtonText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingDescription}>
                  Switch between light and dark themes
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={() => handleToggle("theme", !isDark)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={isDark ? "white" : "#f4f3f4"}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Goal Reminders</Text>
                <Text style={styles.settingDescription}>
                  Get notified about upcoming tasks
                </Text>
              </View>
              <Switch
                value={user.settings.goalReminders}
                onValueChange={(value) => handleToggle("goalReminders", value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={user.settings.goalReminders ? "white" : "#f4f3f4"}
              />
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Weekly Reports</Text>
                <Text style={styles.settingDescription}>
                  Receive weekly progress summaries
                </Text>
              </View>
              <Switch
                value={user.settings.weeklyReports}
                onValueChange={(value) => handleToggle("weeklyReports", value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={user.settings.weeklyReports ? "white" : "#f4f3f4"}
              />
            </View>
          </View>
          
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Achievement Badges</Text>
                <Text style={styles.settingDescription}>
                  Celebrate when you hit milestones
                </Text>
              </View>
              <Switch
                value={user.settings.achievementBadges}
                onValueChange={(value) => handleToggle("achievementBadges", value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={user.settings.achievementBadges ? "white" : "#f4f3f4"}
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
          
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Delete Account</Text>
                <Text style={styles.settingDescription}>
                  Permanently delete your account and data
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                activeOpacity={0.7}
                onPress={handleDeleteAccount}
                testID="delete-account-button"
              >
                <Trash2 size={16} color={colors.danger} />
                <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
                  Delete
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
          <View style={styles.modalContainer}>
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
              <Text style={styles.modalLastUpdated}>Last updated: December 27, 2024</Text>

              <Text style={[styles.modalSectionTitle, styles.modalFirstSectionTitle]}>Introduction</Text>
              <Text style={styles.modalParagraph}>
                Welcome to Momentum. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy explains how we collect, use, and safeguard your information when you use our app.
              </Text>

              <Text style={styles.modalSectionTitle}>Information We Collect</Text>
              <Text style={styles.modalParagraph}>We collect the following types of information:</Text>
              <Text style={styles.modalBulletPoint}>• Account information (name, email address)</Text>
              <Text style={styles.modalBulletPoint}>• Goal and task data you create</Text>
              <Text style={styles.modalBulletPoint}>• App usage analytics and performance data</Text>
              <Text style={styles.modalBulletPoint}>• Device information for app optimization</Text>

              <Text style={styles.modalSectionTitle}>How We Use Your Information</Text>
              <Text style={styles.modalParagraph}>Your information is used to:</Text>
              <Text style={styles.modalBulletPoint}>• Provide and maintain our services</Text>
              <Text style={styles.modalBulletPoint}>• Sync your data across devices</Text>
              <Text style={styles.modalBulletPoint}>• Send you notifications and updates</Text>
              <Text style={styles.modalBulletPoint}>• Improve our app and user experience</Text>
              <Text style={styles.modalBulletPoint}>• Provide customer support</Text>

              <Text style={styles.modalSectionTitle}>Data Storage and Security</Text>
              <Text style={styles.modalParagraph}>
                Your data is stored securely using industry-standard encryption. We use Supabase as our backend 
                service, which provides enterprise-grade security and compliance. Your personal data is never 
                shared with third parties without your explicit consent.
              </Text>

              <Text style={styles.modalSectionTitle}>Your Rights</Text>
              <Text style={styles.modalParagraph}>You have the right to:</Text>
              <Text style={styles.modalBulletPoint}>• Access your personal data</Text>
              <Text style={styles.modalBulletPoint}>• Correct inaccurate information</Text>
              <Text style={styles.modalBulletPoint}>• Delete your account and data</Text>
              <Text style={styles.modalBulletPoint}>• Export your data</Text>
              <Text style={styles.modalBulletPoint}>• Opt out of non-essential communications</Text>

              <Text style={styles.modalSectionTitle}>Data Retention</Text>
              <Text style={styles.modalParagraph}>
                We retain your data for as long as your account is active. When you delete your account, 
                we will permanently delete your personal data within 30 days, except where we are required 
                to retain it for legal purposes.
              </Text>

              <Text style={styles.modalSectionTitle}>Third-Party Services</Text>
              <Text style={styles.modalParagraph}>
                Our app uses third-party services including Supabase for data storage and Expo for app 
                infrastructure. These services have their own privacy policies and security measures.
              </Text>

              <Text style={styles.modalSectionTitle}>Changes to This Policy</Text>
              <Text style={styles.modalParagraph}>
                We may update this privacy policy from time to time. We will notify you of any significant 
                changes by posting the new policy in the app and updating the Last updated date.
              </Text>

              <Text style={styles.modalSectionTitle}>Contact Us</Text>
              <Text style={styles.modalParagraph}>
                If you have any questions about this privacy policy or our data practices, please contact 
                us at privacy@momentum-app.com.
              </Text>
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
          <View style={styles.modalContainer}>
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
              <Text style={styles.modalLastUpdated}>Last updated: December 27, 2024</Text>

              <Text style={[styles.modalSectionTitle, styles.modalFirstSectionTitle]}>Agreement to Terms</Text>
              <Text style={styles.modalParagraph}>
                By downloading, installing, or using the Momentum app, you agree to be bound by these 
                Terms and Conditions. If you do not agree to these terms, please do not use our service.
              </Text>

              <Text style={styles.modalSectionTitle}>Description of Service</Text>
              <Text style={styles.modalParagraph}>
                Momentum is a goal-tracking and productivity app that helps users set, track, and achieve 
                their personal and professional goals. Our service includes task management, progress tracking, 
                AI-powered coaching, and data synchronization across devices.
              </Text>

              <Text style={styles.modalSectionTitle}>User Accounts</Text>
              <Text style={styles.modalParagraph}>
                To use certain features of our app, you must create an account. You are responsible for:
              </Text>
              <Text style={styles.modalBulletPoint}>• Maintaining the confidentiality of your account credentials</Text>
              <Text style={styles.modalBulletPoint}>• All activities that occur under your account</Text>
              <Text style={styles.modalBulletPoint}>• Providing accurate and up-to-date information</Text>
              <Text style={styles.modalBulletPoint}>• Notifying us immediately of any unauthorized use</Text>

              <Text style={styles.modalSectionTitle}>Acceptable Use</Text>
              <Text style={styles.modalParagraph}>You agree not to:</Text>
              <Text style={styles.modalBulletPoint}>• Use the app for any illegal or unauthorized purpose</Text>
              <Text style={styles.modalBulletPoint}>• Attempt to gain unauthorized access to our systems</Text>
              <Text style={styles.modalBulletPoint}>• Interfere with or disrupt the service</Text>
              <Text style={styles.modalBulletPoint}>• Upload malicious code or harmful content</Text>
              <Text style={styles.modalBulletPoint}>• Violate any applicable laws or regulations</Text>

              <Text style={styles.modalSectionTitle}>Subscription and Payments</Text>
              <Text style={styles.modalParagraph}>
                Momentum offers both free and premium subscription tiers. Premium subscriptions are billed 
                monthly or annually. You may cancel your subscription at any time, but refunds are not 
                provided for partial billing periods.
              </Text>

              <Text style={styles.modalSectionTitle}>Intellectual Property</Text>
              <Text style={styles.modalParagraph}>
                The Momentum app, including its design, features, and content, is owned by us and protected 
                by copyright, trademark, and other intellectual property laws. You retain ownership of the 
                content you create within the app.
              </Text>

              <Text style={styles.modalSectionTitle}>Data and Privacy</Text>
              <Text style={styles.modalParagraph}>
                Your privacy is important to us. Our collection and use of your personal information is 
                governed by our Privacy Policy, which is incorporated into these terms by reference.
              </Text>

              <Text style={styles.modalSectionTitle}>Service Availability</Text>
              <Text style={styles.modalParagraph}>
                We strive to maintain high service availability, but we do not guarantee uninterrupted 
                access. We may temporarily suspend the service for maintenance, updates, or other 
                operational reasons.
              </Text>

              <Text style={styles.modalSectionTitle}>Limitation of Liability</Text>
              <Text style={styles.modalParagraph}>
                To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, 
                special, or consequential damages arising from your use of the app, including but not limited 
                to loss of data, profits, or business opportunities.
              </Text>

              <Text style={styles.modalSectionTitle}>Termination</Text>
              <Text style={styles.modalParagraph}>
                We may terminate or suspend your account and access to the service at our discretion, 
                with or without notice, for violations of these terms or other reasons. You may also 
                terminate your account at any time through the app settings.
              </Text>

              <Text style={styles.modalSectionTitle}>Changes to Terms</Text>
              <Text style={styles.modalParagraph}>
                We reserve the right to modify these terms at any time. We will notify users of significant 
                changes through the app or by email. Continued use of the service after changes constitutes 
                acceptance of the new terms.
              </Text>

              <Text style={styles.modalSectionTitle}>Contact Information</Text>
              <Text style={styles.modalParagraph}>
                If you have questions about these Terms and Conditions, please contact us at 
                legal@momentum-app.com.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}