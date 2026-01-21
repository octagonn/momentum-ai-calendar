## Momentum App Transfer Plan for Cursor AI

### 🚀 Project Overview
Momentum is a comprehensive goal-tracking and productivity mobile app built with React Native and Expo. It features AI-powered goal creation, task management, calendar integration, and a beautiful dark/light theme system.

### 📁 Project Structure

#### Core Files
- `package.json` - Dependencies and scripts
- `app/_layout.tsx` - Root layout with providers
- `app/(tabs)/_layout.tsx` - Tab navigation setup
- `app/index.tsx` - App entry point

#### Tab Screens
- `app/(tabs)/(home)/home.tsx` - Main dashboard with tasks and goals overview
- `app/(tabs)/chat/index.tsx` - AI assistant chat interface
- `app/(tabs)/calendar/index.tsx` - Calendar view with event management
- `app/(tabs)/goals/index.tsx` - Goals management with creation modal
- `app/(tabs)/settings/index.tsx` - Settings with theme toggle and legal modals

#### Providers & State Management
- `providers/ThemeProvider.tsx` - Dark/light theme with AsyncStorage persistence
- `providers/UserProvider.tsx` - User profile data management
- `providers/GoalsProvider.tsx` - Tasks and goals with tRPC integration
- `providers/SupabaseProvider.tsx` - Supabase connection management

#### Backend & API
- `backend/hono.ts` - Hono server setup
- `backend/trpc/create-context.ts` - tRPC context and router setup
- `backend/trpc/app-router.ts` - Main tRPC router
- `backend/trpc/routes/tasks/route.ts` - Task CRUD operations
- `backend/trpc/routes/goals/route.ts` - Goal CRUD operations
- `lib/trpc.ts` - tRPC client configuration
- `lib/supabase.ts` - Supabase utility functions

#### Components
- `components/ErrorBoundary.tsx` - Error handling wrapper
- `components/AppHeader.tsx` - App header component (currently unused)
- `components/GoalCreationModal.tsx` - AI-powered goal creation flow

#### Types
- `types/task.ts` - Task data structure
- `types/goal.ts` - Goal data structure
- `types/chat.ts` - Chat message structure

#### Utilities
- `lib/storage.ts` - AsyncStorage wrapper
- `app/supabase-admin.tsx` - Supabase database management screen

### 🛠 Tech Stack & Dependencies

#### Core Dependencies
- **React Native 0.79.1** with Expo SDK 53
- **React 19.0.0** with React DOM
- **TypeScript 5.8.3** with strict type checking
- **Expo Router 5.0.3** for file-based routing

#### State Management
- **@tanstack/react-query 5.83.0** for server state
- **@nkzw/create-context-hook** for shared state
- **zustand 5.0.2** (imported but not heavily used)

#### Backend & API
- **tRPC 11.6.0** for type-safe API calls
- **Hono 4.9.8** for backend server
- **SuperJSON 2.2.2** for serialization

#### UI & Styling
- **NativeWind 4.1.23** for utility-first styling
- **Expo Linear Gradient** for gradients
- **Lucide React Native** for icons
- **Expo Fonts** (Inter, Poppins)

#### Database & Storage
- **@react-native-async-storage/async-storage 2.1.2**
- Supabase integration (optional, with fallbacks)

#### AI Integration
- **@rork/toolkit-sdk** for AI features (globally available)
- Gemini API for goal creation flow
- Speech-to-text capabilities

### 🎨 Design System

#### Colors (Dark Theme Default)
- Primary: #6366f1 (Indigo)
- Primary Light: #8b5cf6 (Purple)
- Success: #22c55e (Green)
- Warning: #f59e0b (Amber)
- Danger: #ef4444 (Red)
- Info: #3b82f6 (Blue)
- Background/Card variations for dark/light themes

#### Typography
- Headers: Poppins 700Bold
- Body: Inter 500Medium
- Consistent font weights and letter spacing

#### UI Patterns
- Glassmorphism effects with backdrop blur
- Gradient backgrounds with pattern overlays
- Rounded corners (24px for cards, 12px for buttons)
- Shadow system with elevation
- Safe area handling for all screens

### 🔄 Data Flow & State Management

#### User Data
- Stored in AsyncStorage via UserProvider
- Includes name, email, streak, active goals, settings
- Settings: notifications, theme preferences

#### Tasks & Goals
- Dual storage: AsyncStorage + Supabase (optional)
- Optimistic updates with rollback on failure
- Real-time sync via tRPC mutations
- Web compatibility (skips Supabase on web)

