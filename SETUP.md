# Momentum App Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
# or
yarn install
# or
bun install
```

### 2. Start the Development Server
```bash
# Start both backend and frontend
npm run dev

# Or start them separately:
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm start
```

### 3. Available Scripts

#### Frontend (Expo)
- `npm start` - Start Expo development server
- `npm run start:web` - Start Expo for web
- `npm run start:dev` - Start with dev client
- `npm run start:tunnel` - Start with tunnel
- `npm run android` - Start on Android
- `npm run ios` - Start on iOS
- `npm run web` - Start on web

#### Backend
- `npm run server` - Start backend server (port 3001)
- `npm run server:dev` - Start backend with watch mode

#### Combined
- `npm run dev` - Start both backend and frontend concurrently

## Environment Variables

Create a `.env` file in the root directory with:

```env
# Expo Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:3001

# Backend Configuration
PORT=3001

# Optional: Gemini API for AI features
GEMINI_API_KEY=your_gemini_api_key_here
```

## Development URLs

- **Frontend**: http://localhost:8081 (Expo DevTools)
- **Backend API**: http://localhost:3001
- **tRPC Endpoint**: http://localhost:3001/api/trpc

## Features

- ✅ React Native with Expo
- ✅ TypeScript
- ✅ tRPC for type-safe API calls
- ✅ Hono backend server
- ✅ Supabase integration (optional)
- ✅ AsyncStorage for local persistence
- ✅ Dark/Light theme support
- ✅ Cross-platform (iOS, Android, Web)

## Troubleshooting

### Backend Issues
- Make sure port 3001 is available
- Check that all dependencies are installed
- Verify TypeScript compilation

### Frontend Issues
- Clear Expo cache: `expo start -c`
- Reset Metro bundler: `npx react-native start --reset-cache`
- Check that the backend is running on port 3001

### Supabase Issues
- App works without Supabase (uses AsyncStorage fallback)
- Set environment variables if you want full sync
- Check Supabase project configuration

