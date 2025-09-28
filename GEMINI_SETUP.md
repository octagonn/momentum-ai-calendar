# Gemini API Setup Guide

## Step 1: Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy your API key

## Step 2: Set up Environment Variables

Create a `.env` file in the root of your project with:

```env
# Gemini API Configuration
EXPO_PUBLIC_GEMINI_API_KEY=your_actual_gemini_api_key_here

# Supabase Configuration (optional)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Step 3: Test the API

Run the test script to verify your API key works:

```bash
node test-gemini.js
```

## Step 4: Restart the Development Server

After setting up the `.env` file, restart your Expo development server:

```bash
npx expo start --web --port 8082
```

## Troubleshooting

- Make sure the API key is correct and active
- Ensure the `.env` file is in the root directory
- Restart the development server after changing environment variables
- Check the browser console for debug logs

## Current Status

The AI chatbot will use mock responses until a valid Gemini API key is provided. Once set up, it will use the real Gemini API for intelligent responses.
