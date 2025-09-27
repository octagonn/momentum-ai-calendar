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
// Enhanced AI text generation function with better prompts and validation
const generateText = async ({ messages }: { messages: Array<{ role: string; content: string }> }) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const lastMessage = messages[messages.length - 1];
  const content = lastMessage.content.toLowerCase();
  
  // Enhanced responses with better prompts and validation
  if (content.includes('goal type') || content.includes('fitness') || content.includes('learning') || content.includes('health') || content.includes('career') || content.includes('personal')) {
    return "That sounds like an excellent goal! I'm excited to help you create a personalized plan. To make this as effective as possible, I need to understand your starting point.\n\n**What's your current level with this goal?** For example:\n• If it's fitness: What's your current fitness level, any injuries, or previous experience?\n• If it's learning: What do you already know about this topic?\n• If it's health: What's your current health status?\n• If it's career: What's your current skill level in this area?\n\nThis will help me create a plan that's perfectly tailored to where you are right now.";
  } else if (content.includes('baseline') || content.includes('current') || content.includes('starting') || content.includes('level')) {
    return "Perfect! That gives me a great foundation to work with. Now let's talk about your schedule and availability.\n\n**How much time can you realistically dedicate to this goal each week?** Please consider:\n• How many days per week can you work on this?\n• How long can each session be? (15 minutes, 30 minutes, 1 hour, etc.)\n• What time of day works best for you?\n• Are there any days that are completely off-limits?\n\nI want to make sure we create a plan that fits your lifestyle, not the other way around!";
  } else if (content.includes('availability') || content.includes('schedule') || content.includes('time') || content.includes('days')) {
    return "Excellent! I can see you're being realistic about your time commitments. Now for the final piece of the puzzle - your timeline.\n\n**When would you like to achieve this goal?** Please consider:\n• What's your target date? (be specific if possible)\n• Why is this timeline important to you?\n• Is this deadline flexible or fixed?\n• What would happen if you achieved it a bit earlier or later?\n\nI'll help you determine if this timeline is realistic based on your availability and goal complexity. If needed, I can suggest adjustments to make it more achievable.";
  } else if (content.includes('timeline') || content.includes('when') || content.includes('deadline') || content.includes('date')) {
    // Add validation logic here
    const timelineValidation = validateTimeline(content);
    if (timelineValidation.isUnrealistic) {
      return `I appreciate your ambition! However, I want to make sure we set you up for success. ${timelineValidation.message}\n\n**Let me suggest a more realistic timeline:**\n${timelineValidation.suggestion}\n\n**Would you like to adjust your timeline, or would you prefer to break this into smaller, more achievable goals?**\n\nRemember, it's better to achieve a smaller goal consistently than to struggle with an unrealistic one. What do you think?`;
    }
    
    return "That's a great timeline! I can see you've thought this through carefully. Let me create a personalized plan that will help you achieve this goal within your timeframe.\n\n**I'm now generating your custom plan based on:**\n• Your goal type and current level\n• Your available time and schedule\n• Your target timeline\n• Best practices for this type of goal\n\nThis will include weekly milestones, specific activities, and personalized tips to keep you motivated. Give me just a moment...";
  } else if (content.includes('plan') || content.includes('generate') || content.includes('create')) {
    return generatePersonalizedPlan(content);
  } else {
    return "I understand! That's helpful information. Let me ask you a few more questions to create the best plan for you.\n\n**To recap where we are:**\n• We've discussed your goal type\n• We've covered your starting point\n• We've talked about your schedule\n• We've set your timeline\n\n**Is there anything else I should know about your situation, preferences, or any challenges you anticipate?** The more I understand, the better I can tailor your plan.";
  }
};

