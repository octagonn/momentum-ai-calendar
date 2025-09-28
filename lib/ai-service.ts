import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

class AIService {
  private model: any;
  private conversationState: Map<string, string> = new Map();

  constructor() {
    console.log('🔧 AI Service Constructor Debug:');
    console.log('- EXPO_PUBLIC_GEMINI_API_KEY:', process.env.EXPO_PUBLIC_GEMINI_API_KEY ? 'SET' : 'NOT SET');
    console.log('- API Key length:', process.env.EXPO_PUBLIC_GEMINI_API_KEY?.length || 0);
    
    try {
      this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      console.log('✅ Gemini model initialized successfully');
    } catch (error) {
      console.warn('❌ Gemini AI not initialized:', error);
      this.model = null;
    }
  }

  async generateResponse(messages: ChatMessage[]): Promise<AIResponse> {
    console.log('🤖 AI Service Debug Info:');
    console.log('- Model available:', !!this.model);
    console.log('- API Key available:', !!process.env.EXPO_PUBLIC_GEMINI_API_KEY);
    console.log('- API Key value:', process.env.EXPO_PUBLIC_GEMINI_API_KEY ? 'SET' : 'NOT SET');
    console.log('- Messages received:', messages.length);
    console.log('- Last message:', messages[messages.length - 1]?.content);
    
    // Always try Gemini API first if we have a key
    if (process.env.EXPO_PUBLIC_GEMINI_API_KEY && process.env.EXPO_PUBLIC_GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      console.log('🚀 Attempting Gemini API call...');
      try {
        const response = await this.callGeminiAPI(messages);
        console.log('✅ Gemini API response received');
        return response;
      } catch (error) {
        console.error('❌ Gemini API failed:', error);
        console.log('🔄 Falling back to mock response');
        return this.getMockResponse(messages);
      }
    }
    
    console.log('⚠️ Using mock response (no valid API key)');
    return this.getMockResponse(messages);
  }

