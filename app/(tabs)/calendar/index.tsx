import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/providers/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ViewType = "month" | "week" | "day" | "year";

export default function CalendarScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const scrollY = useRef(new Animated.Value(0)).current;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState<ViewType>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = async (direction: "prev" | "next") => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const selectDate = async (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(selected);
  };

  const switchCalendarView = async (view: ViewType) => {
    if (!view.trim() || view.length > 10) return;
    
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setSelectedView(view);
    console.log(`Calendar view switched to: ${view}`);
  };

  const handleAddEvent = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    console.log('Add new event pressed');
    // Could navigate to add event screen or open modal
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    const daysInPrevMonth = getDaysInMonth(prevMonth);
    
    const days = [];
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <TouchableOpacity
          key={`prev-${i}`}
          style={[styles.dayCell, styles.otherMonth]}
          disabled
        >
          <Text style={[styles.dayNumber, styles.otherMonthText]}>
            {daysInPrevMonth - i}
          </Text>
        </TouchableOpacity>
      );
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const hasEvent = Math.random() > 0.8;
      
      days.push(
        <TouchableOpacity
          key={`current-${day}`}
          style={[
            styles.dayCell,
            isToday(day) && styles.todayCell,
            isSelected(day) && styles.selectedCell,
          ]}
          onPress={() => selectDate(day, true)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.dayNumber,
              isToday(day) && styles.todayText,
              isSelected(day) && styles.selectedText,
            ]}
          >
            {day}
          </Text>
          {hasEvent && (
            <View style={[styles.eventDot, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>
      );
    }
    
    // Next month days
    const totalCells = days.length;
    const remainingCells = 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
      days.push(
        <TouchableOpacity
          key={`next-${day}`}
          style={[styles.dayCell, styles.otherMonth]}
          disabled
        >
          <Text style={[styles.dayNumber, styles.otherMonthText]}>{day}</Text>
        </TouchableOpacity>
      );
    }
    
    return days;
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
    header: {
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderRadius: 24,
      marginHorizontal: 20,
      marginBottom: 16,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 4,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
    },
    navigationRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    monthNavigation: {
      flexDirection: "row",
      alignItems: "center",
    },
    navButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthTitle: {
      fontSize: 20,
      fontWeight: "600" as const,
      color: colors.text,
      marginHorizontal: 16,
      minWidth: 160,
      textAlign: "center",
    },
    viewSelector: {
      flexDirection: "row",
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 4,
    },
    viewButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    viewButtonActive: {
      backgroundColor: colors.primary,
    },
    viewButtonText: {
      fontSize: 14,
      fontWeight: "500" as const,
      color: colors.textSecondary,
    },
    viewButtonTextActive: {
      color: "white",
    },
    calendarContainer: {
      flex: 1,
      padding: 20,
    },
    weekDays: {
      flexDirection: "row",
      marginBottom: 8,
    },
    weekDayCell: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 8,
    },
    weekDayText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.textSecondary,
    },
    calendarGrid: {
      backgroundColor: colors.card,
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
    daysGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    dayCell: {
      width: "14.28%",
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 4,
    },
    otherMonth: {
      opacity: 0.3,
    },
    todayCell: {
      backgroundColor: `${colors.primary}15`,
      borderRadius: 12,
    },
    selectedCell: {
      backgroundColor: colors.primary,
      borderRadius: 12,
    },
    dayNumber: {
      fontSize: 16,
      fontWeight: "500" as const,
      color: colors.text,
    },
    otherMonthText: {
      color: colors.textMuted,
    },
    todayText: {
      color: colors.primary,
      fontWeight: "700" as const,
    },
    selectedText: {
      color: "white",
      fontWeight: "700" as const,
    },
    eventDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      marginTop: 2,
    },
  });

  return (
    <View style={styles.container} testID="calendar-screen">
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
          <Text style={styles.headerTitle}>Calendar</Text>
          <Text style={styles.headerSubtitle}>Plan your days and track your progress</Text>
        </View>
      </Animated.View>

      <Animated.ScrollView 
        style={styles.calendarContainer} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <View style={styles.navigationRow}>
            <View style={styles.monthNavigation}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateMonth("prev")}
                activeOpacity={0.7}
                testID="prev-month-button"
              >
                <ChevronLeft size={20} color={colors.text} />
              </TouchableOpacity>
              
              <Text style={styles.monthTitle}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
              
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateMonth("next")}
                activeOpacity={0.7}
                testID="next-month-button"
              >
                <ChevronRight size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.viewSelector}>
            {(["month", "week", "day", "year"] as ViewType[]).map((view) => (
              <TouchableOpacity
                key={view}
                style={[
                  styles.viewButton,
                  selectedView === view && styles.viewButtonActive,
                ]}
                onPress={() => switchCalendarView(view)}
                activeOpacity={0.7}
                testID={`view-${view}`}
              >
                <Text
                  style={[
                    styles.viewButtonText,
                    selectedView === view && styles.viewButtonTextActive,
                  ]}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.calendarGrid}>
          <View style={styles.weekDays}>
            {dayNames.map((day) => (
              <View key={day} style={styles.weekDayCell}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.daysGrid}>{renderCalendarDays()}</View>
        </View>
      </Animated.ScrollView>
      
      <TouchableOpacity 
        style={styles.addButton}
        activeOpacity={0.8}
        onPress={handleAddEvent}
        testID="add-event-button"
      >
        <Plus size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}