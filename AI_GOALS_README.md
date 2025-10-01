# AI Goals Feature Implementation

This document describes the complete implementation of the AI Goals feature that allows users to create personalized goals with AI assistance, automatic task scheduling, and calendar integration.

## 🎯 Overview

The AI Goals feature provides an end-to-end solution for goal creation and management:

1. **AI Chat Interface**: Users interact with an AI assistant to define their goals
2. **Interview Engine**: Collects required information through a structured conversation
3. **Task Scheduling**: Automatically generates tasks based on user preferences
4. **Calendar Integration**: Displays tasks on a calendar with visual indicators
5. **Progress Tracking**: Real-time progress updates with completion percentages
6. **Notifications**: Push notifications for task reminders

## 🏗️ Architecture

### Database Schema

```sql
-- Core tables
profiles (id, tz, created_at)
goals (id, user_id, title, description, target_date, status, created_at, updated_at)
tasks (id, goal_id, user_id, title, notes, due_at, duration_minutes, all_day, status, completed_at, seq, created_at, updated_at)
push_tokens (id, user_id, token, platform, created_at, updated_at)

-- Views
goal_progress (goal_id, user_id, completion_ratio)

-- RPC Functions
create_goal_with_tasks(p_user_id, p_goal, p_tasks) -> goal_id
```

### Key Components

1. **Interview Engine** (`app/lib/ai/interviewEngine.ts`)
   - Deterministic state machine for collecting user input
   - Validates input and provides real-time feedback
   - Checks for realistic timelines

2. **Scheduler** (`app/lib/ai/scheduler.ts`)
   - Generates scheduled tasks based on user preferences
   - Handles timezone conversion and date calculations
   - Creates tasks with proper sequencing

3. **Edge Function** (`supabase/functions/ai_plan/index.ts`)
   - Calls Gemini AI to structure and improve the plan
   - Validates response with Zod schemas
   - Inserts goal and tasks atomically

4. **UI Components**
   - `GoalsScreen`: Displays goals with progress bars
   - `GoalModal`: Shows task details and completion status
   - `CalendarScreen`: Calendar view with task indicators
   - `AIGoalCreationModal`: AI chat interface for goal creation

## 🚀 Features

### 1. AI-Powered Goal Creation

- **Conversational Interface**: Natural language interaction with AI
- **Structured Data Collection**: Gathers all required information systematically
- **Validation**: Real-time input validation and error handling
- **Timeline Validation**: Checks for realistic goal timelines

### 2. Automatic Task Scheduling

- **Smart Scheduling**: Creates tasks based on user availability
- **Timezone Support**: Handles user timezone preferences
- **Flexible Timing**: Supports custom time preferences or defaults
- **Sequential Numbering**: Maintains proper task order

### 3. Calendar Integration

- **Visual Indicators**: Shows task dots on calendar dates
- **Task Details**: Displays task information on date selection
- **Completion Status**: Visual feedback for completed tasks
- **Real-time Updates**: Automatic refresh when tasks change

### 4. Progress Tracking

- **Completion Percentage**: Real-time progress calculation
- **Task Management**: Mark tasks as complete/incomplete
- **Goal Status**: Track goal status (active, paused, completed, archived)
- **Visual Progress**: Progress bars and completion indicators

### 5. Notifications

- **Push Notifications**: Remind users of upcoming tasks
- **Scheduled Alerts**: Notifications scheduled for task due times
- **Cross-platform**: Works on iOS and Android
- **User Control**: Users can manage notification preferences

## 📱 User Flow

1. **Start Goal Creation**
   - User taps "Create Goal" button
   - AI chat modal opens with welcome message

2. **AI Interview Process**
   - AI asks for goal title
   - AI asks for target date
   - AI asks for days per week
   - AI asks for session duration
   - AI asks for preferred days
   - AI asks for time of day

3. **Plan Generation**
   - System generates scheduled tasks
   - AI structures and improves the plan
   - Plan is validated and saved to database

4. **Goal Management**
   - Goal appears in goals list with progress bar
   - Tasks appear on calendar with visual indicators
   - Users can mark tasks as complete
   - Progress updates in real-time

## 🔧 Technical Implementation

### Interview Engine

```typescript
const interview = new InterviewEngine();
interview.acceptAnswer("I want to bench 225 pounds");
// Returns: { success: true, nextQuestion: "When do you want to achieve this?" }
```

