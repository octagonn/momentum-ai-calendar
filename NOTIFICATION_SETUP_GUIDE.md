# 📱 iOS App Store Notification Setup Guide

This guide will help you set up push notifications for your Momentum app when submitting to the iOS App Store.

## 🚀 What's Already Implemented

### ✅ Complete Notification System
- **NotificationProvider**: Full notification management with permissions, settings, and scheduling
- **Settings Integration**: User-friendly notification preferences in settings
- **Task Reminders**: Automatic notifications for upcoming tasks
- **Goal Reminders**: Notifications for goal milestones and deadlines
- **Daily Motivation**: Scheduled motivational messages
- **Weekly Reports**: Progress summary notifications
- **Test Notifications**: Built-in testing functionality

### ✅ iOS Configuration
- **App.json**: Proper notification plugin configuration
- **Background Modes**: iOS background processing enabled
- **Notification Channels**: Android notification channels configured
- **Permission Handling**: Comprehensive permission request flow

## 📋 Pre-Submission Checklist

### 1. Environment Variables
Ensure your `.env` file includes:
```bash
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. Expo Project Configuration
Your `app.json` is already configured with:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icon.png",
          "color": "#ffffff",
          "defaultChannel": "default"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["background-fetch", "background-processing"]
      }
    }
  }
}
```

### 3. Notification Features Implemented

#### 🎯 Task Notifications
- **Automatic Scheduling**: Tasks are automatically scheduled for notifications
- **Smart Timing**: Only future tasks get notifications
- **Rich Content**: Includes task title and goal context
- **User Control**: Can be enabled/disabled in settings

#### 🏆 Goal Notifications
- **Milestone Reminders**: Notifications for goal deadlines
- **Progress Updates**: Achievement notifications
- **Customizable**: User can control goal reminder preferences

#### 📅 Daily Notifications
- **Morning Motivation**: Daily inspirational messages
- **Weekly Reports**: Progress summaries
- **Custom Timing**: User-configurable reminder times

#### ⚙️ Settings & Permissions
- **Permission Request**: Graceful permission handling
- **Settings Panel**: Complete notification preferences
- **Test Functionality**: Built-in notification testing
- **Status Indicators**: Clear permission status display

## 🔧 iOS App Store Requirements

### 1. Push Notification Capability
When creating your app in App Store Connect:
1. Go to **App Information** → **App Store Connect API**
2. Enable **Push Notifications** capability
3. Download and install the **Apple Push Notification service (APNs) certificate**

### 2. App Store Connect Configuration
1. **App Information**:
   - Enable "Push Notifications" capability
   - Add notification usage description in Info.plist

2. **App Review Information**:
   - Add notification testing instructions
   - Explain notification features and user benefits

### 3. Required Info.plist Entries
Add these to your `app.json` under `ios.infoPlist`:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["background-fetch", "background-processing"],
        "NSUserNotificationsUsageDescription": "Momentum sends notifications to remind you about your goals and tasks, keeping you motivated and on track.",
        "NSCameraUsageDescription": "Allow access to camera for profile pictures",
        "NSPhotoLibraryUsageDescription": "Allow access to photo library for profile pictures"
      }
    }
  }
}
```

## 🧪 Testing Notifications

### 1. Development Testing
```bash
# Test on physical device (notifications don't work in simulator)
npx expo start --ios
# or
npx expo run:ios
```

### 2. Using the App
1. **Enable Notifications**: Go to Settings → Notifications → Enable
2. **Test Notifications**: Use the "Test Notifications" button
3. **Create Tasks**: Add tasks with future due dates
4. **Verify Scheduling**: Check that notifications are scheduled

### 3. Production Testing
1. **TestFlight**: Upload to TestFlight for beta testing
2. **Real Device**: Test on actual iOS devices
3. **Background Testing**: Test notifications when app is backgrounded

## 📱 User Experience

### Notification Types
1. **Task Reminders**: "📋 Task Reminder - [Task Name] - [Goal Name]"
2. **Goal Reminders**: "🎯 Goal Reminder - Don't forget about your goal: [Goal Name]"
3. **Daily Motivation**: "🌟 Good morning! Ready to tackle your goals today?"
4. **Weekly Reports**: "📊 Weekly Report - Check out your progress this week!"

### User Controls
- **Enable/Disable**: Individual notification types can be toggled
- **Permission Management**: Clear permission request flow
- **Test Functionality**: Users can test notifications
- **Settings Integration**: All controls in one place

## 🚨 Important Notes

### 1. iOS Limitations
- **Background Processing**: Limited to 30 seconds
- **Notification Limits**: iOS may limit notifications if too many are sent
- **Battery Optimization**: iOS may delay notifications to save battery

### 2. Best Practices
- **Respect User Preferences**: Always check notification settings
- **Meaningful Content**: Make notifications valuable to users
- **Timing**: Don't send notifications too frequently
- **Testing**: Always test on real devices

### 3. App Store Review
- **Clear Purpose**: Explain why notifications are needed
- **User Benefit**: Show how notifications help users achieve goals
- **Privacy**: Ensure user data is handled securely
- **Compliance**: Follow Apple's notification guidelines

## 🔄 Next Steps

1. **Test on Device**: Run the app on a physical iOS device
2. **Verify Permissions**: Test the permission request flow
3. **Test Notifications**: Use the test notification feature
4. **Create Test Data**: Add goals and tasks to test scheduling
5. **Submit to App Store**: Follow Apple's submission process

## 📞 Support

If you encounter issues:
1. Check the console logs for notification errors
2. Verify device permissions in iOS Settings
3. Test on different devices and iOS versions
4. Check Expo documentation for notification troubleshooting

Your notification system is now fully configured and ready for iOS App Store submission! 🎉