#### Theme System
- Persistent theme storage
- Automatic color scheme application
- Pattern overlays for visual interest

### 🧭 Navigation & Routing

#### Tab Navigation
- Home, Chat, Calendar, Goals, Settings
- Custom tab bar with icons and labels
- Header hidden on all tabs

#### Stack Navigation
- Modal presentations for goal creation
- Full-screen modals for legal pages
- Nested stacks within tabs

### 🤖 AI Features

#### Goal Creation Flow
- Conversational AI-guided setup
- Multi-step process: goal type → baseline → availability → timeline → validation → plan generation
- Uses Gemini API for intelligent responses
- Generates structured plans with milestones and weekly schedules

#### Chat Interface
- AI coach for goal planning and motivation
- Quick action buttons for common prompts
- Message history with timestamps
- Voice input capabilities (placeholder)

### 📱 Key Features

#### Home Screen
- Personalized greeting with date
- Progress cards (tasks complete, streak, weekly goal, active goals)
- Today's priority tasks with checkboxes
- Upcoming goals preview
- Animated interactions with haptic feedback

#### Calendar Screen
- Month/week/day/year views
- Event dots on calendar days
- Navigation between months
- Add event button (placeholder)

#### Goals Screen
- Goal cards with progress bars
- Status badges (active/paused/completed)
- AI-powered goal creation modal
- Syncing indicators

#### Settings Screen
- Account management
- Theme toggle
- Notification preferences
- Legal modals (Privacy Policy, Terms & Conditions)
- Pro subscription upsell

#### Chat Screen
- AI assistant interface
- Quick action buttons
- Message bubbles with timestamps
- Input with voice/image buttons (placeholders)

### 🔧 Configuration & Environment

#### Required Environment Variables
- `EXPO_PUBLIC_SUPABASE_URL` (optional)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (optional)
- `EXPO_PUBLIC_RORK_API_BASE_URL` (optional)
- `GEMINI_API_KEY` (for AI features)

#### Build Configuration
- Expo Go v53 compatibility
- No custom native packages
- Web compatibility considerations
- Ngrok tunnel for development

### 🚨 Known Issues & Areas for Attention

#### Current Problems
1. **Header Inconsistency**: AppHeader component exists but isn't used. Purple banners on calendar/goals/settings need to extend to top and have bottom radius.

2. **Background Issues**: Chat page background works on web but not mobile.

3. **Data Persistence**: Tasks and goals need full Supabase sync implementation.

4. **Legal Pages**: Privacy Policy and Terms & Conditions are modals but need proper content.

#### Recent Changes Needed
- Remove AppHeader from all pages (only purple banners)
- Fix purple banner styling (full height to top, bottom radius)
- Implement persistent data sync for tasks/goals
- Replace placeholder legal content with proper policies
- Ensure mobile background consistency

### 🎯 Development Priorities

#### Immediate Tasks
1. Fix header/banner styling inconsistencies
2. Implement full Supabase sync for tasks and goals
3. Complete legal page content
4. Fix mobile background rendering issues

#### Medium-term Goals
1. Complete voice input functionality
2. Add calendar event management
3. Implement subscription system
4. Add more AI coaching features

#### Long-term Vision
1. Advanced analytics and insights
2. Social features and goal sharing
3. Integration with wearables/fitness apps
4. Multi-language support

### 🧪 Testing Strategy

#### Test IDs Added
- All interactive elements have testID props
- Screen containers have testID attributes
- Form inputs and buttons are testable

#### Manual Testing Checklist
- Theme switching works correctly
- Data persists across app restarts
- AI chat flow completes successfully
- All navigation works smoothly
- Modals open/close properly
- Web compatibility maintained

### 🚀 Getting Started with Cursor AI

1. **Import the project** - Load all files from the artifact
2. **Install dependencies** - Run `bun install` or `npm install`
3. **Set up environment** - Configure API keys if needed
4. **Start development** - Use `bunx rork start -p [project-id] --tunnel`
5. **Test core flows** - Home screen, goal creation, settings
6. **Fix known issues** - Headers, backgrounds, data sync

### 📋 Code Quality Standards

- TypeScript strict mode enabled
- Explicit type annotations for useState
- Proper error handling with try/catch
- Console logging for debugging
- React optimization with useMemo/useCallback where needed
- Web compatibility checks (Platform.OS !== 'web')
- Haptic feedback for interactions
- Accessibility considerations (testID for testing)

This plan provides comprehensive context for Cursor AI to understand the Momentum app's architecture, features, and current state. Focus on the immediate issues first, then expand functionality systematically.