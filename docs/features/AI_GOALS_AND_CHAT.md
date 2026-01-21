# AI Goals and Chat Features

Complete documentation for AI-powered goal creation, chat features, and usage tracking.

## Table of Contents

1. [AI Goals Feature](#ai-goals-feature)
2. [AI Chat Features](#ai-chat-features)
3. [Weekly Chat Tracking](#weekly-chat-tracking)
4. [Chat Usage Bar](#chat-usage-bar)
5. [New Chat Button](#new-chat-button)

---

## AI Goals Feature

### Overview

The AI Goals feature provides an end-to-end solution for goal creation and management:

1. **AI Chat Interface**: Users interact with an AI assistant to define their goals
2. **Interview Engine**: Collects required information through a structured conversation
3. **Task Scheduling**: Automatically generates tasks based on user preferences
4. **Calendar Integration**: Displays tasks on a calendar with visual indicators
5. **Progress Tracking**: Real-time progress updates with completion percentages
6. **Notifications**: Push notifications for task reminders

### Architecture

#### Database Schema

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

#### Key Components

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

### Features

#### 1. AI-Powered Goal Creation

- **Conversational Interface**: Natural language interaction with AI
- **Structured Data Collection**: Gathers all required information systematically
- **Validation**: Real-time input validation and error handling
- **Timeline Validation**: Checks for realistic goal timelines

#### 2. Automatic Task Scheduling

- **Smart Scheduling**: Creates tasks based on user availability
- **Timezone Support**: Handles user timezone preferences
- **Flexible Timing**: Supports custom time preferences or defaults
- **Sequential Numbering**: Maintains proper task order

#### 3. Calendar Integration

- **Visual Indicators**: Shows task dots on calendar dates
- **Task Details**: Displays task information on date selection
- **Completion Status**: Visual feedback for completed tasks
- **Real-time Updates**: Automatic refresh when tasks change

#### 4. Progress Tracking

- **Completion Percentage**: Real-time progress calculation
- **Task Management**: Mark tasks as complete/incomplete
- **Goal Status**: Track goal status (active, paused, completed, archived)
- **Visual Progress**: Progress bars and completion indicators

#### 5. Notifications

- **Push Notifications**: Remind users of upcoming tasks
- **Scheduled Alerts**: Notifications scheduled for task due times
- **Cross-platform**: Works on iOS and Android
- **User Control**: Users can manage notification preferences

### User Flow

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

### Technical Implementation

#### Interview Engine

```typescript
const interview = new InterviewEngine();
interview.acceptAnswer("I want to bench 225 pounds");
// Returns: { success: true, nextQuestion: "When do you want to achieve this?" }
```

#### Task Scheduling

```typescript
const scheduledSlots = buildSchedule(fields, 'America/Los_Angeles');
// Returns: Array of scheduled tasks with due_at timestamps
```

#### Edge Function Integration

```typescript
const result = await completeGoalFromInterview({
  transcript,
  fields,
  tz: timezone,
  accessToken: user.access_token,
  userId: user.id,
});
```

### Setup Instructions

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
   - Goals and tasks schema
   - Push tokens table
   - RLS policies

4. **Deploy Edge Function**
   - ai_plan function with Gemini integration

### Scheduling Accuracy

The system includes comprehensive day parsing and validation:

- **Centralized Day Parser** (`lib/ai/dayParser.ts`): Handles all day expression formats
- **Validation**: Ensures scheduled tasks match user's requested days
- **AI Prompts**: Enforces specific date requirements for vague timeframes

**Examples:**
- "weekdays" → ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
- "monday-friday" → ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
- "weekends" → ['Sat', 'Sun']

---

## AI Chat Features

### Overview

The AI Chat feature provides conversational assistance with premium features and usage limits for free users.

### Premium Features

#### 1. Removed Cancel Subscription Button
- ✅ Removed the "Cancel Subscription" button from the Subscription Management Modal
- ✅ Removed the associated handler function
- Users can now only manage subscriptions through the App Store

#### 2. AI Chat Conversation Starters
Added interactive conversation starter buttons at the beginning of chat sessions.

**Features:**
- Welcome card with AI Chat Assistant branding
- Shows remaining chat count for free users
- Three conversation starter buttons:
  - 🗨️ "Ask a question"
  - 🎯 "Get advice on habits"
  - ✨ "Plan my week"

#### 3. Premium "Create Goal" Feature
Implemented a premium-only goal creation button in the AI chat.

**How It Works:**
1. Premium users see a prominent "Create Goal with AI" button
2. Clicking activates goal creation mode
3. AI guides the user through creating a personalized goal
4. Goal and tasks are automatically created in the Goals page
5. Free users are prompted to upgrade when clicking the button

**Features:**
- 👑 Crown icon indicates premium feature
- ✨ Sparkles animation effect
- Premium check before activation
- Automatic navigation to Goals page after creation

### Chat Usage Limits for Free Users

#### Limits:
- **Free Users:** 10 AI chats per week
- **Premium Users:** Unlimited chats
- **Reset:** Every Sunday at midnight

#### Implementation Details:
- Created `chat_usage` database table
- Tracks each chat conversation start
- Shows remaining chats in welcome card
- Prevents usage when limit is reached
- Prompts upgrade when limit exceeded

#### Database Migration:
- `supabase/migrations/20250114000000_create_chat_usage_table.sql`

### User Experience Flow

#### Free User Flow:
1. Opens AI Chat → Sees "X of 10 chats remaining"
2. Clicks starter button or types message
3. Chat count increments on first message
4. After 10 chats → Prompted to upgrade
5. "Create Goal" button shows upgrade prompt

#### Premium User Flow:
1. Opens AI Chat → Sees "Ask me anything or create personalized goals!"
2. Can click "Create Goal with AI" button
3. Unlimited chats available
4. Full access to goal creation feature

---

## Weekly Chat Tracking

### Overview

Complete database-backed system for tracking AI chat usage with automatic weekly resets for free users.

### System Architecture

#### Database Layer
```
chat_usage table
├── id (UUID)
├── user_id (UUID) → auth.users
└── created_at (TIMESTAMPTZ)
```

#### Helper Functions
1. `get_week_start()` - Returns start of current week (Sunday 00:00 UTC)
2. `get_weekly_chat_count(user_id)` - Returns current week's chat count
3. `can_create_chat(user_id)` - Checks if user is under weekly limit
4. `cleanup_old_chat_usage()` - Removes records older than 4 weeks

#### Scheduled Jobs
1. **Cleanup Job** - Runs every Monday at 1 AM UTC
2. **Stats Refresh** - Runs every Sunday at 11:59 PM UTC

### Weekly Reset Logic

#### How It Works:

1. **Week Definition**: 
   - Week starts: **Sunday at 00:00:00 UTC**
   - Week ends: **Saturday at 23:59:59 UTC**

2. **Count Calculation**:
   ```sql
   SELECT COUNT(*)
   FROM chat_usage
   WHERE user_id = ?
     AND created_at >= date_trunc('week', NOW())
   ```

3. **Automatic Reset**:
   - No manual reset needed
   - Query automatically filters by current week
   - Old records don't affect current count

4. **Example Timeline**:
   ```
   Sunday 00:00 UTC - Week 1 starts (count = 0)
   Monday         - User sends 3 chats (count = 3)
   Friday         - User sends 5 more (count = 8)
   Saturday       - User sends 2 more (count = 10)
   Sunday 00:00 UTC - Week 2 starts (count = 0) ✓
   ```

### Security & Permissions

#### Row Level Security (RLS)
```sql
-- Users can view their own usage
CREATE POLICY "Users can view their own chat usage"
  ON chat_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert their own chat usage"
  ON chat_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### App Integration

#### Loading Chat Count
```typescript
const loadChatCount = async () => {
  // Use database function for accuracy
  const { data, error } = await supabase
    .rpc('get_weekly_chat_count', { p_user_id: user.id });

  if (!error && data !== null) {
    setChatCount(data);
  }
};
```

#### Validating Chat Creation
```typescript
const handleSendMessage = async () => {
  // Server-side validation
  const { data: canChat } = await supabase
    .rpc('can_create_chat', { p_user_id: user.id });
  
  if (!canChat) {
    // Show limit reached message
    return;
  }
  
  // Create chat...
};
```

#### Incrementing Chat Count
```typescript
const incrementChatCount = async () => {
  await supabase
    .from('chat_usage')
    .insert({
      user_id: user.id,
      created_at: new Date().toISOString()
    });
  
  setChatCount(prev => prev + 1);
};
```

### Deployment Steps

#### 1. Run Database Migrations

```bash
# Navigate to project directory
cd momentum-623

# Apply new migrations
supabase db push

# Or if using Supabase CLI
supabase migration up
```

#### 2. Verify Migration Success

```sql
-- In Supabase SQL Editor
SELECT proname 
FROM pg_proc 
WHERE proname IN ('get_week_start', 'get_weekly_chat_count', 'can_create_chat');
```

Expected: 3 functions returned

#### 3. Test the System

```sql
-- Replace with actual user ID
SELECT get_weekly_chat_count('YOUR-USER-UUID');
SELECT can_create_chat('YOUR-USER-UUID');
```

### Monitoring & Maintenance

#### Weekly Checks:

```sql
-- View current week usage
SELECT 
  COUNT(*) as total_chats,
  COUNT(DISTINCT user_id) as active_users
FROM chat_usage
WHERE created_at >= get_week_start();

-- Users approaching limit
SELECT 
  u.email,
  get_weekly_chat_count(u.id) as chat_count
FROM auth.users u
JOIN user_profiles up ON u.id = up.id
WHERE up.subscription_tier = 'free'
  AND get_weekly_chat_count(u.id) >= 7
ORDER BY chat_count DESC;
```

---

## Chat Usage Bar

### Overview

Replaced the generic progress indicator on the AI chat page with a **chat usage bar** that only appears for **free users**, showing their weekly AI chat consumption.

### Features

#### For Free Users:
- **Usage Bar** appears at the top showing: `{used} / 10` chats
- **Visual Progress Bar** with color coding:
  - 🟢 **Green** (0-7 chats): Healthy usage
  - 🟡 **Orange** (8-9 chats): Approaching limit
  - 🔴 **Red** (10 chats): Limit reached
- **Upgrade Button** appears when users reach 70% of their limit (7+ chats)
- **Clear Messaging**: Shows remaining chats or limit reached warning

#### For Premium Users:
- **No usage bar** - unlimited chats, no restrictions
- Clean interface without usage tracking

### Visual Design

#### Layout:
```
┌─────────────────────────────────────┐
│ Weekly AI Chats          3 / 10    │
│ ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ 7 chats remaining        [Upgrade] │
└─────────────────────────────────────┘
```

#### Color Coding:
- **0-7 chats**: Green bar (safe zone)
- **8-9 chats**: Orange bar (warning zone)
- **10 chats**: Red bar (limit reached)

#### Messages:
- **Under limit**: "{X} chat(s) remaining"
- **At limit**: "⚠️ Limit reached this week"

### Technical Implementation

#### File Modified:
- `app/(tabs)/chat/index.tsx`

#### Key Changes:

1. **Replaced Progress Indicator** (lines 386-437):
   - Old: Generic "33% Complete" progress bar
   - New: Chat usage bar with dynamic styling

2. **Added Conditional Rendering**:
   ```typescript
   {!isPremium && (
     // Show usage bar only for free users
   )}
   ```

3. **Dynamic Bar Width**:
   ```typescript
   width: `${Math.min((chatCount / chatLimit) * 100, 100)}%`
   ```

4. **Color Logic**:
   ```typescript
   chatCount >= chatLimit ? colors.error 
   : chatCount >= chatLimit * 0.8 ? colors.warning 
   : colors.success
   ```

5. **Upgrade Button** (appears at 70% usage):
   ```typescript
   {chatCount >= chatLimit * 0.7 && (
     <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
       <Crown /> Upgrade
     </TouchableOpacity>
   )}
   ```

---

## New Chat Button

### Overview

Added a **"New Chat"** button to the top right of the AI chat page that allows users to start a fresh conversation or continue their last topic in a new chat session.

### Features

#### 1. Smart New Chat Button
- **Location**: Top right corner of the header
- **Visibility**: Only appears when there are active messages
- **Icon**: Plus icon with "New Chat" label
- **Behavior**: Opens confirmation dialog with options

#### 2. Intelligent Continuation Options
When user clicks "New Chat", they get options:

**Option 1: Continue Last Topic**
- Takes the user's last message
- Clears the conversation
- Pre-fills input field with that message
- Allows user to explore same topic from a new angle

**Option 2: Fresh Start**
- Completely clears the conversation
- Resets all state
- Returns to welcome screen with starter buttons
- Perfect for changing topics entirely

#### 3. Safety Confirmation
- Prevents accidental chat loss
- Clear options with descriptions
- Cancel button to abort
- Haptic feedback on button press (iOS/Android)

### Visual Design

#### Button Appearance:
```
┌──────────────────────────────────────┐
│ AI Chat Assistant    [➕ New Chat]  │
└──────────────────────────────────────┘
```

#### Dialog Options:
```
┌─────────────────────────────────────┐
│     Start New Chat                  │
├─────────────────────────────────────┤
│ Would you like to start a new      │
│ conversation?                       │
│                                     │
│  [Cancel] [Continue Last Topic]    │
│                         [Fresh Start]│
└─────────────────────────────────────┘
```

### Technical Implementation

#### File Modified:
- `app/(tabs)/chat/index.tsx`

#### Key Changes:

1. **Added Plus Icon Import**:
```typescript
import { Send, Bot, CheckCircle, Sparkles, MessageSquare, 
         Target, Crown, Plus } from 'lucide-react-native';
```

2. **New Chat Handler**:
```typescript
const handleNewChat = async () => {
  // Haptic feedback
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  
  // Get last user message
  const userMessages = messages.filter(m => m.role === 'user');
  const lastUserMessage = userMessages[...].content;
  
  // Show smart dialog with options
  Alert.alert('Start New Chat', '...', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Continue Last Topic', onPress: ... },
    { text: 'Fresh Start', onPress: ..., style: 'destructive' }
  ]);
};
```

3. **Button in Header**:
```typescript
{messages.length > 0 && (
  <TouchableOpacity
    style={styles.newChatButton}
    onPress={handleNewChat}
  >
    <Plus size={18} color={colors.text} />
    <Text style={styles.newChatText}>New Chat</Text>
  </TouchableOpacity>
)}
```

---

## Summary

### Key Features

- ✅ AI-powered goal creation with conversational interface
- ✅ Automatic task scheduling with calendar integration
- ✅ Weekly chat tracking with automatic resets
- ✅ Usage bar for free users with upgrade prompts
- ✅ New chat button with smart continuation options
- ✅ Premium features for unlimited chats and goal creation

### Status

**AI Goals**: ✅ Fully Implemented
**Chat Features**: ✅ Fully Implemented
**Chat Tracking**: ✅ Production Ready

---

**Last Updated**: Current build
**Version**: 1.0