// Validation logic for unrealistic timelines
const validateTimeline = (content: string) => {
  const timeKeywords = {
    '1 week': 7,
    '2 weeks': 14,
    '1 month': 30,
    '2 months': 60,
    '3 months': 90,
    '6 months': 180,
    '1 year': 365
  };
  
  const goalKeywords = {
    'lose 50 pounds': 180,
    'lose 30 pounds': 120,
    'lose 20 pounds': 90,
    'lose 10 pounds': 60,
    'learn spanish': 365,
    'learn french': 365,
    'learn coding': 180,
    'run marathon': 120,
    'build muscle': 180,
    'get fit': 90
  };
  
  // Check for unrealistic combinations
  for (const [goal, minDays] of Object.entries(goalKeywords)) {
    if (content.includes(goal)) {
      for (const [timeframe, days] of Object.entries(timeKeywords)) {
        if (content.includes(timeframe) && days < minDays) {
          return {
            isUnrealistic: true,
            message: `I notice you want to ${goal} in ${timeframe}. While I admire your determination, this timeline might be too aggressive and could lead to burnout or disappointment.`,
            suggestion: `For ${goal}, I'd recommend a timeline of at least ${Math.ceil(minDays / 30)} months to ensure sustainable progress and long-term success.`
          };
        }
      }
    }
  }
  
  return { isUnrealistic: false, message: '', suggestion: '' };
};

