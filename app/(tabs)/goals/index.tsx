import React, { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Animated,
  StatusBar,
} from "react-native";
import { Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import { useGoals } from "@/providers/GoalsProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GoalCreationModal from "@/components/GoalCreationModal";

export default function GoalsScreen() {
  const { colors, isDark } = useTheme();
  const { goals, isLoading, addGoal } = useGoals();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showGoalCreationModal, setShowGoalCreationModal] = useState(false);



  const handleAddGoal = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowGoalCreationModal(true);
  };

  const handleGoalCreated = async (newGoal: any) => {
    try {
      await addGoal(newGoal);
      setShowGoalCreationModal(false);
      console.log('New goal created:', newGoal.title);
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return colors.success;
      case "completed":
        return colors.primary;
      case "paused":
        return colors.warning;
      default:
        return colors.textSecondary;
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
    addButton: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
      zIndex: 10,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    goalsGrid: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    goalCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 4,
    },
    goalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    goalTitle: {
      fontSize: 18,
      fontWeight: "600" as const,
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "600" as const,
      textTransform: "capitalize" as const,
    },
    progressSection: {
      marginBottom: 16,
    },
    progressBar: {
      height: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 8,
    },
    progressFill: {
      height: "100%",
      borderRadius: 4,
    },
    progressText: {
      fontSize: 14,
      color: colors.textSecondary,
    },

    syncingIndicator: {
      position: 'absolute',
      top: insets.top + 60,
      right: 20,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    syncingText: {
      color: colors.text,
      fontSize: 12,
    },
  });

  return (
    <View style={styles.container} testID="goals-screen">
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
          <Text style={styles.headerTitle}>Your Goals</Text>
          <Text style={styles.headerSubtitle}>Track your progress and celebrate achievements</Text>
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
        <View style={styles.goalsGrid}>
          {goals.map((goal) => {
            const statusColor = getStatusColor(goal.status);
            const progressPercentage = (goal.current / goal.target) * 100;

            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${statusColor}15` },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {goal.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(progressPercentage, 100)}%`,
                          backgroundColor: statusColor,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {goal.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </Animated.ScrollView>
      
      <TouchableOpacity 
        style={[styles.addButton, isLoading && { opacity: 0.7 }]}
        activeOpacity={0.8}
        onPress={handleAddGoal}
        disabled={isLoading}
        testID="add-goal-button"
      >
        <Plus size={24} color="white" />
      </TouchableOpacity>
      
      {isLoading && (
        <View style={styles.syncingIndicator}>
          <Text style={styles.syncingText}>Syncing...</Text>
        </View>
      )}
      
      <GoalCreationModal
        visible={showGoalCreationModal}
        onClose={() => setShowGoalCreationModal(false)}
        onGoalCreated={handleGoalCreated}
      />
    </View>
  );
}