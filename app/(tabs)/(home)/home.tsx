import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Calendar, Clock, TrendingUp, Award, ChevronRight } from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { useGoals } from "@/providers/GoalsProvider";



export default function HomeScreen() {
  console.log('HomeScreen rendering');
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  console.log('Theme loaded:', { isDark, colors: !!colors });

  const { user } = useUser();
  const { tasks, goals, toggleTask, getTasksStats } = useGoals();
  const stats = getTasksStats();
  
  const [animatedValues] = useState(() => 
    tasks.map(() => new Animated.Value(1))
  );

  const handleToggleTask = async (taskId: string, index: number) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    Animated.sequence([
      Animated.timing(animatedValues[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValues[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    toggleTask(taskId);
  };

  const handleProgressCardPress = async (index: number) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    console.log(`Progress card ${index} pressed`);
    // Navigate to relevant screen based on card type
    switch(index) {
      case 0: // Tasks Complete
        console.log('Navigating to tasks overview');
        break;
      case 1: // Day Streak
        console.log('Showing streak details');
        break;
      case 2: // Weekly Goal
        console.log('Showing weekly progress');
        break;
      case 3: // Goals Active
        router.push('/(tabs)/goals');
        break;
    }
  };

  const handleViewAllTasks = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    console.log('View all tasks pressed');
    // Could navigate to a dedicated tasks screen or show modal
  };

  const handleViewAllGoals = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/(tabs)/goals');
  };

  const handleGoalPress = async (goalId: string) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    console.log(`Goal ${goalId} pressed`);
    router.push('/(tabs)/goals');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const progressCards = [
    { label: "Tasks Complete", value: `${stats.completed}/${stats.total}`, color: colors.primary },
    { label: "Day Streak", value: user.dayStreak.toString(), color: colors.success },
    { label: "Weekly Goal", value: `${stats.weeklyProgress}%`, color: colors.warning },
    { label: "Goals Active", value: user.activeGoals.toString(), color: colors.info },
  ];

  const { width } = Dimensions.get('window');
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });
  
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  const getIconForCard = (index: number) => {
    switch(index) {
      case 0: return <Check size={20} color={colors.primary} />;  
      case 1: return <Calendar size={20} color={colors.success} />;
      case 2: return <TrendingUp size={20} color={colors.warning} />;
      case 3: return <Award size={20} color={colors.info} />;
      default: return null;
    }
  };

  const timeIconStyle = { marginRight: 4 };
  const progressCardIconStyle = (color: string) => ({ backgroundColor: `${color}15` });
  const goalProgressContainerStyle = { height: 6, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', borderRadius: 3 };
  const goalProgressBarStyle = (progress: number, status: string) => ({
    width: `${progress}%`,
    height: '100%',
    backgroundColor: status === 'active' ? colors.success : 
                    status === 'paused' ? colors.warning : 
                    colors.primary,
    borderRadius: 3
  });
  
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
    patternWave: {
      position: 'absolute',
      height: 20,
      width: 100,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: 'white',
      opacity: 0.1,
      transform: [{ scaleX: 2 }],
    },
    patternHexagon: {
      position: 'absolute',
      width: 30,
      height: 30,
      opacity: 0.15,
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
    scrollContent: {
      paddingBottom: 30,
    },
    headerContainer: {
      position: 'relative',
      overflow: 'hidden',
      zIndex: 1,
    },
    headerBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 320,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      zIndex: 1,
      overflow: 'hidden',
    },
    patternOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 320,
      opacity: 0.15,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      zIndex: 2,
      overflow: 'hidden',
    },
    gradientOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 320,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      zIndex: 1,
      opacity: 0.7,
    },
    headerContent: {
      paddingHorizontal: 24,
      paddingTop: Math.max(30, insets.top + 10),
      paddingBottom: 100,
      zIndex: 5,
    },
    greeting: {
      fontSize: 36,
      fontWeight: "700" as const,

      color: '#ffffff',
      marginBottom: 6,
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      letterSpacing: 0.5,
    },
    subtitle: {
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.9)',
      fontWeight: "500" as const,

      letterSpacing: 0.3,
      marginBottom: 4,
    },
    dateContainer: {
      marginTop: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      shadowColor: 'rgba(0, 0, 0, 0.3)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    dateText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: "500" as const,

      marginLeft: 6,
    },
    progressSection: {
      marginTop: -80,
      paddingHorizontal: 20,
      zIndex: 10,
      position: 'relative',
      elevation: 5, // For Android
    },
    progressGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    progressCard: {
      width: width / 2 - 28,
      marginBottom: 16,
      borderRadius: 24,
      padding: 20,
      backgroundColor: colors.card,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
    },
    progressCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    progressCardIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    progressValue: {
      fontSize: 32,
      fontWeight: "700" as const,

      marginBottom: 4,
      letterSpacing: 0.5,
    },
    progressLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500" as const,

    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 30,
      marginBottom: 16,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700" as const,

      color: colors.text,
    },
    viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    viewAllText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "600" as const,
      marginRight: 4,
    },
    taskSection: {
      marginHorizontal: 20,
    },
    taskCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 4,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
    },
    taskHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    },
    taskTitle: {
      fontSize: 18,
      fontWeight: "700" as const,

      color: colors.text,
    },
    taskSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500" as const,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 12,
    },
    taskItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    },
    taskItemLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 8,
      borderWidth: 2,
      marginRight: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxUnchecked: {
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : colors.border,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.background,
    },
    checkboxChecked: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    taskContent: {
      flex: 1,
    },
    taskName: {
      fontSize: 16,
      fontWeight: "600" as const,

      color: colors.text,
      marginBottom: 4,
    },
    taskNameCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    taskTime: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    priorityBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      marginLeft: 8,
    },
    priorityText: {
      fontSize: 12,
      fontWeight: "600" as const,
    },
    priorityHigh: {
      backgroundColor: `${colors.danger}20`,
    },
    priorityMedium: {
      backgroundColor: `${colors.warning}20`,
    },
    priorityLow: {
      backgroundColor: `${colors.success}20`,
    },
    upcomingSection: {
      marginTop: 10,
      paddingHorizontal: 20,
    },
    upcomingCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 4,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
    },
    upcomingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    upcomingIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    upcomingTitle: {
      fontSize: 16,
      fontWeight: "600" as const,

      color: colors.text,
    },
    upcomingSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
  });

  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <View style={styles.container} testID="home-screen">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <Animated.View 
          style={[styles.headerContainer, { 
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslate }] 
          }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerBackground, { height: 320 }]}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.1)']}
            locations={[0, 0.7, 1]}
            style={styles.gradientOverlay}
          />
          <View style={styles.patternOverlay}>
            {/* Pattern overlay with diagonal lines */}
            {Array.from({ length: 18 }).map((_, i) => {
              const lineStyle = {
                ...styles.patternLine,
                top: i * 22,
                left: -50 + (i % 3) * 30,
                opacity: 0.15 + (i % 3) * 0.05,
                width: 180,
              };
              return <View key={`pattern-${i}`} style={lineStyle} />;
            })}
            {Array.from({ length: 8 }).map((_, i) => {
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
            {Array.from({ length: 40 }).map((_, i) => {
              const dotStyle = {
                ...styles.patternDot,
                top: 10 + Math.random() * 240,
                left: 10 + Math.random() * 350,
                opacity: 0.1 + Math.random() * 0.2,
              };
              return <View key={`dot-${i}`} style={dotStyle} />;
            })}
            {/* Add wave pattern */}
            {Array.from({ length: 5 }).map((_, i) => {
              const waveStyle = {
                ...styles.patternWave,
                top: 40 + (i * 50),
                left: -20 + (i % 2) * 100,
                transform: [{ scaleX: 2 }, { rotate: `${(i % 2) * 10}deg` }],
              };
              return <View key={`wave-${i}`} style={waveStyle} />;
            })}
            {/* Add hexagons */}
            {Array.from({ length: 6 }).map((_, i) => {
              const hexStyle = {
                ...styles.patternHexagon,
                top: 30 + Math.random() * 200,
                left: 20 + Math.random() * 300,
                transform: [{ rotate: `${Math.random() * 45}deg` }],
              };
              return <View key={`hex-${i}`} style={hexStyle} />;
            })}
            {/* Add triangles */}
            {Array.from({ length: 8 }).map((_, i) => {
              const triangleStyle = {
                ...styles.patternTriangle,
                top: 20 + Math.random() * 220,
                left: 30 + Math.random() * 320,
                transform: [{ rotate: `${Math.random() * 180}deg` }],
              };
              return <View key={`triangle-${i}`} style={triangleStyle} />;
            })}
            {/* Add squares */}
            {Array.from({ length: 10 }).map((_, i) => {
              const squareStyle = {
                ...styles.patternSquare,
                top: 15 + Math.random() * 230,
                left: 15 + Math.random() * 330,
              };
              return <View key={`square-${i}`} style={squareStyle} />;
            })}
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>
              {getGreeting()}, {user.name.split(" ")[0]}!
            </Text>
            <Text style={styles.subtitle}>Ready to crush your goals today?</Text>
            <View style={styles.dateContainer}>
              <Calendar size={16} color="#ffffff" />
              <Text style={styles.dateText}>{formatDate()}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.progressSection}>
          <View style={styles.progressGrid}>
            {progressCards.map((card, index) => (
              <TouchableOpacity
                key={`progress-${index}`}
                style={styles.progressCard}
                activeOpacity={0.7}
                onPress={() => handleProgressCardPress(index)}
                testID={`progress-card-${index}`}
              >
                <View style={styles.progressCardHeader}>
                  <View style={[styles.progressCardIcon, progressCardIconStyle(card.color)]}>
                    {getIconForCard(index)}
                  </View>
                </View>
                <Text style={[styles.progressValue, { color: card.color }]}>
                  {card.value}
                </Text>
                <Text style={styles.progressLabel}>{card.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>
          <TouchableOpacity 
            style={styles.viewAllButton} 
            activeOpacity={0.7}
            onPress={handleViewAllTasks}
            testID="view-all-tasks-button"
          >
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.taskSection}>
          <View style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>Priority Tasks</Text>
              <Text style={styles.taskSubtitle}>
                {stats.total - stats.completed} remaining
              </Text>
            </View>

            {tasks.map((task, index) => (
              <Animated.View
                key={task.id}
                style={[
                  styles.taskItem,
                  index === tasks.length - 1 && styles.taskItemLast,
                  { transform: [{ scale: animatedValues[index] }] },
                ]}
                testID={`task-item-${index}`}
              >
                <TouchableOpacity
                  onPress={() => handleToggleTask(task.id, index)}
                  style={[
                    styles.checkbox,
                    task.completed ? styles.checkboxChecked : styles.checkboxUnchecked,
                  ]}
                  testID={`task-checkbox-${index}`}
                >
                  {task.completed && <Check size={16} color="white" />}
                </TouchableOpacity>

                <View style={styles.taskContent}>
                  <Text
                    style={[
                      styles.taskName,
                      task.completed && styles.taskNameCompleted,
                    ]}
                  >
                    {task.title}
                  </Text>
                  <View style={styles.timeContainer}>
                    <Clock size={12} color={colors.textSecondary} style={timeIconStyle} />
                    <Text style={styles.taskTime}>{task.time}</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.priorityBadge,
                    task.priority === "high" && styles.priorityHigh,
                    task.priority === "medium" && styles.priorityMedium,
                    task.priority === "low" && styles.priorityLow,
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      {
                        color:
                          task.priority === "high"
                            ? colors.danger
                            : task.priority === "medium"
                            ? colors.warning
                            : colors.success,
                      },
                    ]}
                  >
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Goals</Text>
          <TouchableOpacity 
            style={styles.viewAllButton} 
            activeOpacity={0.7}
            onPress={handleViewAllGoals}
            testID="view-all-goals-button"
          >
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.upcomingSection}>
          {goals.slice(0, 2).map((goal, index) => (
            <TouchableOpacity 
              key={`goal-${index}`} 
              style={styles.upcomingCard}
              activeOpacity={0.7}
              onPress={() => handleGoalPress(goal.id)}
              testID={`upcoming-goal-${index}`}
            >
              <View style={styles.upcomingHeader}>
                <View 
                  style={[
                    styles.upcomingIcon, 
                    { backgroundColor: goal.status === 'active' ? `${colors.success}15` : 
                                      goal.status === 'paused' ? `${colors.warning}15` : 
                                      `${colors.primary}15` }
                  ]}
                >
                  <TrendingUp 
                    size={20} 
                    color={goal.status === 'active' ? colors.success : 
                           goal.status === 'paused' ? colors.warning : 
                           colors.primary} 
                  />
                </View>
                <View>
                  <Text style={styles.upcomingTitle}>{goal.title}</Text>
                  <Text style={styles.upcomingSubtitle}>{goal.description}</Text>
                </View>
              </View>
              <View style={goalProgressContainerStyle}>
                <View 
                  style={goalProgressBarStyle(goal.progress, goal.status)}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.ScrollView>
    </View>
  );
}