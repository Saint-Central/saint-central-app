# iOS Notifications for Saint Central

This document outlines the push notification system implemented in the Saint Central app.

## Overview

Saint Central now supports iOS push notifications for ministry messages and other app events, with user-configurable preferences.

## Implementation Details

### 1. Required Packages

The following packages have been installed:

- `expo-notifications`: Core notification functionality
- `expo-device`: For device-specific features and detection
- `expo-intent-launcher`: For opening system settings (Android)

### 2. Configuration

#### App.json Configuration

The app has been configured in `app.json` with:

- Added `UIBackgroundModes` with `remote-notification` in the iOS section
- Added the expo-notifications plugin with app icon configuration

#### Database Tables

Two new tables should be created in the Supabase database:

- `user_push_tokens`: Stores device tokens for sending notifications
- `ministry_notifications`: Stores notification history and status

Schema for `user_push_tokens`:

```sql
CREATE TABLE user_push_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

Schema for `ministry_notifications`:

```sql
CREATE TABLE ministry_notifications (
  id SERIAL PRIMARY KEY,
  ministry_id INTEGER REFERENCES ministries(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivered BOOLEAN DEFAULT false
);
```

### 3. Core Components

#### Notification Utilities (`utils/notifications.ts`)

- Token registration and storage
- Permission handling
- User preference management
- Real-time listeners for ministry messages
- Local notification scheduling

#### Notification Settings UI (`components/NotificationSettings.tsx`)

- Toggle permissions
- Configure notification preferences
- User-friendly settings interface

#### App Integration Points:

- Root layout: Registers for notifications on app start
- Ministry chat: Listens for new messages
- User profile: Access to notification settings

### 4. How Notifications Work

1. **Registration:**

   - On app start, the device requests notification permissions
   - Device token is saved to Supabase for server-side delivery

2. **Real-time Notifications:**

   - Supabase real-time listeners detect new ministry messages
   - Local notifications are triggered for new messages when the app is open

3. **Background Notifications:**
   - Server sends push notifications via Expo notification service
   - iOS displays notifications when app is in the background

### 5. User Preferences

Users can configure the following notification preferences:

- Ministry Messages
- Prayer Requests
- Announcements
- Event Reminders

## Sound Setup

To add notification sounds:

1. Place WAV sound files in `assets/sounds/` directory
2. Ensure the primary notification sound is named `notification.wav`
3. Configure additional sounds in the ExpoConfig in `app.json`

## Next Steps

To complete the implementation, you'll need to:

1. Set up an Expo Push Notification service on your server
2. Create the necessary Supabase database tables
3. Implement server-side code to send notifications to users' devices
4. Test thoroughly on real iOS devices (notifications don't work on simulators)

## Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [iOS Background Modes](https://developer.apple.com/documentation/uikit/app_and_environment/scenes/preparing_your_ui_to_run_in_the_background/about_the_background_execution_sequence)
- [Supabase Real-time Subscriptions](https://supabase.com/docs/reference/javascript/subscribe)
