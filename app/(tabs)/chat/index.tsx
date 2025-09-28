import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { Send, Zap, Calendar, Target, TrendingUp, Sparkles, Mic, Image } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/providers/ThemeProvider";
import { Message } from "@/types/chat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { aiService } from "@/lib/ai-service";

export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const scrollViewRef = useRef<ScrollView>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "👋 Hi there! I'm your AI coach and I'm here to help you achieve your goals.\n\n**What would you like to work on today?**\n\nI can help you:\n• Set up new goals and break them into actionable steps\n• Plan your week and organize your tasks\n• Review your progress and suggest improvements\n• Build new habits and routines\n• Overcome obstacles and stay motivated\n\nJust tell me what's on your mind, or use one of the quick actions below to get started!",
      role: "ai",
      timestamp: new Date(),
    },
  ]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);
  
  const quickActions = [
    { icon: Zap, label: "Fitness Goal", prompt: "I want to set a new fitness goal" },
    { icon: Calendar, label: "Plan Week", prompt: "Help me plan my week" },
    { icon: Target, label: "SOS Day", prompt: "I need help organizing my day" },
    { icon: TrendingUp, label: "Progress", prompt: "Review my progress" },
    { icon: Sparkles, label: "New Habit", prompt: "Help me build a new habit" },
  ];

  const sendMessage = async () => {
    if (!input.trim()) return;

    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");

    scrollViewRef.current?.scrollToEnd({ animated: true });

    try {
      // Prepare messages for AI service
      const messagesForAI = [
        ...messages.map(msg => ({ role: msg.role, content: msg.text })),
        { role: "user" as const, content: currentInput }
      ];

      console.log('💬 Chat Debug Info:');
      console.log('- Total messages:', messagesForAI.length);
      console.log('- User input:', currentInput);
      console.log('- All messages:', messagesForAI);
      console.log('- AI Service available:', !!aiService);

      // Call AI service directly
      console.log('🔄 Calling AI service...');
      const response = await aiService.generateResponse(messagesForAI);
      
      console.log('🤖 AI Response received:', response);
      console.log('📝 Response content:', response.content);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.content,
        role: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I encountered an error. Please try again.",
        role: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  const handleQuickAction = useCallback(async (prompt: string) => {
    if (!prompt.trim() || prompt.length > 500) return;
    
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const sanitized = prompt.trim();
    setInput(sanitized);
    console.log(`Quick action selected: ${sanitized}`);
  }, []);

  const handleMicPress = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    console.log('Microphone pressed - voice input');
    // Could implement voice recording functionality
  };

  const handleImagePress = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    console.log('Image pressed - photo/camera input');
    // Could implement image picker functionality
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primary,
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
    backgroundContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
    },
    gradientBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    patternOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.15,
      zIndex: 2,
      overflow: 'hidden',
    },
    gradientOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
      opacity: 0.7,
    },

    messagesContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: Math.max(20, insets.top + 20),
      zIndex: 10,
    },
    messagesCard: {
      backgroundColor: isDark ? 'rgba(20, 20, 40, 0.8)' : 'rgba(255, 255, 255, 0.9)',
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
    messageWrapper: {
      marginBottom: 16,
    },
    messageBubble: {
      maxWidth: "80%",
      padding: 16,
      borderRadius: 20,
    },
    userBubble: {
      alignSelf: "flex-end",
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 2,
    },
    aiBubble: {
      alignSelf: "flex-start",
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.7)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.8)',
    },
    messageText: {
      fontSize: 16,
      lineHeight: 24,
      fontFamily: 'Inter_500Medium',
    },
    userText: {
      color: "white",
      fontWeight: "500" as const,
    },
    aiText: {
      color: colors.text,
      fontWeight: "500" as const,
    },
    timestamp: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 6,
      fontFamily: 'Inter_500Medium',
    },
    userTimestamp: {
      alignSelf: "flex-end",
    },
    aiTimestamp: {
      alignSelf: "flex-start",
    },
    inputContainer: {
      backgroundColor: isDark ? 'rgba(20, 20, 40, 0.8)' : 'rgba(255, 255, 255, 0.9)',
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      paddingTop: 16,
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === "ios" ? 34 : 20,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 10,
    },
    quickActions: {
      flexDirection: "row",
      marginBottom: 16,
    },
    quickActionScroll: {
      paddingVertical: 4,
    },
    quickActionButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.6)',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginRight: 10,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      maxWidth: width * 0.6,
    },
    quickActionText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 8,
      fontFamily: 'Inter_500Medium',
      fontWeight: "500" as const,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.6)',
      borderRadius: 24,
      paddingLeft: 12,
      paddingRight: 4,
      marginBottom: 8,
    },
    inputActions: {
      flexDirection: "row",
      marginBottom: 12,
      justifyContent: "space-around",
      display: 'none', // Hide the original input actions row
    },
    inputActionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    inlineActionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    textInput: {
      flex: 1,
      backgroundColor: 'transparent',
      paddingHorizontal: 8,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      fontFamily: 'Inter_500Medium',
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
      marginLeft: 4,
    },
    sendButtonDisabled: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      shadowOpacity: 0,
      elevation: 0,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.05)']}
          locations={[0, 0.7, 1]}
          style={styles.gradientOverlay}
        />
        <View style={styles.patternOverlay}>
          {/* Simplified pattern overlay */}
          {Array.from({ length: 12 }).map((_, i) => {
            const lineStyle = {
              ...styles.patternLine,
              top: i * 30,
              left: -50 + (i % 3) * 40,
              opacity: 0.1,
              width: 150,
            };
            return <View key={`pattern-${i}`} style={lineStyle} />;
          })}
          {Array.from({ length: 6 }).map((_, i) => {
            const circleStyle = {
              ...styles.patternCircle,
              width: 50,
              height: 50,
              top: 30 + (i * 60),
              right: 10 + (i % 3) * 40,
              opacity: 0.08,
            };
            return <View key={`circle-${i}`} style={circleStyle} />;
          })}
          {/* Simplified dots pattern */}
          {Array.from({ length: 20 }).map((_, i) => {
            const dotStyle = {
              ...styles.patternDot,
              top: 20 + (i % 10) * 40,
              left: 20 + Math.floor(i / 10) * 200,
              opacity: 0.12,
            };
            return <View key={`dot-${i}`} style={dotStyle} />;
          })}
        </View>
      </View>
      
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.messagesCard}>
          {messages.map((message) => (
            <Animated.View
              key={message.id}
              style={[
                styles.messageWrapper,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
              testID={`message-${message.id}`}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.role === "user" ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.role === "user" ? styles.userText : styles.aiText,
                  ]}
                >
                  {message.text}
                </Text>
              </View>
              <Text
                style={[
                  styles.timestamp,
                  message.role === "user" ? styles.userTimestamp : styles.aiTimestamp,
                ]}
              >
                {formatTime(message.timestamp)}
              </Text>
            </Animated.View>
          ))}
        </View>
      </Animated.ScrollView>

      <View style={styles.inputContainer}>
        <View style={styles.inputActions}>
          <TouchableOpacity 
            style={styles.inputActionButton} 
            activeOpacity={0.7}
            onPress={handleMicPress}
            testID="mic-button-top"
          >
            <Mic size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.inputActionButton} 
            activeOpacity={0.7}
            onPress={handleImagePress}
            testID="image-button-top"
          >
            <Image size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickActions}
          contentContainerStyle={styles.quickActionScroll}
        >
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickActionButton}
              onPress={() => handleQuickAction(action.prompt)}
              activeOpacity={0.7}
              testID={`quick-action-${action.label}`}
            >
              <action.icon size={18} color={colors.textSecondary} />
              <Text style={styles.quickActionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TouchableOpacity 
            style={styles.inlineActionButton} 
            activeOpacity={0.7}
            onPress={handleMicPress}
            testID="mic-button-inline"
          >
            <Mic size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Tell me about your goals..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            testID="chat-input"
          />
          <TouchableOpacity 
            style={styles.inlineActionButton} 
            activeOpacity={0.7}
            onPress={handleImagePress}
            testID="image-button-inline"
          >
            <Image size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sendButton,
              !input.trim() && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!input.trim()}
            activeOpacity={0.7}
            testID="send-button"
          >
            <Send size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}