  private async callGeminiAPI(messages: ChatMessage[]): Promise<AIResponse> {
    if (!this.model) {
      throw new Error('Gemini model not initialized');
    }

    try {
      // Create a system prompt to guide the AI's behavior
      const systemPrompt = `You are a helpful AI coach for goal setting and planning. Your role is to:

1. Ask ONE question at a time - never ask multiple questions in a single response
2. Be conversational and friendly
3. Help users create specific, achievable goals
4. Ask follow-up questions to gather necessary information
5. Keep responses concise and focused (1-2 sentences max)
6. If the user gives a short answer, ask a clarifying question to get more details
7. Build on previous answers to create a natural conversation flow

IMPORTANT: Always ask only ONE question per response. Never ask multiple questions like "What is your goal and how much time do you have?" - instead ask "What is your goal?" first, then in the next response ask about time.

Start by asking what type of goal they want to work on (fitness, learning, health, career, or personal). Then ask one follow-up question at a time to gather the information needed to create a personalized plan.`;

      // Convert messages to Gemini format with system prompt
      const chat = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }]
          },
          {
            role: 'model', 
            parts: [{ text: 'I understand! I\'m here to help you create a personalized goal and training plan. Let\'s start by understanding what you want to achieve. What type of goal are you looking to work on? (fitness, learning, health, career, or personal)' }]
          },
          ...messages.slice(0, -1).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          })),
        ],
      });

      const lastMessage = messages[messages.length - 1];
      console.log('📤 Sending to Gemini:', lastMessage.content);
      
      const result = await chat.sendMessage(lastMessage.content);
      const response = await result.response;
      const text = response.text();

      console.log('📥 Gemini response:', text);

      return {
        content: text,
        usage: {
          promptTokens: 0, // Gemini doesn't provide detailed usage in this API
          completionTokens: 0,
          totalTokens: 0,
        }
      };
    } catch (error) {
      console.error('❌ Gemini API call failed:', error);
      throw error;
    }
  }

  private getMockResponse(messages: ChatMessage[]): AIResponse {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content.toLowerCase();
    
    console.log('🎭 Mock Response Debug:');
    console.log('- Content to analyze:', content);
    console.log('- Content length:', content.length);

    // Check if this is the first message
    if (messages.length === 1) {
      response = "Hello! I'm your AI coach and I'm here to help you achieve your goals. What type of goal are you looking to work on? (fitness, learning, health, career, or personal)";
      console.log('🎯 First message - asking for goal type');
    } else if (content.includes('fitness') || content.includes('workout') || content.includes('chest') || content.includes('growth') || content.includes('health')) {
      response = "Great choice! Fitness goals are fantastic. What specific fitness goal would you like to work on?";
      console.log('🎯 Matched: fitness goal');
    } else if (content.includes('money') || content.includes('side gig') || content.includes('gig') || content.includes('income') || content.includes('earn') || content.includes('make money')) {
      response = "Excellent! Let's work on building your side income. What skills do you currently have?";
      console.log('🎯 Matched: money/side gig/income');
    } else if (content.includes('schedule') || content.includes('time') || content.includes('plan')) {
      response = "Great! Let's work on organizing your schedule. What's your current availability like?";
      console.log('🎯 Matched: schedule/time/plan');
    } else if (content.includes('progress') || content.includes('track') || content.includes('review')) {
      response = "I can help you track and review your progress! What specific metrics would you like to focus on?";
      console.log('🎯 Matched: progress/track/review');
    } else if (content.includes('motivation') || content.includes('stuck') || content.includes('difficult')) {
      response = "I understand that challenges can be tough. What specific obstacle are you facing?";
      console.log('🎯 Matched: motivation/stuck/difficult');
    } else if (content.includes('habit') || content.includes('routine') || content.includes('consistency')) {
      response = "Building consistent habits is key to long-term success! What habit would you like to develop?";
      console.log('🎯 Matched: habit/routine/consistency');
    } else if (content.includes('hi') || content.includes('hello') || content.includes('hey')) {
      response = "Hello! I'm your AI coach and I'm here to help you achieve your goals. What type of goal are you looking to work on? (fitness, learning, health, career, or personal)";
      console.log('🎯 Matched: greeting');
    } else {
      response = "That's interesting! Can you tell me more about that?";
      console.log('❌ No specific match found, using default response');
    }

    console.log('✅ Selected response:', response);
    console.log('📊 Response length:', response.length);

    return {
      content: response,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      }
    };
  }

  async generateGoalPlan(goalData: any): Promise<any> {
    const prompt = `Create a detailed goal plan for:
    - Goal: ${goalData.title}
    - Description: ${goalData.description}
    - Current Level: ${goalData.baseline}
    - Target: ${goalData.target}
    - Timeline: ${goalData.timeline}
    - Availability: ${goalData.availability}

    Please provide a structured plan with:
    1. Weekly milestones
    2. Daily activities
    3. Tips and recommendations
    4. Progress tracking suggestions`;

    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are an expert goal-setting coach. Create detailed, actionable plans.' },
      { role: 'user', content: prompt }
    ];

    const response = await this.generateResponse(messages);
    
    // Try to parse as JSON, fallback to structured text
    try {
      return JSON.parse(response.content);
    } catch {
      return {
        title: goalData.title,
        description: goalData.description,
        milestones: [
          { week: 1, target: 25, description: "Get started with the basics" },
          { week: 2, target: 50, description: "Build momentum and consistency" },
          { week: 3, target: 75, description: "Make significant progress" },
          { week: 4, target: 100, description: "Achieve your target!" }
        ],
        weeklyPlan: [
          { day: "Monday", activities: ["Focus session", "Review progress"], duration: "30 minutes" },
          { day: "Wednesday", activities: ["Practice", "Learn new techniques"], duration: "45 minutes" },
          { day: "Friday", activities: ["Assessment", "Plan next week"], duration: "30 minutes" }
        ],
        tips: [
          "Stay consistent with your schedule",
          "Track your progress daily",
          "Celebrate small wins along the way"
        ]
      };
    }
  }

  async generateGoalPlanWithTasks(goalData: any): Promise<{ goal: any; tasks: any[] }> {
    console.log('🎯 Generating goal plan with tasks:', goalData);
    
    const plan = await this.generateGoalPlan(goalData);
    
    // Generate tasks from the plan
    const tasks = this.generateTasksFromPlan(plan, goalData);
    
    return {
      goal: plan,
      tasks: tasks
    };
  }

  private generateTasksFromPlan(plan: any, goalData: any): any[] {
    const tasks = [];
    const startDate = new Date();
    const daysPerWeek = goalData.availability?.daysPerWeek || 3;
    const timeSlots = goalData.availability?.timeSlots || ['morning', 'afternoon'];
    const duration = goalData.availability?.duration || 60;
    
    // Generate tasks for the next 4 weeks
    for (let week = 0; week < 4; week++) {
      for (let day = 0; day < daysPerWeek; day++) {
        const taskDate = new Date(startDate);
        taskDate.setDate(startDate.getDate() + (week * 7) + (day * Math.floor(7 / daysPerWeek)));
        
        const timeSlot = timeSlots[day % timeSlots.length];
        const taskTime = this.getTimeForSlot(timeSlot);
        
        tasks.push({
          title: `${plan.title} - Session ${week * daysPerWeek + day + 1}`,
          description: plan.tasks?.[day % (plan.tasks?.length || 1)]?.description || `Work on ${plan.title}`,
          date: taskDate.toISOString().split('T')[0],
          time: taskTime,
          estimated_duration: duration,
          status: 'pending',
          priority: 'medium',
          category: plan.category || 'personal'
        });
      }
    }
    
    return tasks;
  }

  private getTimeForSlot(slot: string): string {
    const timeMap: { [key: string]: string } = {
      'morning': '08:00',
      'afternoon': '14:00',
      'evening': '18:00',
      'night': '20:00'
    };
    return timeMap[slot] || '09:00';
  }
}

export const aiService = new AIService();
