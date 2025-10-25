import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Send, Bot, CheckCircle, Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useUser } from '../../providers/UserProvider';
import { useSubscription } from '../../providers/SubscriptionProvider';
import { useNotifications } from '../../providers/NotificationProvider';
import { aiService } from '../../lib/ai-service';
import { ensureUserProfile } from '../../services/goalPlanning';
import { notificationService } from '../../services/notifications';
import { supabase } from '../../lib/supabase-client';
import { featureGate, Feature } from '../../services/featureGate';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIGoalCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onGoalCreated: (goal: any) => void;
}

export default function AIGoalCreationModal({ visible, onClose, onGoalCreated }: AIGoalCreationModalProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { user: userProfile } = useUser();
  const { isPremium, showUpgradeModal } = useSubscription();
  const { preferences: notificationPreferences } = useNotifications();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [conversationComplete, setConversationComplete] = useState(false);
  const [isPremiumRequired, setIsPremiumRequired] = useState(false);

  useEffect(() => {
    if (visible) {
      checkPremiumAccess();
      initializeConversation();
    } else {
      resetConversation();
    }
  }, [visible]);

  // Re-check premium access when isPremium changes (e.g., after mock purchase)
  useEffect(() => {
    if (visible) {
      checkPremiumAccess();
    }
  }, [isPremium, visible]);

  const resetConversation = () => {
    setMessages([]);
    setInputText('');
    setIsLoading(false);
    setIsCreating(false);
    setConversationComplete(false);
    setIsPremiumRequired(false);
  };
  
  const checkPremiumAccess = async () => {
    if (!user) return;
    
    try {
      await featureGate.initialize(user.id);
      const featureCheck = await featureGate.canAccessFeature(Feature.AI_GOAL_CREATION);
      
      if (!featureCheck.hasAccess) {
        setIsPremiumRequired(true);
      } else {
        setIsPremiumRequired(false);
      }
    } catch (error) {
      console.error('Error checking premium access:', error);
    }
  };

  const initializeConversation = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "Hi! I'm here to help you create a personalized goal and training plan. Tell me about what you want to achieve - what's your goal?",
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

    const userMessage = inputText.trim();
    setInputText('');
    addMessage('user', userMessage);

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

      // Call AI service to get response with optional onboarding context
      const response = await aiService.generateResponse(conversationHistory, {
        age: userProfile?.age ?? null,
        gender: userProfile?.gender ?? null,
        heightCm: userProfile?.heightCm ?? null,
        weightKg: userProfile?.weightKg ?? null,
        unitSystem: userProfile?.unitSystem ?? null,
        dateOfBirth: userProfile?.dateOfBirth ?? null,
      });
      
      if (response.success && response.message) {
        addMessage('assistant', response.message);
        
        // Check if the AI indicates the conversation is complete
        if (response.message.includes('GOAL_CREATION_COMPLETE') || 
            response.message.includes('I have all the information I need') ||
            response.message.includes('Let me create your personalized plan')) {
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

      // Call the AI service to create the goal plan from the conversation with optional onboarding context
      const planResponse = await aiService.createGoalFromConversation(conversationHistory, {
        age: userProfile?.age ?? null,
        gender: userProfile?.gender ?? null,
        heightCm: userProfile?.heightCm ?? null,
        weightKg: userProfile?.weightKg ?? null,
        unitSystem: userProfile?.unitSystem ?? null,
        dateOfBirth: userProfile?.dateOfBirth ?? null,
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

        // Call the callback to refresh the goals list
        if (onGoalCreated) {
          onGoalCreated({ id: goal_id, ...planResponse.goal });
        }

        // Close the modal after a short delay
        setTimeout(() => {
          onClose();
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

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    return (
      <View key={message.id} style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Bot size={16} color={colors.background} />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {message.content}
          </Text>
          <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Create Goal with AI
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Premium Gate Overlay */}
        {isPremiumRequired && (
          <View style={[styles.premiumOverlay, { backgroundColor: colors.background }]}>
            <View style={styles.premiumContent}>
              <View style={[styles.premiumIconContainer, { backgroundColor: colors.primary }]}>
                <Lock size={48} color={colors.background} />
              </View>
              <Text style={[styles.premiumTitle, { color: colors.text }]}>
                AI Goal Creation is a Premium Feature
              </Text>
              <Text style={[styles.premiumDescription, { color: colors.textSecondary }]}>
                Let AI help you create personalized goals with smart scheduling, intelligent task breakdown, and progress tracking.
              </Text>
              <View style={styles.premiumBenefits}>
                <Text style={[styles.benefitItem, { color: colors.text }]}>✓ AI-powered goal planning</Text>
                <Text style={[styles.benefitItem, { color: colors.text }]}>✓ Smart task scheduling</Text>
                <Text style={[styles.benefitItem, { color: colors.text }]}>✓ Personalized recommendations</Text>
                <Text style={[styles.benefitItem, { color: colors.text }]}>✓ Progress insights</Text>
              </View>
              <TouchableOpacity 
                style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  onClose();
                  showUpgradeModal('ai_goal');
                }}
              >
                <Text style={[styles.upgradeButtonText, { color: colors.background }]}>
                  Upgrade to Premium
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.dismissButton}
                onPress={onClose}
              >
                <Text style={[styles.dismissButtonText, { color: colors.textSecondary }]}>
                  Maybe Later
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Progress indicator */}
        <View style={[styles.progressContainer, isPremiumRequired && styles.hidden]}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: conversationComplete ? colors.success : colors.primary,
                  width: conversationComplete ? '100%' : '33%'
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {conversationComplete ? 'Creating your plan...' : '33% Complete'}
          </Text>
        </View>

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={[styles.messagesContainer, isPremiumRequired && styles.hidden]}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
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
        <View style={[styles.inputContainer, { borderTopColor: colors.border }, isPremiumRequired && styles.hidden]}>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: colors.surface, 
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
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
  hidden: {
    display: 'none',
  },
  premiumOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  premiumContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    paddingVertical: 40,
  },
  premiumIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  premiumDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  premiumBenefits: {
    width: '100%',
    marginBottom: 32,
  },
  benefitItem: {
    fontSize: 16,
    lineHeight: 28,
    marginBottom: 8,
  },
  upgradeButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  dismissButton: {
    paddingVertical: 12,
  },
  dismissButtonText: {
    fontSize: 16,
  },
});