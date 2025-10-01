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

  async generateResponse(messages: ChatMessage[]): Promise<{success: boolean, message: string}> {
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
        return { success: true, message: response.content };
      } catch (error: any) {
        console.error('❌ Gemini API failed:', error);
        console.error('Error details:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name
        });
        console.log('🔄 Falling back to mock response');
        const mockResponse = this.getMockResponse(messages);
        return { success: true, message: mockResponse.content };
      }
    }
    
    console.log('⚠️ Using mock response (no valid API key)');
    const mockResponse = this.getMockResponse(messages);
    return { success: true, message: mockResponse.content };
  }

  private async callGeminiAPI(messages: ChatMessage[]): Promise<AIResponse> {
    if (!this.model) {
      throw new Error('Gemini model not initialized');
    }

    try {
      // Create a system prompt to guide the AI's behavior
      const systemPrompt = `You are a helpful AI coach for goal setting and planning. Your role is to:

          **CRITICAL RULE: Ask ONLY ONE question at a time. Never ask multiple questions in a single response.**

          1. Be conversational, friendly, and encouraging
          2. Help users create specific, achievable goals
          3. Ask ONE follow-up question per response based on what they share
          4. Keep responses concise and focused (1-2 sentences max)
          5. Build on previous answers to create a natural conversation flow
          6. When you have enough information to create a plan, say "I have all the information I need to create your personalized plan. Let me put together a structured goal and training schedule for you."

          Information you need to gather (ask ONE at a time):
          - What is their specific goal?
          - When do they want to achieve it?
          - How much time can they commit per week?
          - What days work best for them? (Be very specific - ask for exact days like "Tuesdays, Thursdays, Saturdays" or "weekdays")
          - What time of day works best?
          - Any specific preferences or constraints?

          **IMPORTANT: When asking about days, be very specific. Ask for exact days of the week (e.g., "What days of the week work best for you? For example, Tuesdays and Thursdays, or weekdays, or weekends?"). This is crucial for proper scheduling.**

          **REMEMBER: Always ask only ONE question per response. Never combine questions like "What is your goal and when do you want to achieve it?" - instead ask "What is your goal?" first, then in the next response ask about timing.**`;

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
    } catch (error: any) {
      console.error('❌ Gemini API call failed:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      throw error;
    }
  }

  private getMockResponse(messages: ChatMessage[]): AIResponse {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content.toLowerCase();
    
    console.log('🎭 Mock Response Debug:');
    console.log('- Content to analyze:', content);
    console.log('- Content length:', content.length);

    let response: string;

    // Check if this is the first message
    if (messages.length === 1) {
      response = "Hello! I'm your AI coach and I'm here to help you achieve your goals. What type of goal are you looking to work on? (fitness, learning, health, career, or personal)";
      console.log('🎯 First message - asking for goal type');
    } else if (content.includes('fitness') || content.includes('workout') || content.includes('chest') || content.includes('growth') || content.includes('health')) {
      response = "Great choice! Fitness goals are fantastic. What specific fitness goal would you like to work on?";
      console.log('🎯 Matched: fitness goal');
    } else if (content.includes('money') || content.includes('side gig') || content.includes('gig') || content.includes('income') || content.includes('earn') || content.includes('make money') || content.includes('$5k') || content.includes('5000')) {
      response = "Excellent! Making $5k in a month is an ambitious goal. What skills do you currently have that we could leverage?";
      console.log('🎯 Matched: money/side gig/income');
    } else if (content.includes('tech skills') || content.includes('technology') || content.includes('programming') || content.includes('coding')) {
      response = "Great! Tech skills are in high demand. What specific tech skills do you have? (e.g., web development, mobile apps, data analysis, etc.)";
      console.log('🎯 Matched: tech skills');
    } else if (content.includes('not sure') || content.includes('need your input') || content.includes('help me decide')) {
      response = "No problem! Let me help you figure this out. What are you naturally good at or enjoy doing?";
      console.log('🎯 Matched: not sure/need help');
    } else if (content.includes('schedule') || content.includes('time') || content.includes('plan') || content.includes('calendar')) {
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
    } else if (content.includes('just make me a schedule') || content.includes('make me a schedule') || content.includes('create a schedule') || content.includes('add to my calendar')) {
      response = "Perfect! I can help you create a schedule and add it to your goals. Let me gather a few details to create a personalized plan for your $5k goal.";
      console.log('🎯 Matched: create schedule request');
    } else if (content.includes('get 5k') || content.includes('make 5k') || content.includes('earn 5k') || content.includes('$5k') || content.includes('5000')) {
      response = "Got it! $5k in one month is your target. To create an effective plan, how many hours per week can you dedicate to working on EasyUpkeep?";
      console.log('🎯 Matched: 5k goal confirmation');
    } else if (content.includes('its simple') || content.includes('nothing to tell') || content.includes('simple') || content.includes('straightforward')) {
      response = "I understand! Let's keep it simple. How many hours per week can you work on EasyUpkeep to reach your $5k goal?";
      console.log('🎯 Matched: simple/straightforward response');
    } else if (content.includes('hi') || content.includes('hello') || content.includes('hey')) {
      response = "Hello! I'm your AI coach and I'm here to help you achieve your goals. What type of goal are you looking to work on? (fitness, learning, health, career, or personal)";
      console.log('🎯 Matched: greeting');
    } else {
      response = "I understand! Let me help you create a plan. What's your current situation with this goal?";
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
      return JSON.parse(response.message);
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
    
    // For fitness goals, use the weekly plan structure
    if (plan.weeklyPlan && plan.weeklyPlan.length > 0) {
      // Determine if this is a money-making goal or fitness goal
      const isMoneyGoal = plan.category === 'career' || plan.unit === '$';
      const totalWeeks = isMoneyGoal ? 4 : 8; // 4 weeks for money goals, 8 weeks for fitness
      
      // Generate tasks for the appropriate number of weeks
      for (let week = 0; week < totalWeeks; week++) {
        plan.weeklyPlan.forEach((session: any, dayIndex: number) => {
          const taskDate = new Date(startDate);
          
          if (isMoneyGoal) {
            // For money goals: Monday, Wednesday, Friday
            taskDate.setDate(startDate.getDate() + (week * 7) + (dayIndex * 2));
          } else {
            // For fitness goals: Tuesday, Thursday, Saturday
            taskDate.setDate(startDate.getDate() + (week * 7) + (dayIndex * 2) + 1);
          }
          
          const activities = session.activities.join('\n• ');
          const weekNumber = week + 1;
          const targetValue = plan.milestones?.[week]?.target || (isMoneyGoal ? (500 + (week * 1000)) : (185 + (week * 5)));
          const unit = plan.unit || (isMoneyGoal ? '$' : 'lbs');
          
          tasks.push({
            title: `${plan.title} - Week ${weekNumber} ${session.day}`,
            description: `Week ${weekNumber} ${session.day} ${isMoneyGoal ? 'Work Session' : 'Workout'}:\n• ${activities}\n\nTarget: ${targetValue}${unit}`,
            date: taskDate.toISOString().split('T')[0],
            time: isMoneyGoal ? '09:00' : '18:00', // 9 AM for work, 6 PM for fitness
            estimated_duration: isMoneyGoal ? 240 : 90, // 4 hours for work, 1.5 hours for fitness
            status: 'pending',
            priority: 'high',
            category: plan.category || (isMoneyGoal ? 'career' : 'fitness')
          });
        });
      }
    } else {
      // Fallback for other goal types
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

  async createGoalFromConversation(conversationHistory: Array<{role: string, content: string}>): Promise<{success: boolean, goal?: any, tasks?: any[], error?: string}> {
    if (!this.model) {
      return { success: false, error: 'AI model not available' };
    }

    try {
      const currentDate = new Date();
      const currentDateString = currentDate.toISOString().split('T')[0];
      const currentTimeString = currentDate.toISOString();
      
      const systemPrompt = `You are a goal planning AI. Based on the conversation history, create a structured goal plan.

          CURRENT DATE AND TIME:
          - Today's date: ${currentDateString}
          - Current time: ${currentTimeString}

The user has provided information about their goal through a natural conversation. Extract the following information and create a structured plan:

1. Goal details (title, description, target date)
2. Training schedule (days per week, session duration, preferred days, time of day)
3. Specific tasks broken down by week with realistic scheduling

Return ONLY a valid JSON object (no markdown code blocks, no extra text) with this exact structure:
{
  "goal": {
    "title": "string",
    "description": "string (1-2 sentences)",
    "target_date": "YYYY-MM-DD",
    "status": "active"
  },
  "tasks": [
    {
      "title": "string",
      "notes": "string (optional)",
      "due_at": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "duration_minutes": number,
      "all_day": false,
      "status": "pending",
      "seq": number
    }
  ]
}

          CRITICAL RULES:
          - ALL task dates must be in the FUTURE, starting from ${currentDateString}
          - Use UTC format for due_at timestamps
- Create realistic, achievable tasks
- Schedule tasks on appropriate days starting from TODAY
- Make tasks specific and actionable
- Sequence tasks logically (seq: 1, 2, 3, etc.)
- Create 8-12 tasks total for a month-long goal
- Example: If today is ${currentDateString}, first task should be ${currentDateString} or later

TASK TITLE AND DESCRIPTION RULES:
- Task titles should be GENERIC and simple (e.g., "Go workout", "Practice", "Study", "Work on project")
- Task descriptions/notes should contain the SPECIFIC details of what to do
- For fitness goals: title = "Go workout", description = specific exercises and instructions
- For learning goals: title = "Study", description = specific topics and materials
- For work goals: title = "Work on project", description = specific tasks and deliverables

FITNESS/WEIGHTLIFTING SPECIFIC RULES:
- NEVER use absolute weights (e.g., "200lbs", "135lbs") in task descriptions
- ALWAYS use percentage-based intensity (e.g., "85% of 1RM", "70% intensity", "3 sets of 5 reps at 80%")
- Use relative terms like "light", "moderate", "heavy" intensity
- Focus on rep ranges and intensity percentages, not specific weights
- This applies to all strength training, powerlifting, bodybuilding, etc.

SCHEDULING RULES:
- ONLY schedule tasks on the days the user specified in their conversation
- If user said "Tuesdays, Thursdays, Saturdays" - ONLY use those days
- If user said "weekdays" - use Monday-Friday
- If user said "weekends" - use Saturday-Sunday
- NEVER add extra days beyond what the user requested
- Respect the user's preferred schedule exactly`;

      const conversationText = conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      const prompt = `${systemPrompt}\n\nConversation History:\n${conversationText}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean the response to extract pure JSON
      let jsonText = text.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Remove any leading/trailing whitespace and newlines
      jsonText = jsonText.trim();

      // Parse the JSON response
      const planData = JSON.parse(jsonText);

      // Validate the structure
      if (!planData.goal || !planData.tasks || !Array.isArray(planData.tasks)) {
        throw new Error('Invalid plan structure returned by AI');
      }

      return { success: true, goal: planData.goal, tasks: planData.tasks };

        } catch (error: any) {
          console.error('Error creating goal from conversation:', error);

          // Provide more specific error messages
          let errorMessage = 'Failed to create goal plan';
          if (error instanceof SyntaxError) {
            errorMessage = 'AI returned invalid JSON format. Please try again.';
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }

          return {
            success: false,
            error: errorMessage
          };
        }
  }
}

export const aiService = new AIService();