// Generate personalized plan based on user input
const generatePersonalizedPlan = (content: string) => {
  // Extract goal type from content
  let goalType = 'general';
  let targetValue = 100;
  let unit = 'points';
  
  if (content.includes('fitness') || content.includes('workout') || content.includes('gym')) {
    goalType = 'fitness';
    targetValue = 30; // days
    unit = 'days';
  } else if (content.includes('learning') || content.includes('study') || content.includes('course')) {
    goalType = 'learning';
    targetValue = 100;
    unit = 'hours';
  } else if (content.includes('weight') || content.includes('lose') || content.includes('pounds')) {
    goalType = 'weight loss';
    targetValue = 20;
    unit = 'pounds';
  } else if (content.includes('language') || content.includes('spanish') || content.includes('french')) {
    goalType = 'language';
    targetValue = 100;
    unit = 'lessons';
  }
  
  const plans = {
    fitness: {
      title: "30-Day Fitness Transformation",
      description: "A structured fitness program designed to build strength, endurance, and healthy habits",
      milestones: [
        { week: 1, target: 5, description: "Establish workout routine and build consistency" },
        { week: 2, target: 10, description: "Increase intensity and add variety" },
        { week: 3, target: 20, description: "Push your limits and see real progress" },
        { week: 4, target: 30, description: "Complete your transformation!" }
      ],
      weeklyPlan: [
        { day: "Monday", activities: ["Upper body strength training", "Cardio warm-up"], duration: "45 minutes" },
        { day: "Wednesday", activities: ["Lower body workout", "Core exercises"], duration: "45 minutes" },
        { day: "Friday", activities: ["Full body HIIT", "Stretching"], duration: "40 minutes" },
        { day: "Sunday", activities: ["Active recovery", "Yoga or walking"], duration: "30 minutes" }
      ],
      tips: [
        "Start each workout with a 5-minute warm-up",
        "Track your workouts to see progress",
        "Stay hydrated and get enough sleep",
        "Listen to your body and rest when needed"
      ]
    },
    learning: {
      title: "100-Hour Learning Journey",
      description: "A comprehensive learning plan to master your chosen subject",
      milestones: [
        { week: 1, target: 10, description: "Build foundation and establish study habits" },
        { week: 2, target: 25, description: "Dive deeper into core concepts" },
        { week: 3, target: 50, description: "Apply knowledge through practice" },
        { week: 4, target: 75, description: "Master advanced topics" },
        { week: 5, target: 100, description: "Complete your learning journey!" }
      ],
      weeklyPlan: [
        { day: "Monday", activities: ["Theory study", "Note-taking"], duration: "2 hours" },
        { day: "Wednesday", activities: ["Practical exercises", "Problem solving"], duration: "2 hours" },
        { day: "Friday", activities: ["Review and practice", "Project work"], duration: "2 hours" },
        { day: "Sunday", activities: ["Reflection and planning", "Additional reading"], duration: "1 hour" }
      ],
      tips: [
        "Use the Pomodoro technique for focused study sessions",
        "Take breaks every 25-30 minutes",
        "Practice active recall and spaced repetition",
        "Join study groups or find a learning partner"
      ]
    },
    'weight loss': {
      title: "20-Pound Weight Loss Journey",
      description: "A sustainable approach to healthy weight loss through nutrition and exercise",
      milestones: [
        { week: 1, target: 2, description: "Establish healthy eating habits" },
        { week: 2, target: 4, description: "Add regular exercise routine" },
        { week: 3, target: 8, description: "Increase workout intensity" },
        { week: 4, target: 12, description: "Maintain momentum and consistency" },
        { week: 5, target: 16, description: "Push through plateaus" },
        { week: 6, target: 20, description: "Achieve your goal weight!" }
      ],
      weeklyPlan: [
        { day: "Monday", activities: ["Meal prep", "Cardio workout"], duration: "1 hour" },
        { day: "Wednesday", activities: ["Strength training", "Nutrition tracking"], duration: "1 hour" },
        { day: "Friday", activities: ["HIIT workout", "Weekly weigh-in"], duration: "45 minutes" },
        { day: "Sunday", activities: ["Meal planning", "Active recovery"], duration: "30 minutes" }
      ],
      tips: [
        "Track your calories and macros daily",
        "Drink at least 8 glasses of water",
        "Get 7-8 hours of sleep each night",
        "Focus on whole, unprocessed foods"
      ]
    },
    language: {
      title: "100-Lesson Language Mastery",
      description: "A structured approach to learning a new language from beginner to conversational",
      milestones: [
        { week: 1, target: 10, description: "Learn basic vocabulary and pronunciation" },
        { week: 2, target: 25, description: "Master essential phrases and grammar" },
        { week: 3, target: 50, description: "Build conversational skills" },
        { week: 4, target: 75, description: "Practice with native speakers" },
        { week: 5, target: 100, description: "Achieve conversational fluency!" }
      ],
      weeklyPlan: [
        { day: "Monday", activities: ["Vocabulary building", "Pronunciation practice"], duration: "30 minutes" },
        { day: "Wednesday", activities: ["Grammar lessons", "Writing exercises"], duration: "30 minutes" },
        { day: "Friday", activities: ["Speaking practice", "Listening comprehension"], duration: "30 minutes" },
        { day: "Sunday", activities: ["Review and practice", "Cultural immersion"], duration: "30 minutes" }
      ],
      tips: [
        "Practice speaking out loud daily",
        "Use language learning apps consistently",
        "Watch movies or shows in your target language",
        "Find a language exchange partner"
      ]
    }
  };
  
  const plan = plans[goalType as keyof typeof plans] || plans.fitness;
  
  return JSON.stringify({
    ...plan,
    target: targetValue,
    unit: unit
  });
};

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
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<ConversationStage>(CONVERSATION_STAGES.INITIAL);
  const [goalData, setGoalData] = useState<GoalData>({});
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);

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
      id: Date.now().toString(),
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

      const response = await generateText({
        messages: [
          { role: 'user', content: `${systemPrompt}\n\nUser input: ${userPrompt}\n\nCurrent goal data: ${JSON.stringify(goalData)}` }
        ]
      });

      addMessage('assistant', response);
      
      // Progress to next stage based on current stage
      progressConversation(userInput, stage);
      
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
    
    // Update goal data based on user input and current stage
    const updatedGoalData = { ...goalData };
    
    switch (currentStage) {
      case CONVERSATION_STAGES.GOAL_TYPE:
        updatedGoalData.goalType = userInput;
        setCurrentStage(CONVERSATION_STAGES.BASELINE);
        break;
        
      case CONVERSATION_STAGES.BASELINE:
        // Parse baseline information from user input
        updatedGoalData.baseline = { ...updatedGoalData.baseline };
        setCurrentStage(CONVERSATION_STAGES.AVAILABILITY);
        break;
        
      case CONVERSATION_STAGES.AVAILABILITY:
        // Parse availability information
        updatedGoalData.availability = { ...updatedGoalData.availability };
        setCurrentStage(CONVERSATION_STAGES.TIMELINE);
        break;
        
      case CONVERSATION_STAGES.TIMELINE:
        // Parse timeline information
        updatedGoalData.timeline = { ...updatedGoalData.timeline };
        setCurrentStage(CONVERSATION_STAGES.VALIDATION);
        break;
        
      case CONVERSATION_STAGES.VALIDATION:
        setCurrentStage(CONVERSATION_STAGES.PLAN_GENERATION);
        generatePlan(updatedGoalData);
        break;
    }
    
    setGoalData(updatedGoalData);
  };

  const generatePlan = async (data: GoalData) => {
    setIsLoading(true);
    
    try {
      const planPrompt = `Create a detailed, structured goal plan based on this information:
      
Goal Type: ${data.goalType}
Baseline: ${JSON.stringify(data.baseline)}
Availability: ${JSON.stringify(data.availability)}
Timeline: ${JSON.stringify(data.timeline)}

Generate a JSON response with this structure:
{
  "title": "Specific, actionable goal title",
  "description": "Clear, motivating description of what they'll achieve",
  "target": 100,
  "unit": "points or percentage",
  "milestones": [
    {
      "week": 1,
      "target": 20,
      "description": "Specific milestone description"
    },
    {
      "week": 2,
      "target": 40,
      "description": "Specific milestone description"
    },
    {
      "week": 3,
      "target": 60,
      "description": "Specific milestone description"
    },
    {
      "week": 4,
      "target": 80,
      "description": "Specific milestone description"
    },
    {
      "week": 5,
      "target": 100,
      "description": "Goal completion!"
    }
  ],
  "weeklyPlan": [
    {
      "day": "Monday",
      "activities": ["Specific activity 1", "Specific activity 2"],
      "duration": "30-45 minutes"
    },
    {
      "day": "Wednesday", 
      "activities": ["Specific activity 1", "Specific activity 2"],
      "duration": "30-45 minutes"
    },
    {
      "day": "Friday",
      "activities": ["Assessment", "Plan next week"],
      "duration": "20-30 minutes"
    }
  ],
  "tips": [
    "Stay consistent with your schedule",
    "Track your progress daily",
    "Celebrate small wins along the way",
    "Adjust the plan if needed"
  ],
  "recommendations": [
    "Specific recommendation based on their goal type",
    "Another helpful tip",
    "Motivational advice"
  ]
}

Make it realistic, achievable, and personalized to their situation. Consider their availability and timeline.`;

      const planResponse = await generateText({
        messages: [{ role: 'user', content: planPrompt }]
      });

      try {
        const plan = JSON.parse(planResponse);
        setGeneratedPlan(plan);
        
        addMessage('assistant', `🎯 **Perfect! I've created your personalized plan:**\n\n**${plan.title}**\n\n${plan.description}\n\n**What's included:**\n• ${plan.milestones?.length || 0} milestone checkpoints\n• Weekly structured activities\n• Personalized tips and recommendations\n• Realistic timeline based on your availability\n\n**Ready to start your journey?** Would you like me to add this goal to your goals list?`);
        
        setCurrentStage(CONVERSATION_STAGES.CONFIRMATION);
      } catch (parseError) {
        console.error('Error parsing plan:', parseError);
        addMessage('assistant', "I've created a plan for you, but there was an issue formatting it. Let me try again with a simpler approach.");
      }
      
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
    }
  };

  const handleConfirmGoal = () => {
    if (generatedPlan) {
      const newGoal = {
        id: Date.now().toString(),
        title: generatedPlan.title,
        description: generatedPlan.description,
        current: 0,
        target: generatedPlan.target || 100,
        unit: generatedPlan.unit || 'points',
        status: 'active' as const,
        progress: 0,
        plan: generatedPlan,
      };

      onGoalCreated(newGoal);
      addMessage('assistant', "Perfect! Your goal has been added to your goals list. You can track your progress and follow your personalized plan. Good luck! 🎯");
      
      setTimeout(() => {
        onClose();
      }, 2000);
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