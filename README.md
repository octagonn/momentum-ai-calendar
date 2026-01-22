# Momentum - AI-Powered Productivity App

A modern, cross-platform mobile app that uses AI to help users achieve their goals through intelligent task scheduling and calendar integration.

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

## Features

### AI-Powered Goal Planning
- Natural language goal input with AI interpretation
- Automatic task breakdown and scheduling
- Smart conflict detection with calendar integration

### Task Management
- Daily task views with progress tracking
- Drag-and-drop task organization
- Push notification reminders

### Calendar Integration
- Google Calendar sync via OAuth 2.0
- Free/busy time detection for optimal scheduling
- Visual calendar view with task overlay

### Premium Subscription System
- In-app purchases with RevenueCat integration
- Server-side receipt verification
- Subscription state management across devices

### User Experience
- Day streak tracking for motivation
- Onboarding flow with user preferences
- Dark/light theme support
- iPad and tablet optimization

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React Native, Expo Router, TypeScript |
| **Backend** | Supabase (PostgreSQL, Edge Functions, Auth) |
| **AI** | Google Gemini API |
| **Payments** | RevenueCat, Apple StoreKit |
| **State** | React Context, React Query |

## Architecture

```
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation (Home, Calendar, Goals, Chat, Settings)
│   ├── auth/              # Authentication screens
│   └── components/        # Screen-specific components
├── components/            # Shared UI components
├── providers/             # React Context providers
│   ├── AuthProvider       # Authentication state
│   ├── GoalsProvider      # Goals and tasks state
│   ├── SubscriptionProvider # Premium subscription state
│   └── ThemeProvider      # Dark/light theme
├── services/              # Business logic
├── lib/                   # Utilities and API clients
│   └── ai/               # AI scheduling engine
├── supabase/
│   ├── functions/        # Edge functions (AI planner, calendar proxy, receipt verification)
│   └── migrations/       # Database schema
└── types/                # TypeScript type definitions
```

## Key Implementation Highlights

### AI Scheduling Engine
The app uses a custom scheduling algorithm that:
1. Parses natural language goals into structured data
2. Analyzes user calendar for available time slots
3. Distributes tasks optimally while respecting constraints
4. Handles recurring tasks and deadline priorities

### Secure Authentication
- Supabase Auth with email/password and magic links
- Row-level security (RLS) for data isolation
- Secure token refresh and session management

### Subscription Management
- Server-side Apple receipt verification
- Webhook handling for subscription events
- Graceful degradation for network issues

## Getting Started

### Prerequisites
- Node.js 18+
- Bun or npm
- iOS Simulator (macOS) or Android Emulator

### Installation

```bash
# Clone the repository
git clone https://github.com/octagonn/momentum-ai-calendar.git
cd momentum-ai-calendar

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
bun run start
```

### Environment Variables

See `.env.example` for required configuration:
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `EXPO_PUBLIC_GEMINI_API_KEY` - Google Gemini API key

## Deployment

### iOS App Store
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

### Android Play Store
```bash
eas build --platform android --profile production
eas submit --platform android
```

## License

This project is proprietary software. All rights reserved.

---

Built with React Native and Expo
