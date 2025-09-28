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
} from 'react-native';
import { X, Send, Bot } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useGoals } from '@/providers/GoalsProvider';
import { aiService } from '@/lib/ai-service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GoalData {
  baseline?: {
    weight?: number;
    height?: number;
    oneRepMax?: Record<string, number>;
    currentFitness?: string;
  };
  availability?: {
    daysPerWeek?: number;
    timeSlots?: string[];
    duration?: number;
  };
  timeline?: {
    targetDate?: string;
    urgency?: 'low' | 'medium' | 'high';
  };
  goalType?: string;
  specificGoal?: string;
}

interface GoalCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onGoalCreated: (goal: any) => void;
  editingGoal?: any; // Goal being edited
}

const CONVERSATION_STAGES = {
  INITIAL: 'initial',
  GOAL_TYPE: 'goal_type',
  BASELINE: 'baseline',
  AVAILABILITY: 'availability',
  TIMELINE: 'timeline',
  VALIDATION: 'validation',
  PLAN_GENERATION: 'plan_generation',
  CONFIRMATION: 'confirmation',
} as const;

type ConversationStage = typeof CONVERSATION_STAGES[keyof typeof CONVERSATION_STAGES];

export default function GoalCreationModal({ visible, onClose, onGoalCreated, editingGoal }: GoalCreationModalProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { addGoal } = useGoals();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<ConversationStage>(CONVERSATION_STAGES.INITIAL);
  const [goalData, setGoalData] = useState<GoalData>({});
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);

  // AI service will be used directly

  useEffect(() => {
    if (visible) {
      initializeConversation();
    } else {
      resetConversation();
    }
  }, [visible]);

  const resetConversation = () => {
    setMessages([]);
    setInputText('');
    setIsLoading(false);
    setCurrentStage(CONVERSATION_STAGES.INITIAL);
    setGoalData({});
    setGeneratedPlan(null);
  };

  const initializeConversation = () => {
    if (editingGoal) {
      // Initialize for editing mode
      const editMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I see you want to edit "${editingGoal.title}". Let me help you update your goal and plan.\n\nWhat would you like to change about this goal? You can modify:\n• The goal title or description\n• Your target value or timeline\n• Your weekly schedule\n• The overall plan structure\n\nWhat would you like to update?`,
        timestamp: new Date(),
      };
      setMessages([editMessage]);
      setCurrentStage(CONVERSATION_STAGES.GOAL_TYPE);
      
      // Pre-populate goal data
      setGoalData({
        goalType: editingGoal.title,
        specificGoal: editingGoal.description,
        timeline: {
          targetDate: editingGoal.target_date,
          urgency: 'medium'
        }
      });
    } else {
      // Initialize for creation mode
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Hi! I'm here to help you create a personalized goal and training plan. Let's start by understanding what you want to achieve.\n\nWhat type of goal are you looking to work on? For example:\n• Fitness (strength, endurance, weight loss)\n• Learning (new skill, language, hobby)\n• Health (nutrition, sleep, wellness)\n• Career (skill development, certification)\n• Personal (habits, productivity)",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setCurrentStage(CONVERSATION_STAGES.GOAL_TYPE);
    }
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

  const generateAIResponse = async (userInput: string, stage: ConversationStage) => {
    if (!userInput.trim() || userInput.length > 1000) {
      console.warn('Invalid user input');
      addMessage('assistant', "Please provide a valid response. Your input should be between 1 and 1000 characters.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      let systemPrompt = '';
      const userPrompt = userInput.trim();

      switch (stage) {
        case CONVERSATION_STAGES.GOAL_TYPE:
          systemPrompt = `You are a helpful goal-setting assistant. The user has described their goal type. Acknowledge their goal enthusiastically and ask for more specific details about what they want to achieve. Be encouraging and ask follow-up questions to understand their specific objective. If the goal seems vague, ask for clarification.`;
          break;
          
        case CONVERSATION_STAGES.BASELINE:
          systemPrompt = `You are collecting baseline information for goal planning. Based on the user's goal type, ask relevant baseline questions. For fitness goals, ask about current fitness level, weight, height, experience. For learning goals, ask about current knowledge level. For career goals, ask about current skills. Be specific but not overwhelming - ask 2-3 key questions. Validate that the information makes sense.`;
          break;
          
        case CONVERSATION_STAGES.AVAILABILITY:
          systemPrompt = `You are collecting availability information. Ask about how much time they can dedicate to their goal. For fitness: days per week, session duration. For learning: study time per day/week. For career: practice time. Ask about their schedule preferences and any constraints. Validate that their availability is realistic for their goal.`;
          break;
          
        case CONVERSATION_STAGES.TIMELINE:
          systemPrompt = `You are collecting timeline information. Ask when they want to achieve their goal and why that timeline is important to them. Help them set realistic expectations. If their timeline seems unrealistic, gently suggest adjustments while staying supportive. Consider the complexity of their goal and their availability.`;
          break;
          
        case CONVERSATION_STAGES.VALIDATION:
          systemPrompt = `You are validating the collected information. Review what you've learned about their goal, baseline, availability, and timeline. Point out any potential issues or unrealistic expectations. Ask for confirmation or clarification. Be honest but supportive about what's achievable. If something seems unrealistic, suggest alternatives.`;
          break;
          
        default:
          systemPrompt = `You are a helpful goal-setting assistant. Respond naturally to the user's input and guide them through the goal creation process.`;
      }

      const response = await aiService.generateResponse([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${userPrompt}\n\nCurrent goal data: ${JSON.stringify(goalData)}` }
      ]);

      addMessage('assistant', response.content);
      
      // Don't progress conversation here - let the user respond first
      // The conversation will progress when the user sends their next message
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      addMessage('assistant', "I'm sorry, I encountered an error. Could you please try again?");
    } finally {
      setIsLoading(false);
    }
  };

  const progressConversation = (userInput: string, currentStage: ConversationStage) => {
    if (!userInput.trim()) {
      console.warn('Empty user input in progressConversation');
      return;
    }
    
    console.log('Progressing conversation:', { currentStage, userInput: userInput.substring(0, 50) });
    
    // Update goal data based on user input and current stage
    const updatedGoalData = { ...goalData };
    
    switch (currentStage) {
      case CONVERSATION_STAGES.GOAL_TYPE:
        updatedGoalData.goalType = userInput;
        updatedGoalData.specificGoal = userInput;
        setCurrentStage(CONVERSATION_STAGES.BASELINE);
        console.log('Moved to BASELINE stage');
        break;
        
      case CONVERSATION_STAGES.BASELINE:
        // Parse baseline information from user input
        updatedGoalData.baseline = { 
          ...updatedGoalData.baseline,
          currentFitness: userInput,
          experience: userInput
        };
        setCurrentStage(CONVERSATION_STAGES.AVAILABILITY);
        console.log('Moved to AVAILABILITY stage');
        break;
        
      case CONVERSATION_STAGES.AVAILABILITY:
        // Parse availability information
        updatedGoalData.availability = { 
          ...updatedGoalData.availability,
          daysPerWeek: userInput.includes('2-3') ? 3 : 2,
          duration: 60,
          timeSlots: ['morning', 'afternoon']
        };
        setCurrentStage(CONVERSATION_STAGES.TIMELINE);
        console.log('Moved to TIMELINE stage');
        break;
        
      case CONVERSATION_STAGES.TIMELINE:
        // Parse timeline information
        updatedGoalData.timeline = { 
          ...updatedGoalData.timeline,
          targetDate: userInput.includes('week') ? '1 week' : userInput,
          urgency: 'high'
        };
        setCurrentStage(CONVERSATION_STAGES.VALIDATION);
        console.log('Moved to VALIDATION stage');
        break;
        
      case CONVERSATION_STAGES.VALIDATION:
        setCurrentStage(CONVERSATION_STAGES.PLAN_GENERATION);
        console.log('Moved to PLAN_GENERATION stage');
        generatePlan(updatedGoalData);
        break;
    }
    
    setGoalData(updatedGoalData);
  };

  const generatePlan = async (data: GoalData) => {
    setIsLoading(true);
    
    try {
      const plan = await aiService.generateGoalPlan({
        title: data.goalType || 'My Goal',
        description: data.specificGoal || 'A personal goal I want to achieve',
        baseline: JSON.stringify(data.baseline || {}),
        target: '100',
        timeline: JSON.stringify(data.timeline || {}),
        availability: JSON.stringify(data.availability || {}),
      });

      setGeneratedPlan(plan);
      
      addMessage('assistant', `🎯 **Perfect! I've created your personalized plan:**\n\n**${plan.title}**\n\n${plan.description}\n\n**What's included:**\n• ${plan.milestones?.length || 0} milestone checkpoints\n• Weekly structured activities\n• Personalized tips and recommendations\n• Realistic timeline based on your availability\n\n**Ready to start your journey?** Would you like me to add this goal to your goals list?`);
      
      setCurrentStage(CONVERSATION_STAGES.CONFIRMATION);
      
    } catch (error) {
      console.error('Error generating plan:', error);
      addMessage('assistant', "I encountered an error while creating your plan. Would you like me to try again?");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    addMessage('user', userMessage);

    if (currentStage === CONVERSATION_STAGES.CONFIRMATION) {
      if (userMessage.toLowerCase().includes('yes') || userMessage.toLowerCase().includes('add')) {
        handleConfirmGoal();
      } else {
        addMessage('assistant', "No problem! Would you like me to modify the plan or start over with a different goal?");
      }
    } else {
      await generateAIResponse(userMessage, currentStage);
      // Progress conversation after AI responds
      progressConversation(userMessage, currentStage);
    }
  };

  const handleConfirmGoal = async () => {
    console.log('handleConfirmGoal called:', { generatedPlan: !!generatedPlan, user: !!user, userId: user?.id });
    
    if (generatedPlan && user) {
      try {
        // Generate goal plan with tasks
        const { goal, tasks } = await aiService.generateGoalPlanWithTasks({
          ...goalData,
          title: generatedPlan.title,
          description: generatedPlan.description,
          category: generatedPlan.category || 'personal',
          target: generatedPlan.target || 100,
          unit: generatedPlan.unit || 'points'
        });

        const newGoal = {
          title: goal.title,
          description: goal.description,
          category: goal.category || 'personal',
          target_value: goal.target || 100,
          unit: goal.unit || 'points',
          status: 'active' as const,
          current_value: 0,
          progress_percentage: 0,
          plan: goal,
          user_id: user.id,
        };

        // Add goal to database through GoalsProvider with tasks
        await addGoal(newGoal, tasks);
        
        addMessage('assistant', `Perfect! Your goal has been added with ${tasks?.length || 0} scheduled tasks. You can track your progress and follow your personalized plan. Good luck! 🎯`);
        
        // Call the onGoalCreated callback for any additional UI updates
        onGoalCreated(newGoal);
        
        setTimeout(() => {
          onClose();
        }, 2000);
      } catch (error) {
        console.error('Error creating goal:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          user: user?.id,
          goalData: newGoal
        });
        addMessage('assistant', `Sorry, there was an error creating your goal: ${error.message}. Please try again.`);
      }
    } else {
      console.log('Cannot create goal:', { generatedPlan: !!generatedPlan, user: !!user });
      addMessage('assistant', "Please make sure you're logged in to create a goal.");
    }
  };

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      flex: 1,
      backgroundColor: colors.background,
      marginTop: insets.top,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    closeButton: {
      padding: 8,
    },
    messagesContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    messageContainer: {
      marginVertical: 8,
      maxWidth: '85%',
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    assistantMessage: {
      alignSelf: 'flex-start',
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
    },
    userMessageText: {
      color: 'white',
    },
    assistantMessageText: {
      color: colors.text,
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    messageIcon: {
      marginRight: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingBottom: Math.max(12, insets.bottom),
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      backgroundColor: colors.background,
    },
    textInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginRight: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.card,
      maxHeight: 100,
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginVertical: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    },
    loadingText: {
      color: colors.textSecondary,
      marginLeft: 8,
      fontSize: 16,
    },
    stageIndicator: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    stageText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

  const getStageText = (stage: ConversationStage) => {
    switch (stage) {
      case CONVERSATION_STAGES.GOAL_TYPE:
        return 'Step 1: Defining your goal';
      case CONVERSATION_STAGES.BASELINE:
        return 'Step 2: Understanding your starting point';
      case CONVERSATION_STAGES.AVAILABILITY:
        return 'Step 3: Planning your schedule';
      case CONVERSATION_STAGES.TIMELINE:
        return 'Step 4: Setting your timeline';
      case CONVERSATION_STAGES.VALIDATION:
        return 'Step 5: Validating your plan';
      case CONVERSATION_STAGES.PLAN_GENERATION:
        return 'Step 6: Creating your personalized plan';
      case CONVERSATION_STAGES.CONFIRMATION:
        return 'Step 7: Ready to start!';
      default:
        return 'AI Goal Assistant';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create New Goal</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.stageIndicator}>
            <Text style={styles.stageText}>{getStageText(currentStage)}</Text>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.role === 'user' ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
                ]}
              >
                {message.role === 'assistant' && (
                  <View style={styles.messageHeader}>
                    <Bot size={16} color={colors.primary} style={styles.messageIcon} />
                  </View>
                )}
                <View
                  style={[
                    message.role === 'user' ? styles.userMessage : styles.assistantMessage
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.role === 'user' ? styles.userMessageText : styles.assistantMessageText
                    ]}
                  >
                    {message.content}
                  </Text>
                </View>
              </View>
            ))}

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>AI is thinking...</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your response..."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Send size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}