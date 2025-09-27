import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Menu } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/providers/ThemeProvider";


export function AppHeader() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  


  const styles = StyleSheet.create({
    container: {
      backgroundColor: isDark ? '#1a1a2e' : colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingTop: insets.top,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      zIndex: 100,
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    logoSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    logo: {
      width: 36,
      height: 36,
      borderRadius: 10,
      shadowColor: 'rgba(0, 0, 0, 0.3)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    logoInner: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 18,

      textShadowColor: 'rgba(0, 0, 0, 0.2)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    title: {
      fontSize: 24,
      fontWeight: "700" as const,

      color: "#ffffff",
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 3,
      letterSpacing: 0.5,
      backgroundColor: 'transparent',
    },
    menuButton: {
      padding: 10,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border,
      shadowColor: 'rgba(0, 0, 0, 0.2)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoSection}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logo}
          >
            <View style={styles.logoInner}>
              <Text style={styles.logoText}>M</Text>
            </View>
          </LinearGradient>
          <Text style={styles.title}>Momentum</Text>
        </View>
        
        <TouchableOpacity style={styles.menuButton} activeOpacity={0.7}>
          <Menu size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}