### Task Scheduling

```typescript
const scheduledSlots = buildSchedule(fields, 'America/Los_Angeles');
// Returns: Array of scheduled tasks with due_at timestamps
```

### Edge Function Integration

```typescript
const result = await completeGoalFromInterview({
  transcript,
  fields,
  tz: timezone,
  accessToken: user.access_token,
  userId: user.id,
});
```

### Realtime Updates

```typescript
const subscription = supabase
  .channel('goals_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, 
    () => fetchGoals())
  .subscribe();
```

## 🛠️ Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install react-native-calendars expo-notifications expo-device date-fns date-fns-tz zod
   ```

2. **Configure Environment Variables**
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_EDGE_URL=your_supabase_edge_url
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-1.5-pro
   EXPO_PUBLIC_PROJECT_ID=your_expo_project_id
   ```

3. **Apply Database Migrations**
   ```bash
   # The migrations are already applied via MCP
   # Goals and tasks schema
   # Push tokens table
   # RLS policies
   ```

4. **Deploy Edge Function**
   ```bash
   # The Edge Function is already deployed via MCP
   # ai_plan function with Gemini integration
   ```

5. **Test the Implementation**
   ```bash
   node scripts/test-ai-goals.js
   ```

## 🧪 Testing

The implementation includes comprehensive testing:

- **Unit Tests**: Interview engine and scheduler logic
- **Integration Tests**: Edge function and database operations
- **UI Tests**: Component rendering and user interactions
- **End-to-End Tests**: Complete user flow validation

## 🔒 Security

- **Row Level Security**: All database operations are protected by RLS policies
- **User Isolation**: Users can only access their own goals and tasks
- **Input Validation**: All user input is validated with Zod schemas
- **API Security**: Edge functions use proper authentication

## 📊 Performance

- **Optimized Queries**: Efficient database queries with proper indexing
- **Realtime Updates**: Minimal data transfer with targeted subscriptions
- **Caching**: Client-side caching for improved performance
- **Lazy Loading**: Components load data only when needed

## 🚀 Deployment

The feature is ready for production deployment:

1. **Database**: Schema and policies are applied
2. **Edge Function**: Deployed and configured
3. **UI Components**: Fully implemented and tested
4. **Notifications**: Configured for both platforms
5. **Realtime**: Enabled for live updates

## 📈 Future Enhancements

- **Goal Templates**: Pre-built goal templates for common objectives
- **Social Features**: Share goals and progress with friends
- **Analytics**: Detailed progress analytics and insights
- **Integration**: Connect with external calendar apps
- **AI Improvements**: More sophisticated AI planning and suggestions

## 🐛 Troubleshooting

### Common Issues

1. **Interview Engine Not Progressing**
   - Check input validation logic
   - Verify required fields are being collected

2. **Tasks Not Appearing on Calendar**
   - Check timezone configuration
   - Verify task due_at timestamps

3. **Notifications Not Working**
   - Check device permissions
   - Verify push token registration

4. **Edge Function Errors**
   - Check Gemini API key configuration
   - Verify Supabase credentials

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=ai-goals:*
```

## 📝 API Reference

### Interview Engine

```typescript
class InterviewEngine {
  acceptAnswer(answer: string): { success: boolean; error?: string; nextQuestion?: string }
  isComplete(): boolean
  getFields(): Partial<InterviewFields>
  getValidatedFields(): InterviewFields | null
  checkTimelineRealism(minSessionsRequired?: number): { isRealistic: boolean; suggestion?: string }
}
```

### Scheduler

```typescript
function buildSchedule(fields: InterviewFields, userTimezone?: string): ScheduledSlot[]
function validateSchedule(scheduledSlots: ScheduledSlot[]): { isValid: boolean; errors: string[] }
```

### Notifications

```typescript
class NotificationService {
  initialize(): Promise<void>
  scheduleTaskNotification(data: NotificationData): Promise<string | null>
  scheduleMultipleTaskNotifications(tasks: Task[]): Promise<string[]>
  cancelNotification(notificationId: string): Promise<void>
}
```

## 🎉 Conclusion

The AI Goals feature provides a complete, production-ready solution for goal creation and management. It combines AI assistance, automatic scheduling, calendar integration, and real-time updates to create a seamless user experience.

The implementation follows best practices for security, performance, and maintainability, making it ready for immediate deployment and future enhancements.

