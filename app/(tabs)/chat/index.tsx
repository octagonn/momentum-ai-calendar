import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ImageBackground,
} from 'react-native';
import { Send, CheckCircle, Sparkles, MessageSquare, Target, Crown, Plus } from 'lucide-react-native';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useUser } from '@/providers/UserProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useNotifications } from '@/providers/NotificationProvider';
import { aiService } from '@/lib/ai-service';
import { ensureUserProfile } from '@/services/goalPlanning';
import { notificationService } from '@/services/notifications';
import { supabase } from '@/lib/supabase-client';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatScreen() {
  const { colors, isDark, isGalaxy } = useTheme();
  const { user } = useAuth();
  const { user: profile } = useUser();
  const { isPremium } = useSubscription();
  const { preferences: notificationPreferences } = useNotifications();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [conversationComplete, setConversationComplete] = useState(false);
  const [goalCreationMode, setGoalCreationMode] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [chatLimit, setChatLimit] = useState(3);

  useEffect(() => {
    initializeConversation();
    loadChatCount();
  }, []);

  const loadChatCount = async () => {
    if (!user) return;
    
    try {
      // Use database function for accurate weekly count
      const { data, error } = await supabase
        .rpc('get_weekly_chat_count', { p_user_id: user.id });

      if (!error && data !== null) {
        setChatCount(data);
        console.log(`Chat usage this week: ${data}/${chatLimit}`);
      } else if (error) {
        console.error('Error loading chat count:', error);
        // Fallback to manual calculation
        await loadChatCountFallback();
      }
    } catch (error) {
      console.error('Error loading chat count:', error);
      await loadChatCountFallback();
    }
  };

  const loadChatCountFallback = async () => {
    if (!user) return;
    
    try {
      // Fallback method: calculate start of week manually
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('chat_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfWeek.toISOString());

      if (!error) {
        setChatCount(count || 0);
      }
    } catch (error) {
      console.error('Error in fallback chat count:', error);
    }
  };

  const incrementChatCount = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('chat_usage')
        .insert({
          user_id: user.id,
          created_at: new Date().toISOString()
        });
      
      setChatCount(prev => prev + 1);
    } catch (error) {
      console.error('Error incrementing chat count:', error);
    }
  };

  const handleNewChat = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Get the last user message if available
    const userMessages = messages.filter(m => m.role === 'user');
    const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

    // Show confirmation dialog with options
    Alert.alert(
      'Start New Chat',
      lastUserMessage 
        ? 'Would you like to start a new conversation?'
        : 'Clear current conversation?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        ...(lastUserMessage ? [{
          text: 'Continue Last Topic',
          onPress: () => {
            resetConversation();
            setInputText(lastUserMessage);
          }
        }] : []),
        {
          text: 'Fresh Start',
          onPress: () => resetConversation(),
          style: 'destructive'
        }
      ]
    );
  };

  const resetConversation = () => {
    setMessages([]);
    setInputText('');
    setIsLoading(false);
    setIsCreating(false);
    setConversationComplete(false);
    setGoalCreationMode(false);
  };

  const initializeConversation = () => {
    // Don't show welcome message initially - let user choose
    setMessages([]);
  };

  const handleStarterButton = (starter: string) => {
    // Check chat limit for non-premium users
    if (!isPremium && chatCount >= chatLimit) {
      Alert.alert(
        'Chat Limit Reached',
        'You\'ve reached your weekly limit of 3 free AI chats. Upgrade to Premium for unlimited access!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/(tabs)/settings') }
        ]
      );
      return;
    }

    setInputText(starter);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleCreateGoalMode = () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'AI Goal Creation is a premium feature. Upgrade to create personalized goals with AI assistance!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/(tabs)/settings') }
        ]
      );
      return;
    }

    setGoalCreationMode(true);
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "🎯 **Goal Creation Mode Activated!**\n\nI'll help you create a personalized goal and training plan. Let's start with the basics:\n\nWhat would you like to achieve? Tell me about your goal in as much detail as you'd like.",
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Scroll to bottom after message is added
    setTimeout(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || isCreating) return;

    // Check chat limit for non-premium users (only at start of conversation)
    if (!isPremium && messages.length === 0) {
      // Double-check with server-side function for accuracy
      try {
        const { data: canChat, error } = await supabase
          .rpc('can_create_chat', { p_user_id: user?.id });
        
        if (error) {
          console.error('Error checking chat limit:', error);
        } else if (!canChat) {
          Alert.alert(
            'Chat Limit Reached',
            `You've reached your weekly limit of ${chatLimit} AI chats. Upgrade to Premium for unlimited access!`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Upgrade', onPress: () => router.push('/(tabs)/settings') }
            ]
          );
          return;
        }
      } catch (error) {
        console.error('Error validating chat limit:', error);
        // Fallback to client-side check
        if (chatCount >= chatLimit) {
          Alert.alert(
            'Chat Limit Reached',
            `You've reached your weekly limit of ${chatLimit} AI chats. Upgrade to Premium for unlimited access!`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Upgrade', onPress: () => router.push('/(tabs)/settings') }
            ]
          );
          return;
        }
      }
    }

    const userMessage = inputText.trim();
    setInputText('');
    addMessage('user', userMessage);

    // Track chat usage for non-premium users (only at start of conversation)
    if (!isPremium && messages.length === 0) {
      await incrementChatCount();
    }

    setIsLoading(true);

    try {
      // Get the conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add the current user message
      conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Call AI service to get response
      const response = await aiService.generateResponse(conversationHistory);
      
      if (response.success && response.message) {
        addMessage('assistant', response.message);
        
        // Check if the AI indicates the conversation is complete AND we're in goal creation mode
        if (goalCreationMode && (
            response.message.includes('GOAL_CREATION_COMPLETE') || 
            response.message.includes('I have all the information I need') ||
            response.message.includes('Let me create your personalized plan'))) {
          setConversationComplete(true);
          await handleGoalCreation(conversationHistory);
        }
      } else {
        addMessage('assistant', 'Sorry, I had trouble processing that. Could you please try again?');
      }
    } catch (error) {
      console.error('Error in AI conversation:', error);
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoalCreation = async (conversationHistory: Array<{role: string, content: string}>) => {
    if (!user) {
      addMessage('assistant', 'Please make sure you\'re logged in to create a goal.');
      return;
    }

    setIsCreating(true);
    addMessage('assistant', 'Perfect! I have all the information I need. Let me create your personalized goal plan...');

    try {
      // Ensure user profile exists
      await ensureUserProfile(supabase, user.id);

      // Call the AI service to create the goal plan from the conversation, with optional user context
      const planResponse = await aiService.createGoalFromConversation(conversationHistory, {
        age: profile?.age ?? null,
        gender: profile?.gender ?? null,
        heightCm: profile?.heightCm ?? null,
        weightKg: profile?.weightKg ?? null,
      });
      
      if (planResponse.success && planResponse.goal && planResponse.tasks) {
        // The database function will automatically assign a color if not provided
        // Store the goal and tasks in the database
        const { data: goal_id, error: rpcError } = await supabase.rpc('create_goal_with_tasks', {
          p_user_id: user.id,
          p_goal: planResponse.goal,
          p_tasks: planResponse.tasks
        });

        if (rpcError) {
          throw new Error(`Failed to create goal: ${rpcError.message}`);
        }

        // Schedule notifications for the tasks
        try {
          // Get user's reminder preference from notification settings
          const reminderMinutes = notificationPreferences.taskReminderMinutes || 15;
          await notificationService.scheduleMultipleTaskNotifications(planResponse.tasks, reminderMinutes);
        } catch (notificationError) {
          console.warn('Failed to schedule notifications:', notificationError);
        }

        addMessage('assistant', `🎉 **Goal Created Successfully!**\n\nYour goal "${planResponse.goal.title}" has been created with ${planResponse.tasks.length} scheduled tasks. You can now track your progress and follow your personalized plan!\n\n✅ Goal added to your goals list\n✅ Tasks scheduled on your calendar\n✅ Notifications set up for reminders\n\nGood luck on your journey! 🚀`);

        // Navigate to goals page after a short delay
        setTimeout(() => {
          router.push('/(tabs)/goals');
        }, 3000);

      } else {
        throw new Error(planResponse.error || 'Failed to create goal plan');
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      addMessage('assistant', `Sorry, I encountered an error while creating your goal: ${error.message}. Please try again.`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (event: any) => {
    if (event.nativeEvent.key === 'Enter' && !event.nativeEvent.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const renderStarterButtons = () => {
    const starters = [
      { icon: MessageSquare, text: "Ask a question", color: colors.primary },
      { icon: Target, text: "Get advice on habits", color: colors.success },
      { icon: Sparkles, text: "Plan my week", color: colors.warning },
    ];

    return (
      <View style={styles.starterContainer}>
          <View style={[styles.welcomeCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)' }]}> 
          <Image source={require('@/assets/images/ai-assistant-icon-1.png')} style={{ width: 120, height: 120 }} resizeMode="contain" />
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>
            AI Chat Assistant
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
            {isPremium 
              ? "Ask me anything or create personalized goals!" 
              : `${chatLimit - chatCount} of ${chatLimit} free chats this week`}
          </Text>
        </View>

        {/* Premium Create Goal Button */}
        {isPremium && (
          <TouchableOpacity
            style={[styles.createGoalButton, { 
              backgroundColor: colors.primary,
              borderColor: colors.primary 
            }]}
            onPress={handleCreateGoalMode}
          >
            <Crown size={20} color={colors.background} />
            <Text style={[styles.createGoalText, { color: colors.background }]}>
              Create Goal with AI
            </Text>
            <Sparkles size={16} color={colors.background} />
          </TouchableOpacity>
        )}

        {/* Conversation Starters */}
        <Text style={[styles.starterLabel, { color: colors.textSecondary }]}>
          Or start with:
        </Text>
        <View style={styles.starterButtons}>
          {starters.map((starter, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.starterButton, { 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
                borderColor: colors.border 
              }]}
              onPress={() => handleStarterButton(starter.text)}
            >
              <starter.icon size={18} color={starter.color} />
              <Text style={[styles.starterButtonText, { color: colors.text }]}>
                {starter.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    return (
      <View key={message.id} style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}> 
            <Image source={require('@/assets/images/ai-chat-icon.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {renderMarkdownBold(message.content)}
          </Text>
          <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  // Minimal markdown renderer for bold (**text**). Preserves newlines.
  const renderMarkdownBold = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => (
      <React.Fragment key={`ln-${lineIdx}`}>
        {line.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
          const isBold = /^\*\*[^*]+\*\*$/.test(part);
          if (isBold) {
            const inner = part.slice(2, -2);
            return (
              <Text key={`b-${lineIdx}-${idx}`} style={{ fontWeight: '700' }}>
                {inner}
              </Text>
            );
          }
          return <React.Fragment key={`t-${lineIdx}-${idx}`}>{part}</React.Fragment>;
        })}
        {lineIdx < lines.length - 1 ? '\n' : null}
      </React.Fragment>
    ));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isGalaxy && (
        <ImageBackground 
          source={require('@/assets/images/background.png')} 
          style={StyleSheet.absoluteFillObject} 
          resizeMode="cover"
        />
      )}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {goalCreationMode ? 'Create Goal with AI' : 'AI Chat Assistant'}
        </Text>
        {messages.length > 0 && (
          <TouchableOpacity
            style={[styles.newChatButton, { 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
              borderColor: colors.border 
            }]}
            onPress={handleNewChat}
          >
            <Plus size={18} color={colors.primary} />
            <Text style={[styles.newChatButtonText, { color: colors.primary }]}>
              New Chat
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Chat Usage Bar - Only for Free Users */}
      {!isPremium && (
        <View style={styles.progressContainer}>
          <View style={styles.usageHeader}>
            <Text style={[styles.usageTitle, { color: colors.text }]}>
              Weekly AI Chats
            </Text>
            <Text style={[styles.usageCount, { 
              color: chatCount >= chatLimit 
                ? colors.error 
                : chatCount >= 2 
                  ? colors.warning 
                  : colors.primary 
            }]}>
              {chatCount} / {chatLimit}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: chatCount >= chatLimit 
                    ? colors.error 
                    : chatCount >= 2 
                      ? colors.warning 
                      : colors.success,
                  width: `${Math.min((chatCount / chatLimit) * 100, 100)}%`
                }
              ]} 
            />
          </View>
          <View style={styles.usageFooter}>
            <Text style={[styles.usageSubtext, { color: colors.textSecondary }]}>
              {chatCount >= chatLimit 
                ? '⚠️ Limit reached this week'
                : `${chatLimit - chatCount} chat${chatLimit - chatCount !== 1 ? 's' : ''} remaining`
              }
            </Text>
            {chatCount >= 2 && (
              <TouchableOpacity 
                style={[styles.miniUpgradeButton, { 
                  backgroundColor: colors.primary,
                  opacity: 0.9 
                }]}
                onPress={() => router.push('/(tabs)/settings')}
              >
                <Crown size={12} color={colors.background} />
                <Text style={[styles.miniUpgradeText, { color: colors.background }]}>
                  Upgrade
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      
      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? renderStarterButtons() : messages.map(renderMessage)}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              AI is thinking...
                </Text>
              </View>
        )}
        </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
          <TextInput
          style={[styles.textInput, { 
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)', 
            color: colors.text,
            borderColor: colors.border 
          }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
          editable={!isLoading && !isCreating}
          onSubmitEditing={handleKeyPress}
        />
          <TouchableOpacity
            style={[
              styles.sendButton,
            { 
              backgroundColor: inputText.trim() ? colors.primary : colors.border,
              opacity: (isLoading || isCreating || !inputText.trim()) ? 0.5 : 1
            }
          ]}
          onPress={handleSendMessage}
          disabled={isLoading || isCreating || !inputText.trim()}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Send size={20} color={colors.background} />
          )}
          </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newChatButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  usageCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  usageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  usageSubtext: {
    fontSize: 11,
    flex: 1,
  },
  miniUpgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  miniUpgradeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    marginLeft: 'auto',
  },
  assistantBubble: {
    backgroundColor: '#F2F2F7',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  assistantText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  userTimestamp: {
    color: 'white',
    textAlign: 'right',
  },
  assistantTimestamp: {
    color: '#666',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeCard: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 20,
    marginBottom: 30,
    width: '100%',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  createGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createGoalText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  starterLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  starterButtons: {
    width: '100%',
    gap: 12,
  },
  starterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  starterButtonText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
});